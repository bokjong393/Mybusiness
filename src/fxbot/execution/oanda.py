"""OANDA broker adapter for practice and live accounts.

The same class serves both; the only difference is the host it points at and
the interlocks it had to pass to get there.  :meth:`OandaBroker.for_config`
is the only constructor that should be used from application code, because it
is the one that enforces :meth:`~fxbot.config.Config.check_live_permitted`.

A live instance prints a clear banner on construction.  If you ever see that
banner when you did not mean to, stop the process.
"""

from __future__ import annotations

from datetime import UTC, datetime

from ..config import Config
from ..core.instrument import Instrument
from ..core.types import Fill, Order, Position, Trade
from ..oanda_api import OandaClient, OandaError, parse_time
from .base import Account, Broker, BrokerError


class OandaBroker(Broker):
    """Places real orders against an OANDA account."""

    def __init__(
        self,
        client: OandaClient,
        instrument: Instrument,
        live: bool = False,
        account_currency: str = "USD",
    ) -> None:
        self.client = client
        self.instrument = instrument
        self._live = live
        self.account_currency = account_currency
        self._trade_ids: dict[str, str] = {}
        if live:
            print(
                "\n" + "!" * 62
                + f"\n!!  LIVE TRADING ENABLED -- account {client.account_id}"
                + "\n!!  Orders placed from here move real money."
                + "\n" + "!" * 62 + "\n"
            )

    @classmethod
    def for_config(cls, config: Config) -> OandaBroker:
        """Build a broker from config, refusing live unless every gate passes."""
        if config.environment == "backtest":
            raise BrokerError(
                "config environment is 'backtest'; use SimulatedBroker instead"
            )
        config.check_live_permitted()
        config.credentials.require(config.environment)
        client = OandaClient(
            api_token=config.credentials.api_token,
            account_id=config.credentials.account_id,
            host=config.api_host,
        )
        return cls(
            client=client,
            instrument=Instrument.parse(config.symbol),
            live=config.is_live,
            account_currency=config.account_currency,
        )

    @property
    def is_live(self) -> bool:
        return self._live

    # -- state ------------------------------------------------------------

    def account(self) -> Account:
        data = self.client.account_summary()
        return Account(
            currency=data.get("currency", self.account_currency),
            balance=float(data.get("balance", 0.0)),
            equity=float(data.get("NAV", data.get("balance", 0.0))),
            margin_used=float(data.get("marginUsed", 0.0)),
            unrealized=float(data.get("unrealizedPL", 0.0)),
        )

    def positions(self) -> dict[str, Position]:
        """Open trades, keyed by instrument.

        OANDA models each fill as a *trade*; this bot keeps one open trade per
        instrument, so the mapping is one-to-one. The trade id is cached
        because closing requires it.
        """
        out: dict[str, Position] = {}
        self._trade_ids.clear()
        for trade in self.client.open_trades():
            symbol = trade["instrument"]
            units = int(float(trade["currentUnits"]))
            if units == 0:
                continue
            self._trade_ids[symbol] = trade["id"]
            out[symbol] = Position(
                symbol=symbol,
                units=units,
                entry_price=float(trade["price"]),
                entry_time=parse_time(trade["openTime"]),
                stop_loss=_order_price(trade.get("stopLossOrder")),
                take_profit=_order_price(trade.get("takeProfitOrder")),
                financing=float(trade.get("financing", 0.0)),
            )
        return out

    def current_quote(self) -> tuple[float, float]:
        """Live (bid, ask) for this broker's instrument."""
        prices = self.client.pricing([self.instrument.symbol])
        if not prices:
            raise BrokerError(f"no pricing returned for {self.instrument.symbol}")
        price = prices[0]
        if price.get("tradeable") is False:
            raise BrokerError(f"{self.instrument.symbol} is not currently tradeable")
        return float(price["bids"][0]["price"]), float(price["asks"][0]["price"])

    # -- orders -----------------------------------------------------------

    def submit(self, order: Order) -> Fill:
        if order.units == 0:
            raise BrokerError("cannot submit a zero-unit order")
        units = abs(order.units) * order.side.sign
        try:
            txn = self.client.market_order(
                instrument=order.symbol,
                units=units,
                stop_loss=order.stop_loss,
                take_profit=order.take_profit,
                precision=self.instrument.display_precision,
                time_in_force=order.time_in_force.value,
                client_tag="fxbot",
            )
        except OandaError as exc:
            raise BrokerError(f"order rejected: {exc}") from exc

        return Fill(
            order_id=str(txn.get("id", order.client_id)),
            symbol=order.symbol,
            side=order.side,
            units=int(float(txn.get("units", units))),
            price=float(txn.get("price", 0.0)),
            time=parse_time(txn["time"]) if "time" in txn else datetime.now(UTC),
            spread_cost=abs(float(txn.get("halfSpreadCost", 0.0))),
            commission=abs(float(txn.get("commission", 0.0))),
        )

    def close(self, symbol: str, reason: str = "") -> Trade | None:
        positions = self.positions()
        position = positions.get(symbol)
        trade_id = self._trade_ids.get(symbol)
        if position is None or trade_id is None:
            return None

        try:
            txn = self.client.close_trade(trade_id)
        except OandaError as exc:
            raise BrokerError(f"failed to close {symbol}: {exc}") from exc

        exit_price = float(txn.get("price", 0.0))
        financing = float(txn.get("financing", 0.0))
        return Trade(
            symbol=symbol,
            side=position.side,
            units=abs(position.units),
            entry_time=position.entry_time,
            entry_price=position.entry_price,
            exit_time=parse_time(txn["time"]) if "time" in txn else datetime.now(UTC),
            exit_price=exit_price,
            pnl=float(txn.get("pl", 0.0)),
            pips=self.instrument.price_to_pips(
                (exit_price - position.entry_price) * (1 if position.is_long else -1)
            ),
            costs=abs(float(txn.get("halfSpreadCost", 0.0))),
            financing=financing,
            exit_reason=reason,
        )


def _order_price(order: dict | None) -> float | None:
    if not order or "price" not in order:
        return None
    return float(order["price"])
