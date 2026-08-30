"""Transaction cost and financing models.

Retail FX charges you in three places, and a backtest that ignores any of them
will look better than the account ever will:

* **Spread** -- you buy the ask and sell the bid, so every round trip starts
  underwater by the spread. It widens in thin hours and around news.
* **Slippage** -- market orders and stops fill away from the trigger price when
  the book is thin.
* **Financing (swap)** -- carry, charged or paid at each 17:00 NY rollover and
  tripled on Wednesdays.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..core.instrument import Instrument

#: Typical retail spreads in pips during liquid hours. Deliberately not
#: optimistic: institutional feeds are tighter, most retail accounts are not.
DEFAULT_SPREADS: dict[str, float] = {
    "EUR_USD": 0.8, "USD_JPY": 0.9, "GBP_USD": 1.2, "USD_CHF": 1.3,
    "AUD_USD": 1.0, "USD_CAD": 1.4, "NZD_USD": 1.6, "EUR_GBP": 1.2,
    "EUR_JPY": 1.4, "GBP_JPY": 2.2, "AUD_JPY": 1.6, "EUR_CHF": 1.5,
}
FALLBACK_SPREAD = 2.0


@dataclass(frozen=True)
class CostModel:
    """Spread, slippage and swap assumptions for a backtest.

    ``illiquid_multiplier`` widens the spread outside London and New York,
    which is where a naive backtest quietly books its best trades.
    """

    spread_pips: dict[str, float] = field(default_factory=lambda: dict(DEFAULT_SPREADS))
    fallback_spread_pips: float = FALLBACK_SPREAD
    slippage_pips: float = 0.2
    illiquid_multiplier: float = 2.0
    #: symbol -> (long_pips_per_day, short_pips_per_day). Negative = you pay.
    swap_pips: dict[str, tuple[float, float]] = field(default_factory=dict)
    commission_per_million: float = 0.0

    def spread_for(self, symbol: str, liquid: bool = True) -> float:
        base = self.spread_pips.get(symbol, self.fallback_spread_pips)
        return base if liquid else base * self.illiquid_multiplier

    def half_spread_price(
        self, instrument: Instrument, liquid: bool = True
    ) -> float:
        """Half the spread, in price units -- the distance from mid to touch."""
        return instrument.pips_to_price(self.spread_for(instrument.symbol, liquid)) / 2.0

    def slippage_price(self, instrument: Instrument) -> float:
        return instrument.pips_to_price(self.slippage_pips)

    def swap_for(self, symbol: str, is_long: bool) -> float:
        """Swap in pips per financing day; positive means you receive."""
        long_pips, short_pips = self.swap_pips.get(symbol, (0.0, 0.0))
        return long_pips if is_long else short_pips

    def commission(self, notional: float) -> float:
        return abs(notional) / 1_000_000.0 * self.commission_per_million


#: A frictionless model, for isolating strategy logic in tests. Never use it to
#: judge whether a strategy is profitable.
ZERO_COST = CostModel(
    spread_pips={}, fallback_spread_pips=0.0, slippage_pips=0.0,
    illiquid_multiplier=1.0,
)
