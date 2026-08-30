"""The FX trading calendar: market hours, sessions and rollover.

Spot FX trades continuously from Sunday 17:00 New York time to Friday 17:00
New York time.  Two consequences drive real money and are modelled here:

* **The weekend gap.**  Positions carried over Friday's close reopen on Sunday
  at whatever price the market feels like, straight through any stop.  A
  strategy that ignores this is not backtestable against reality.
* **Rollover and the Wednesday triple.**  Spot settles T+2.  At each 17:00 NY
  rollover an open position is financed for one day -- except the Wednesday
  rollover, which moves the value date from Friday to Monday and is therefore
  charged three days' financing.

Everything is computed from ``America/New_York`` local time so that US daylight
saving transitions are handled by the tz database rather than by a hardcoded
UTC offset.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

NY = ZoneInfo("America/New_York")
UTC = UTC

#: Local hour at which the FX day rolls over (and the week opens/closes).
ROLLOVER_HOUR = 17

MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY = range(7)


@dataclass(frozen=True)
class Session:
    """A financial centre's working hours, defined in its own timezone."""

    name: str
    tz: str
    open_hour: int
    close_hour: int

    def contains(self, moment: datetime) -> bool:
        local = moment.astimezone(ZoneInfo(self.tz))
        if local.weekday() in (SATURDAY, SUNDAY):
            return False
        return self.open_hour <= local.hour < self.close_hour


SESSIONS: tuple[Session, ...] = (
    Session("sydney", "Australia/Sydney", 8, 17),
    Session("tokyo", "Asia/Tokyo", 9, 18),
    Session("london", "Europe/London", 8, 17),
    Session("new_york", "America/New_York", 8, 17),
)


def _require_aware(moment: datetime, arg: str = "moment") -> datetime:
    if moment.tzinfo is None:
        raise ValueError(
            f"{arg} must be timezone-aware; naive datetimes silently break "
            "every DST and rollover calculation in this module"
        )
    return moment


def is_market_open(moment: datetime) -> bool:
    """True if spot FX is trading at ``moment``."""
    local = _require_aware(moment).astimezone(NY)
    day = local.weekday()
    if day == SATURDAY:
        return False
    if day == SUNDAY:
        return local.hour >= ROLLOVER_HOUR
    if day == FRIDAY:
        return local.hour < ROLLOVER_HOUR
    return True


def active_sessions(moment: datetime) -> tuple[str, ...]:
    """Names of the financial centres open at ``moment``."""
    _require_aware(moment)
    if not is_market_open(moment):
        return ()
    return tuple(s.name for s in SESSIONS if s.contains(moment))


def in_session(moment: datetime, *names: str) -> bool:
    """True if any of the named sessions is currently open.

    Used by strategies that only want to trade liquid hours -- the
    London/New York overlap carries most of the day's volume and the tightest
    spreads, while the late-NY-to-Tokyo lull is where spreads blow out.
    """
    if not names:
        return is_market_open(moment)
    wanted = {n.lower() for n in names}
    known = {s.name for s in SESSIONS}
    unknown = wanted - known
    if unknown:
        raise ValueError(f"unknown session(s) {sorted(unknown)}; known: {sorted(known)}")
    return bool(wanted & set(active_sessions(moment)))


def next_market_open(moment: datetime) -> datetime:
    """The next instant the market is open at or after ``moment``."""
    _require_aware(moment)
    if is_market_open(moment):
        return moment
    local = moment.astimezone(NY)
    # Walk forward to the coming Sunday 17:00 NY.
    candidate = local.replace(hour=ROLLOVER_HOUR, minute=0, second=0, microsecond=0)
    while candidate <= local or candidate.weekday() != SUNDAY:
        candidate += timedelta(days=1)
        candidate = candidate.replace(hour=ROLLOVER_HOUR, minute=0, second=0, microsecond=0)
    return candidate.astimezone(moment.tzinfo)


def rollover_instants(start: datetime, end: datetime) -> list[datetime]:
    """Every 17:00 NY rollover strictly after ``start`` and at or before ``end``."""
    _require_aware(start, "start")
    _require_aware(end, "end")
    if end <= start:
        return []

    local = start.astimezone(NY)
    cursor = local.replace(hour=ROLLOVER_HOUR, minute=0, second=0, microsecond=0)
    if cursor <= local:
        cursor += timedelta(days=1)
        # Re-normalise: adding a day across a DST boundary shifts wall-clock time.
        cursor = cursor.replace(hour=ROLLOVER_HOUR, minute=0, second=0, microsecond=0)

    out: list[datetime] = []
    end_ny = end.astimezone(NY)
    while cursor <= end_ny:
        # No rollover on Saturday: the market is shut.
        if cursor.weekday() != SATURDAY:
            out.append(cursor.astimezone(UTC))
        cursor += timedelta(days=1)
        cursor = cursor.replace(hour=ROLLOVER_HOUR, minute=0, second=0, microsecond=0)
    return out


def financing_days(start: datetime, end: datetime) -> int:
    """Swap-days accrued by a position held from ``start`` to ``end``.

    Each rollover crossed counts as one day, except Wednesday's, which counts
    as three (T+2 settlement skipping the weekend).
    """
    total = 0
    for moment in rollover_instants(start, end):
        total += 3 if moment.astimezone(NY).weekday() == WEDNESDAY else 1
    return total


def is_triple_swap(moment: datetime) -> bool:
    """True if the rollover at ``moment`` is the Wednesday triple-swap one."""
    local = _require_aware(moment).astimezone(NY)
    return local.weekday() == WEDNESDAY and local.hour == ROLLOVER_HOUR
