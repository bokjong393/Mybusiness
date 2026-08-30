"""Command line interface.

    fxbot demo                      # synthetic backtest, no credentials needed
    fxbot fetch  --symbol EUR_USD --granularity H1 --years 2
    fxbot backtest --csv data/EUR_USD_H1.csv --strategy ema_crossover
    fxbot paper  --config config/default.yaml
    fxbot live   --config config/live.yaml     # refuses without the interlocks
"""

from __future__ import annotations

import argparse
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

from .backtest import run as run_backtest
from .config import Config, ConfigError
from .core.instrument import Instrument
from .data import csv_source
from .data.base import validate
from .risk.sizing import ConversionRates
from .strategy import REGISTRY
from .strategy import build as build_strategy


def _parse_params(pairs: list[str] | None) -> dict:
    """Turn ``fast=12 slow=26`` into ``{"fast": 12, "slow": 26}``."""
    out: dict = {}
    for pair in pairs or []:
        if "=" not in pair:
            raise SystemExit(f"bad --param {pair!r}; expected name=value")
        key, _, raw = pair.partition("=")
        for cast in (int, float):
            try:
                out[key] = cast(raw)
                break
            except ValueError:
                continue
        else:
            out[key] = {"true": True, "false": False}.get(raw.lower(), raw)
    return out


def _rates_for(extra: list[str] | None) -> ConversionRates:
    """Seed conversion rates from repeated --rate USD_JPY=150.0 flags."""
    rates = ConversionRates()
    for symbol, value in _parse_params(extra).items():
        rates.update(symbol, float(value))
    return rates


# -- commands -------------------------------------------------------------

def cmd_demo(args) -> int:
    from .data.synthetic import generate

    print("Synthetic data -- exercises the machinery, proves nothing about edge.\n")
    instrument = Instrument.parse(args.symbol)
    candles = generate(
        symbol=args.symbol, granularity=args.granularity, bars=args.bars,
        trend_strength=args.trend, seed=args.seed,
    )
    result = run_backtest(
        candles, build_strategy(args.strategy, **_parse_params(args.param)),
        instrument, starting_balance=args.balance,
    )
    print(result.report())
    return 0


def cmd_fetch(args) -> int:
    from .data.oanda import OandaSource
    from .oanda_api import OandaClient

    config = Config.load(args.config, symbol=args.symbol, granularity=args.granularity)
    config.credentials.require(config.environment)
    client = OandaClient(
        config.credentials.api_token, config.credentials.account_id, config.api_host
    )
    end = datetime.now(UTC)
    start = end - timedelta(days=int(args.years * 365.25))

    print(f"Fetching {config.symbol} {config.granularity} "
          f"{start:%Y-%m-%d} -> {end:%Y-%m-%d} from {config.api_host}")
    candles = OandaSource(client).fetch(config.symbol, config.granularity, start=start, end=end)
    if not candles:
        print("No candles returned.")
        return 1

    problems = validate(candles, config.symbol)
    if problems:
        print(f"[warn] {len(problems)} data problem(s); first: {problems[0]}")

    out = Path(args.out or f"data/{config.symbol}_{config.granularity}.csv")
    csv_source.write(candles, out)
    print(f"Wrote {len(candles):,} candles to {out} "
          f"({candles[0].time:%Y-%m-%d} -> {candles[-1].time:%Y-%m-%d})")
    return 0


def cmd_backtest(args) -> int:
    config = Config.load(args.config, symbol=args.symbol, granularity=args.granularity)
    instrument = Instrument.parse(config.symbol)

    candles = csv_source.CsvSource(args.csv, assume_utc=args.assume_utc).fetch(
        count=args.bars or None
    )
    problems = validate(candles, config.symbol)
    if problems:
        print(f"[warn] {len(problems)} data problem(s); first: {problems[0]}")
    if not candles:
        print("No candles loaded.")
        return 1

    strategy_name = args.strategy or config.strategy
    params = {**config.strategy_params, **_parse_params(args.param)}
    result = run_backtest(
        candles, build_strategy(strategy_name, **params), instrument,
        starting_balance=args.balance or config.starting_balance,
        account_currency=config.account_currency,
        costs=config.to_costs(), limits=config.to_limits(),
        rates=_rates_for(args.rate),
    )
    print(result.report())

    if args.trades:
        print(f"\n{'entry':<17}{'exit':<17}{'side':<6}{'units':>9}"
              f"{'pips':>8}{'P&L':>10}  reason")
        for t in result.trades:
            print(f"{t.entry_time:%Y-%m-%d %H:%M} {t.exit_time:%Y-%m-%d %H:%M} "
                  f"{t.side.value:<6}{t.units:>9,}{t.pips:>8.1f}{t.pnl:>10,.2f}  {t.exit_reason}")

    if args.equity_csv:
        out = Path(args.equity_csv)
        out.parent.mkdir(parents=True, exist_ok=True)
        with out.open("w", encoding="utf-8") as handle:
            handle.write("time,equity\n")
            for when, equity in result.equity_curve:
                handle.write(f"{when.isoformat()},{equity:.2f}\n")
        print(f"\nEquity curve -> {out}")
    return 0


def cmd_trade(args, environment: str) -> int:
    from .engine.live import LiveTrader

    config = Config.load(args.config, symbol=args.symbol, granularity=args.granularity)
    config.environment = environment
    if environment == "live":
        config.check_live_permitted()
        if not args.yes:
            print("About to trade REAL MONEY on account "
                  f"{config.credentials.account_id} ({config.symbol}).")
            if input("Type 'trade live' to continue: ").strip() != "trade live":
                print("Aborted.")
                return 1

    trader = LiveTrader.for_config(config, dry_run=args.dry_run)
    trader.install_signal_handlers()
    trader.run(max_cycles=args.cycles)
    return 0


def cmd_strategies(_args) -> int:
    print("Available strategies:\n")
    for name, cls in sorted(REGISTRY.items()):
        doc = (cls.__doc__ or "").strip().splitlines()[0] if cls.__doc__ else ""
        print(f"  {name:<20} {doc}")
        print(f"  {'':<20} defaults: {cls().describe()}\n")
    return 0


# -- wiring ---------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="fxbot",
        description="A spot FX trading bot: backtest, paper trade, and (gated) live.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    def common(p, with_strategy=True):
        p.add_argument("--config", help="path to a YAML config file")
        p.add_argument("--symbol", default=None, help="pair, e.g. EUR_USD")
        p.add_argument("--granularity", default=None, help="M5, M15, H1, H4, D ...")
        if with_strategy:
            p.add_argument("--strategy", default=None, choices=sorted(REGISTRY))
            p.add_argument("--param", action="append",
                           help="strategy parameter, e.g. --param fast=12")
        return p

    demo = common(sub.add_parser("demo", help="backtest on synthetic data, no keys needed"))
    demo.set_defaults(func=cmd_demo, symbol="EUR_USD", granularity="H1", strategy="ema_crossover")
    demo.add_argument("--bars", type=int, default=8000)
    demo.add_argument("--balance", type=float, default=10_000.0)
    demo.add_argument("--trend", type=float, default=0.06, help="0 = pure random walk")
    demo.add_argument("--seed", type=int, default=42)

    fetch = common(sub.add_parser("fetch", help="download candles to CSV"), with_strategy=False)
    fetch.set_defaults(func=cmd_fetch)
    fetch.add_argument("--years", type=float, default=2.0)
    fetch.add_argument("--out", default=None)

    back = common(sub.add_parser("backtest", help="backtest against a CSV"))
    back.set_defaults(func=cmd_backtest)
    back.add_argument("--csv", required=True)
    back.add_argument("--bars", type=int, default=0, help="use only the last N bars")
    back.add_argument("--balance", type=float, default=0.0)
    back.add_argument(
        "--assume-utc", action="store_true",
        help="treat naive CSV timestamps as UTC",
    )
    back.add_argument("--rate", action="append",
                      help="seed a conversion rate, e.g. --rate USD_JPY=150.0")
    back.add_argument("--trades", action="store_true", help="print every trade")
    back.add_argument("--equity-csv", default=None)

    for name, help_text in (("paper", "trade the OANDA practice account"),
                            ("live", "trade real money (requires the interlocks)")):
        p = common(sub.add_parser(name, help=help_text))
        p.add_argument("--dry-run", action="store_true",
                       help="log intended orders without sending them")
        p.add_argument("--cycles", type=int, default=None, help="stop after N polls")
        p.add_argument("--yes", action="store_true", help="skip the live confirmation prompt")
        p.set_defaults(func=lambda a, env=name: cmd_trade(a, env))

    sub.add_parser("strategies", help="list available strategies").set_defaults(
        func=cmd_strategies
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.func(args)
    except ConfigError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        return 130
    except (ValueError, FileNotFoundError, KeyError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
