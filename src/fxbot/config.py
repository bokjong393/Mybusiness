"""Configuration loading, and the gate that stands in front of real money.

Live trading requires three independent things to line up:

1. ``environment: live`` in the config file,
2. ``allow_live: true`` in the same file,
3. the environment variable ``FXBOT_ALLOW_LIVE=I_UNDERSTAND_THE_RISK``.

Any one of them alone does nothing.  This is deliberate friction: a stray edit,
a copied config, or a wrong ``--env`` flag cannot on its own move real money.
Credentials are read only from the environment, never from the config file, so
that configs stay safe to commit.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field, fields
from pathlib import Path
from typing import Any

#: The exact value ``FXBOT_ALLOW_LIVE`` must hold to permit live trading.
LIVE_CONFIRMATION = "I_UNDERSTAND_THE_RISK"

PRACTICE_HOST = "https://api-fxpractice.oanda.com"
LIVE_HOST = "https://api-fxtrade.oanda.com"
PRACTICE_STREAM = "https://stream-fxpractice.oanda.com"
LIVE_STREAM = "https://stream-fxtrade.oanda.com"


class ConfigError(ValueError):
    """Raised for malformed configuration or a refused live-trading request."""


@dataclass
class Credentials:
    api_token: str = ""
    account_id: str = ""

    @classmethod
    def from_env(cls, prefix: str = "OANDA") -> Credentials:
        return cls(
            api_token=os.environ.get(f"{prefix}_API_TOKEN", "").strip(),
            account_id=os.environ.get(f"{prefix}_ACCOUNT_ID", "").strip(),
        )

    @property
    def complete(self) -> bool:
        return bool(self.api_token and self.account_id)

    def require(self, environment: str) -> None:
        if not self.complete:
            raise ConfigError(
                f"missing OANDA credentials for the {environment} environment. "
                "Set OANDA_API_TOKEN and OANDA_ACCOUNT_ID (see .env.example)."
            )

    def __repr__(self) -> str:  # never leak a token into a log or traceback
        shown = f"...{self.api_token[-4:]}" if self.api_token else "unset"
        return f"Credentials(api_token={shown}, account_id={self.account_id or 'unset'})"


@dataclass
class Config:
    symbol: str = "EUR_USD"
    granularity: str = "H1"
    account_currency: str = "USD"
    environment: str = "practice"      # practice | live | backtest
    allow_live: bool = False
    starting_balance: float = 10_000.0

    strategy: str = "ema_crossover"
    strategy_params: dict[str, Any] = field(default_factory=dict)

    risk_per_trade: float = 0.01
    max_daily_loss: float = 0.03
    max_open_positions: int = 3
    max_margin_utilisation: float = 0.20
    max_units_per_trade: int = 500_000

    slippage_pips: float = 0.2
    spread_pips: dict[str, float] = field(default_factory=dict)
    swap_pips: dict[str, list[float]] = field(default_factory=dict)

    poll_seconds: int = 30
    state_file: str = "state/fxbot_state.json"
    log_file: str = "logs/fxbot.log"

    credentials: Credentials = field(default_factory=Credentials.from_env)

    def __post_init__(self) -> None:
        self.symbol = self.symbol.replace("/", "_").upper()
        if self.environment not in ("practice", "live", "backtest"):
            raise ConfigError(
                f"environment must be practice, live or backtest; got {self.environment!r}"
            )

    # -- the gate ---------------------------------------------------------

    @property
    def is_live(self) -> bool:
        return self.environment == "live"

    @staticmethod
    def live_env_confirmed() -> bool:
        return os.environ.get("FXBOT_ALLOW_LIVE", "").strip() == LIVE_CONFIRMATION

    def check_live_permitted(self) -> None:
        """Raise unless every live-trading interlock is satisfied."""
        if not self.is_live:
            return
        if not self.allow_live:
            raise ConfigError(
                "environment is 'live' but allow_live is false in the config. "
                "Refusing to trade real money."
            )
        if not self.live_env_confirmed():
            raise ConfigError(
                "live trading requires the environment variable "
                f"FXBOT_ALLOW_LIVE={LIVE_CONFIRMATION}. "
                "Refusing to trade real money without it."
            )
        self.credentials.require("live")

    @property
    def api_host(self) -> str:
        return LIVE_HOST if self.is_live else PRACTICE_HOST

    @property
    def stream_host(self) -> str:
        return LIVE_STREAM if self.is_live else PRACTICE_STREAM

    # -- loading ----------------------------------------------------------

    @classmethod
    def load(cls, path: str | Path | None = None, **overrides) -> Config:
        """Load from YAML, apply overrides, and read credentials from the env."""
        data: dict[str, Any] = {}
        if path is not None:
            target = Path(path)
            if not target.exists():
                raise ConfigError(f"no such config file: {target}")
            try:
                import yaml
            except ImportError as exc:  # pragma: no cover
                raise ConfigError(
                    "PyYAML is required to read config files: pip install pyyaml"
                ) from exc
            data = yaml.safe_load(target.read_text()) or {}
            if not isinstance(data, dict):
                raise ConfigError(f"{target} must contain a YAML mapping")

        data.update({k: v for k, v in overrides.items() if v is not None})
        data.pop("credentials", None)  # never from file

        known = {f.name for f in fields(cls)}
        unknown = set(data) - known
        if unknown:
            raise ConfigError(
                f"unknown config key(s) {sorted(unknown)}; valid keys: {sorted(known)}"
            )
        return cls(**data)

    def to_limits(self):
        from .risk.manager import RiskLimits

        return RiskLimits(
            risk_per_trade=self.risk_per_trade,
            max_daily_loss=self.max_daily_loss,
            max_open_positions=self.max_open_positions,
            max_margin_utilisation=self.max_margin_utilisation,
            max_units_per_trade=self.max_units_per_trade,
        )

    def to_costs(self):
        from .execution.costs import DEFAULT_SPREADS, CostModel

        spreads = dict(DEFAULT_SPREADS)
        spreads.update(self.spread_pips)
        return CostModel(
            spread_pips=spreads,
            slippage_pips=self.slippage_pips,
            swap_pips={k: (v[0], v[1]) for k, v in self.swap_pips.items()},
        )
