from .base import Strategy, StrategyContext
from .donchian_breakout import DonchianBreakout
from .ema_crossover import EmaCrossover

#: Name -> class, for config files and the CLI.
REGISTRY: dict[str, type[Strategy]] = {
    "ema_crossover": EmaCrossover,
    "donchian_breakout": DonchianBreakout,
}


def build(name: str, **params) -> Strategy:
    """Instantiate a registered strategy by name."""
    try:
        cls = REGISTRY[name]
    except KeyError:
        raise KeyError(
            f"unknown strategy {name!r}; available: {sorted(REGISTRY)}"
        ) from None
    return cls(**params)


__all__ = [
    "Strategy", "StrategyContext", "EmaCrossover", "DonchianBreakout",
    "REGISTRY", "build",
]
