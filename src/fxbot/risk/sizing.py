"""Pip valuation and risk-based position sizing.

The chain of reasoning, which is the whole point of this module:

1. A pip of movement is worth ``units * pip_size`` **in the quote currency**.
2. Your account is not necessarily denominated in the quote currency, so that
   figure has to be converted at the live quote/account rate.
3. Given a per-trade risk budget and a stop distance in pips, the position size
   is whatever makes ``stop_pips * pip_value == risk_budget``.

Step 2 is the one that gets skipped.  Sizing a USD/JPY trade as though a pip
were worth $10 per lot -- it is worth about $6.70 at 150.00 -- overstates
position size by half.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..core.instrument import Instrument

#: Currencies that act as the hub when a direct pair is unavailable.
VEHICLE_CURRENCIES = ("USD", "EUR", "GBP")


class ConversionError(LookupError):
    """Raised when no path exists to convert one currency into another."""


@dataclass
class ConversionRates:
    """A snapshot of FX rates used to value pips in the account currency.

    Rates are stored by ``BASE_QUOTE`` symbol and read as "units of QUOTE per
    one unit of BASE", the same orientation as a price.  Inverses and one hop
    of triangulation are derived on demand, so a USD account only needs the
    USD majors to value almost anything.
    """

    rates: dict[str, float] = field(default_factory=dict)

    def update(self, symbol: str, rate: float) -> None:
        if rate <= 0:
            raise ValueError(f"rate for {symbol} must be positive, got {rate}")
        self.rates[symbol.replace("/", "_").upper()] = rate

    def update_many(self, mapping: dict[str, float]) -> None:
        for symbol, rate in mapping.items():
            self.update(symbol, rate)

    def _direct(self, base: str, quote: str) -> float | None:
        """Units of ``quote`` per one ``base``, from a stored pair or its inverse."""
        if (rate := self.rates.get(f"{base}_{quote}")) is not None:
            return rate
        if (rate := self.rates.get(f"{quote}_{base}")) is not None:
            return 1.0 / rate
        return None

    def rate(self, from_ccy: str, to_ccy: str) -> float:
        """The multiplier that turns an amount in ``from_ccy`` into ``to_ccy``."""
        from_ccy, to_ccy = from_ccy.upper(), to_ccy.upper()
        if from_ccy == to_ccy:
            return 1.0

        if (direct := self._direct(from_ccy, to_ccy)) is not None:
            return direct

        for hub in VEHICLE_CURRENCIES:
            if hub in (from_ccy, to_ccy):
                continue
            leg_in = self._direct(from_ccy, hub)
            leg_out = self._direct(hub, to_ccy)
            if leg_in is not None and leg_out is not None:
                return leg_in * leg_out

        raise ConversionError(
            f"no rate path from {from_ccy} to {to_ccy}; "
            f"have {sorted(self.rates)} and hubs {list(VEHICLE_CURRENCIES)}"
        )

    def convert(self, amount: float, from_ccy: str, to_ccy: str) -> float:
        return amount * self.rate(from_ccy, to_ccy)


def pip_value_per_unit(
    instrument: Instrument, rates: ConversionRates, account_ccy: str = "USD"
) -> float:
    """Account-currency value of a one-pip move on a single unit."""
    return instrument.pip_size * rates.rate(instrument.quote, account_ccy)


def pip_value(
    instrument: Instrument,
    units: float,
    rates: ConversionRates,
    account_ccy: str = "USD",
) -> float:
    """Account-currency value of a one-pip move on ``units``."""
    return abs(units) * pip_value_per_unit(instrument, rates, account_ccy)


def notional_value(
    instrument: Instrument,
    units: float,
    price: float,
    rates: ConversionRates,
    account_ccy: str = "USD",
) -> float:
    """Position notional in the account currency.

    ``units`` are base currency, so the notional is converted from the *base*,
    not the quote -- the price only enters when the base has to reach the
    account currency through the quote.
    """
    try:
        base_rate = rates.rate(instrument.base, account_ccy)
    except ConversionError:
        # Fall back through the quote currency using the traded price itself.
        base_rate = price * rates.rate(instrument.quote, account_ccy)
    return abs(units) * base_rate


def margin_required(
    instrument: Instrument,
    units: float,
    price: float,
    rates: ConversionRates,
    account_ccy: str = "USD",
) -> float:
    """Margin the venue will reserve for this position, in account currency."""
    return notional_value(instrument, units, price, rates, account_ccy) * instrument.margin_rate


def position_size(
    instrument: Instrument,
    equity: float,
    risk_fraction: float,
    stop_pips: float,
    rates: ConversionRates,
    account_ccy: str = "USD",
    max_units: int | None = None,
) -> int:
    """Units to trade so that being stopped out costs ``risk_fraction`` of equity.

    Returns a positive magnitude; the caller applies direction.  Rounds down to
    a whole tradeable size, so realised risk is never above the budget.
    """
    if equity <= 0:
        return 0
    if not 0 < risk_fraction < 1:
        raise ValueError(f"risk_fraction must be in (0, 1), got {risk_fraction}")
    if stop_pips <= 0:
        raise ValueError(
            f"stop_pips must be positive, got {stop_pips}; "
            "sizing without a stop has no risk denominator"
        )

    risk_budget = equity * risk_fraction
    value_per_unit = pip_value_per_unit(instrument, rates, account_ccy)
    if value_per_unit <= 0:
        return 0

    raw_units = risk_budget / (stop_pips * value_per_unit)
    if max_units is not None:
        raw_units = min(raw_units, max_units)
    return instrument.round_units(raw_units)


def risk_of(
    instrument: Instrument,
    units: float,
    stop_pips: float,
    rates: ConversionRates,
    account_ccy: str = "USD",
) -> float:
    """Account-currency loss if this position is stopped out. Inverse of sizing."""
    return abs(stop_pips) * pip_value(instrument, units, rates, account_ccy)
