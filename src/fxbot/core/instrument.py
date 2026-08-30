"""FX instrument definitions and pip arithmetic.

The pip is the unit that every other calculation in this package is expressed
in, so it is defined once, here, and never re-derived inline elsewhere.

Convention used throughout: symbols are ``BASE_QUOTE`` (OANDA style, e.g.
``EUR_USD``).  A price is always "units of QUOTE per 1 unit of BASE".  A
position size is always expressed in *units of the base currency* (so 10_000
units of EUR_USD is a 10k EUR position), never in lots -- lots are a
presentation detail handled by :func:`units_to_lots`.
"""

from __future__ import annotations

from dataclasses import dataclass

# Quote currencies that are conventionally quoted to 2 decimal places, making
# one pip 0.01 rather than the usual 0.0001.  JPY is the one every retail
# trader meets; the others show up in EM crosses and break naive `is JPY`
# checks, which is exactly the bug this table exists to prevent.
BIG_PIP_QUOTES = frozenset({"JPY", "HUF", "KRW", "IDR", "CLP", "ISK"})

STANDARD_LOT = 100_000
MINI_LOT = 10_000
MICRO_LOT = 1_000


def pip_size_for(quote: str) -> float:
    """Return the price increment of one pip for a given quote currency."""
    return 0.01 if quote.upper() in BIG_PIP_QUOTES else 0.0001


@dataclass(frozen=True)
class Instrument:
    """A tradeable currency pair and the venue conventions that go with it."""

    symbol: str
    base: str
    quote: str
    pip_size: float
    display_precision: int
    min_units: int = 1
    margin_rate: float = 0.02  # 0.02 == 50:1 leverage, typical US major

    @classmethod
    def parse(cls, symbol: str, **overrides) -> Instrument:
        """Build an instrument from a ``EUR_USD`` / ``EUR/USD`` style symbol."""
        normalized = symbol.replace("/", "_").replace("-", "_").upper()
        try:
            base, quote = normalized.split("_")
        except ValueError as exc:
            raise ValueError(
                f"cannot parse currency pair from {symbol!r}; "
                "expected BASE_QUOTE such as 'EUR_USD'"
            ) from exc
        if len(base) != 3 or len(quote) != 3:
            raise ValueError(f"invalid ISO currency codes in {symbol!r}")

        pip = pip_size_for(quote)
        # Retail venues quote one decimal beyond the pip (the "pipette").
        precision = 3 if pip == 0.01 else 5
        params = {
            "symbol": normalized,
            "base": base,
            "quote": quote,
            "pip_size": pip,
            "display_precision": precision,
        }
        params.update(overrides)
        return cls(**params)

    # -- conversions ------------------------------------------------------

    def price_to_pips(self, price_delta: float) -> float:
        """Convert a price difference into pips."""
        return price_delta / self.pip_size

    def pips_to_price(self, pips: float) -> float:
        """Convert a pip count into a price difference."""
        return pips * self.pip_size

    def round_price(self, price: float) -> float:
        return round(price, self.display_precision)

    def round_units(self, units: float) -> int:
        """Round a desired size down to a whole tradeable number of units.

        Rounds *toward zero* so that risk-based sizing never overshoots the
        requested risk budget, and returns 0 when the result would be below
        the venue minimum.
        """
        magnitude = int(abs(units))
        if magnitude < self.min_units:
            return 0
        magnitude -= magnitude % self.min_units
        return magnitude if units >= 0 else -magnitude

    def __str__(self) -> str:  # pragma: no cover - display only
        return self.symbol


def units_to_lots(units: float) -> float:
    """Express a unit size in standard lots (100k units)."""
    return units / STANDARD_LOT


def lots_to_units(lots: float) -> int:
    """Express a standard-lot size in units."""
    return int(round(lots * STANDARD_LOT))
