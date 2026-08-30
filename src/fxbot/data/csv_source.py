"""Read and write candle CSVs.

Column names are matched case-insensitively and several common spellings are
accepted, because every FX history vendor picks a different one.  Timestamps
without a zone are *rejected* rather than assumed to be UTC: a silent
eight-hour shift turns a London-session strategy into a Tokyo-session one.
"""

from __future__ import annotations

import csv
from datetime import UTC, datetime
from pathlib import Path

from ..core.types import Candle
from .base import CandleSource

_ALIASES: dict[str, tuple[str, ...]] = {
    "time": ("time", "timestamp", "date", "datetime", "gmt time", "local time"),
    "open": ("open", "o", "bidopen", "open_bid"),
    "high": ("high", "h", "bidhigh", "high_bid"),
    "low": ("low", "l", "bidlow", "low_bid"),
    "close": ("close", "c", "bidclose", "close_bid", "price"),
    "volume": ("volume", "v", "vol", "tickvolume", "tick_volume"),
}


def _column_map(header: list[str]) -> dict[str, str]:
    lowered = {h.strip().lower(): h for h in header}
    mapping: dict[str, str] = {}
    for canonical, options in _ALIASES.items():
        for option in options:
            if option in lowered:
                mapping[canonical] = lowered[option]
                break
    missing = {"time", "open", "high", "low", "close"} - mapping.keys()
    if missing:
        raise ValueError(
            f"CSV is missing required column(s) {sorted(missing)}; header was {header}"
        )
    return mapping


def parse_time(raw: str, assume_utc: bool = False) -> datetime:
    """Parse a timestamp, requiring a timezone unless ``assume_utc`` is set."""
    text = raw.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%d.%m.%Y %H:%M:%S.%f",
                    "%m/%d/%Y %H:%M:%S", "%Y%m%d %H%M%S"):
            try:
                parsed = datetime.strptime(text, fmt)
                break
            except ValueError:
                continue
        else:
            raise ValueError(f"unrecognised timestamp format: {raw!r}") from None

    if parsed.tzinfo is None:
        if not assume_utc:
            raise ValueError(
                f"timestamp {raw!r} has no timezone. Pass assume_utc=True only if "
                "you are certain the file is UTC -- guessing wrong shifts every "
                "session filter in the backtest."
            )
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


class CsvSource(CandleSource):
    """Load candles from a CSV file on disk."""

    def __init__(self, path: str | Path, assume_utc: bool = False) -> None:
        self.path = Path(path)
        self.assume_utc = assume_utc

    def fetch(
        self,
        symbol: str = "",
        granularity: str = "",
        start: datetime | None = None,
        end: datetime | None = None,
        count: int | None = None,
    ) -> list[Candle]:
        if not self.path.exists():
            raise FileNotFoundError(f"no such candle file: {self.path}")

        with self.path.open(newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            if reader.fieldnames is None:
                raise ValueError(f"{self.path} has no header row")
            cols = _column_map(list(reader.fieldnames))

            candles: list[Candle] = []
            for lineno, row in enumerate(reader, start=2):
                try:
                    when = parse_time(row[cols["time"]], self.assume_utc)
                    candle = Candle(
                        time=when,
                        open=float(row[cols["open"]]),
                        high=float(row[cols["high"]]),
                        low=float(row[cols["low"]]),
                        close=float(row[cols["close"]]),
                        volume=float(row[cols["volume"]]) if "volume" in cols
                        and row.get(cols["volume"]) else 0.0,
                    )
                except (ValueError, KeyError, TypeError) as exc:
                    raise ValueError(f"{self.path}:{lineno}: {exc}") from exc
                if start and when < start:
                    continue
                if end and when > end:
                    continue
                candles.append(candle)

        candles.sort(key=lambda c: c.time)
        return candles[-count:] if count else candles


def write(candles: list[Candle], path: str | Path) -> Path:
    """Write candles to CSV in the format :class:`CsvSource` reads back."""
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["time", "open", "high", "low", "close", "volume"])
        for c in candles:
            writer.writerow([
                c.time.isoformat(), c.open, c.high, c.low, c.close, c.volume
            ])
    return target
