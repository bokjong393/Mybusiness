"""Broker interface shared by the simulator, the practice account and live.

The backtest and the live loop drive the *same* interface, so a strategy that
works against :class:`~fxbot.execution.simulated.SimulatedBroker` needs no
changes to run against OANDA.  That is the point: the difference between paper
and live should be one line of configuration, not a different code path.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from ..core.types import Fill, Order, Position, Trade


@dataclass
class Account:
    """Account state in the account currency."""

    currency: str = "USD"
    balance: float = 0.0
    equity: float = 0.0
    margin_used: float = 0.0
    unrealized: float = 0.0

    @property
    def free_margin(self) -> float:
        return self.equity - self.margin_used

    @property
    def margin_level(self) -> float | None:
        """Equity as a multiple of margin used. Brokers liquidate near 1.0."""
        if self.margin_used <= 0:
            return None
        return self.equity / self.margin_used


class BrokerError(RuntimeError):
    """Raised when an order is rejected or the venue misbehaves."""


class Broker(ABC):
    """Minimal order and position interface."""

    @abstractmethod
    def account(self) -> Account:
        """Current account snapshot."""

    @abstractmethod
    def positions(self) -> dict[str, Position]:
        """Open positions keyed by symbol."""

    @abstractmethod
    def submit(self, order: Order) -> Fill:
        """Place an order, returning the resulting fill."""

    @abstractmethod
    def close(self, symbol: str, reason: str = "") -> Trade | None:
        """Flatten a position, returning the completed round trip."""

    def close_all(self, reason: str = "close all") -> list[Trade]:
        return [
            trade
            for symbol in list(self.positions())
            if (trade := self.close(symbol, reason)) is not None
        ]

    @property
    def is_live(self) -> bool:
        """True only for brokers that transact real money."""
        return False
