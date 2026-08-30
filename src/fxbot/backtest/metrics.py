"""Performance statistics for a backtest run.

Annualisation uses the FX week -- 24 hours a day, five days a week, about
6,240 trading hours a year -- rather than the 252 equity trading days, so an
hourly FX Sharpe is not silently inflated by using the wrong scaling constant.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime
from statistics import fmean, pstdev

from ..core.types import Trade

#: 24h x 5 days x 52 weeks.
FX_HOURS_PER_YEAR = 6240.0


def _periods_per_year(times: list[datetime]) -> float:
    """Infer how many bars make up a year, from the observed bar spacing."""
    if len(times) < 3:
        return FX_HOURS_PER_YEAR
    gaps = sorted(
        (b - a).total_seconds() for a, b in zip(times, times[1:], strict=False) if b > a
    )
    if not gaps:
        return FX_HOURS_PER_YEAR
    median_gap = gaps[len(gaps) // 2]  # median ignores weekend gaps
    bar_hours = max(median_gap / 3600.0, 1e-9)
    return FX_HOURS_PER_YEAR / bar_hours


@dataclass
class Metrics:
    starting_equity: float = 0.0
    ending_equity: float = 0.0
    total_return: float = 0.0
    cagr: float = 0.0
    max_drawdown: float = 0.0
    max_drawdown_duration_days: float = 0.0
    sharpe: float = 0.0
    sortino: float = 0.0
    calmar: float = 0.0
    trades: int = 0
    wins: int = 0
    losses: int = 0
    win_rate: float = 0.0
    profit_factor: float = 0.0
    expectancy: float = 0.0
    expectancy_pips: float = 0.0
    #: Expectancy in R -- the number that actually decides whether a strategy
    #: survives, because it is independent of pair, size and account balance.
    expectancy_r: float = 0.0
    avg_win_r: float = 0.0
    avg_loss_r: float = 0.0
    best_r: float = 0.0
    worst_r: float = 0.0
    breakeven_win_rate: float = 0.0
    avg_win: float = 0.0
    avg_loss: float = 0.0
    largest_win: float = 0.0
    largest_loss: float = 0.0
    max_consecutive_losses: int = 0
    total_costs: float = 0.0
    total_financing: float = 0.0
    avg_duration_hours: float = 0.0
    exit_reasons: dict[str, int] = field(default_factory=dict)

    def report(self) -> str:
        pct = lambda x: f"{x * 100:.2f}%"  # noqa: E731
        cost_share = (
            abs(self.total_costs) / abs(self.ending_equity - self.starting_equity)
            if self.ending_equity != self.starting_equity
            else 0.0
        )
        lines = [
            "=" * 54,
            f"{'BACKTEST RESULTS':^54}",
            "=" * 54,
            f"  Starting equity      {self.starting_equity:>15,.2f}",
            f"  Ending equity        {self.ending_equity:>15,.2f}",
            f"  Total return         {pct(self.total_return):>15}",
            f"  CAGR                 {pct(self.cagr):>15}",
            "",
            f"  Max drawdown         {pct(self.max_drawdown):>15}",
            f"  Drawdown duration    {self.max_drawdown_duration_days:>12.1f} d",
            f"  Sharpe               {self.sharpe:>15.2f}",
            f"  Sortino              {self.sortino:>15.2f}",
            f"  Calmar               {self.calmar:>15.2f}",
            "",
            f"  Trades               {self.trades:>15,}",
            f"  Win rate             {pct(self.win_rate):>15}  ({self.wins}W / {self.losses}L)",
            f"  Profit factor        {self.profit_factor:>15.2f}",
            f"  Expectancy / trade   {self.expectancy:>15,.2f}",
            f"  Expectancy (pips)    {self.expectancy_pips:>15.1f}",
            f"  Expectancy (R)       {self.expectancy_r:>15.3f}",
            f"  Avg win / loss (R)   {self.avg_win_r:>7.2f} / {self.avg_loss_r:>7.2f}",
            f"  Break-even win rate  {self.breakeven_win_rate * 100:>14.1f}%",
            f"  Avg win / avg loss   {self.avg_win:>7,.2f} / {self.avg_loss:>7,.2f}",
            f"  Largest win / loss   {self.largest_win:>7,.2f} / {self.largest_loss:>7,.2f}",
            f"  Max consec. losses   {self.max_consecutive_losses:>15,}",
            f"  Avg hold             {self.avg_duration_hours:>12.1f} h",
            "",
            f"  Spread + slippage    {self.total_costs:>15,.2f}",
            f"  Financing (swap)     {self.total_financing:>15,.2f}",
            f"  Costs / gross P&L    {pct(cost_share):>15}",
        ]
        if self.exit_reasons:
            lines.append("")
            lines.append("  Exits:")
            for reason, count in sorted(
                self.exit_reasons.items(), key=lambda kv: -kv[1]
            ):
                lines.append(f"    {reason:<28} {count:>5}")
        lines.append("=" * 54)
        return "\n".join(lines)


def _drawdown(equity: list[float]) -> tuple[float, int, int]:
    """Max drawdown as a fraction, with the bar indices of its peak and trough."""
    peak, peak_idx = equity[0], 0
    worst, worst_peak, worst_trough = 0.0, 0, 0
    for i, value in enumerate(equity):
        if value > peak:
            peak, peak_idx = value, i
        if peak > 0:
            dd = (peak - value) / peak
            if dd > worst:
                worst, worst_peak, worst_trough = dd, peak_idx, i
    return worst, worst_peak, worst_trough


def compute(
    equity_curve: list[tuple[datetime, float]],
    trades: list[Trade],
    risk_free_rate: float = 0.0,
) -> Metrics:
    """Build a :class:`Metrics` from an equity curve and closed trades."""
    m = Metrics()
    if not equity_curve:
        return m

    times = [t for t, _ in equity_curve]
    equity = [e for _, e in equity_curve]
    m.starting_equity = equity[0]
    m.ending_equity = equity[-1]
    if m.starting_equity > 0:
        m.total_return = (m.ending_equity - m.starting_equity) / m.starting_equity

    span_days = max((times[-1] - times[0]).total_seconds() / 86400.0, 1e-9)
    years = span_days / 365.25
    if years > 0 and m.starting_equity > 0 and m.ending_equity > 0:
        m.cagr = (m.ending_equity / m.starting_equity) ** (1 / years) - 1

    m.max_drawdown, peak_i, trough_i = _drawdown(equity)
    if trough_i > peak_i:
        m.max_drawdown_duration_days = (
            times[trough_i] - times[peak_i]
        ).total_seconds() / 86400.0

    # Bar-over-bar simple returns.
    returns = [
        (equity[i] - equity[i - 1]) / equity[i - 1]
        for i in range(1, len(equity))
        if equity[i - 1] > 0
    ]
    if len(returns) > 1:
        ppy = _periods_per_year(times)
        mean_r = fmean(returns)
        excess = mean_r - risk_free_rate / ppy
        sd = pstdev(returns)
        if sd > 0:
            m.sharpe = excess / sd * math.sqrt(ppy)
        # Downside deviation divides by the count of *all* observations, not
        # just the losing ones -- dividing by the losers alone inflates the
        # denominator and pushes Sortino below Sharpe, which cannot happen.
        downside_sq = sum(r * r for r in returns if r < 0)
        if downside_sq > 0:
            dsd = math.sqrt(downside_sq / len(returns))
            m.sortino = excess / dsd * math.sqrt(ppy)
        elif mean_r > 0:
            m.sortino = float("inf")
    if m.max_drawdown > 0:
        m.calmar = m.cagr / m.max_drawdown

    m.trades = len(trades)
    if not trades:
        return m

    wins = [t for t in trades if t.pnl > 0]
    losses = [t for t in trades if t.pnl <= 0]
    m.wins, m.losses = len(wins), len(losses)
    m.win_rate = m.wins / m.trades

    gross_profit = sum(t.pnl for t in wins)
    gross_loss = abs(sum(t.pnl for t in losses))
    m.profit_factor = (
        gross_profit / gross_loss if gross_loss > 0
        else (float("inf") if gross_profit > 0 else 0.0)
    )
    m.expectancy = fmean([t.pnl for t in trades])
    m.expectancy_pips = fmean([t.pips for t in trades])

    r_values = [t.r_multiple for t in trades if t.r_multiple != 0.0]
    if r_values:
        m.expectancy_r = fmean(r_values)
        wins_r = [r for r in r_values if r > 0]
        losses_r = [r for r in r_values if r <= 0]
        m.avg_win_r = fmean(wins_r) if wins_r else 0.0
        m.avg_loss_r = fmean(losses_r) if losses_r else 0.0
        m.best_r, m.worst_r = max(r_values), min(r_values)
        # The win rate this payoff ratio needs just to break even. Compare it
        # to the achieved win rate: the gap is the entire edge.
        if m.avg_win_r > 0 and m.avg_loss_r < 0:
            payoff = m.avg_win_r / abs(m.avg_loss_r)
            m.breakeven_win_rate = 1.0 / (1.0 + payoff)
    m.avg_win = fmean([t.pnl for t in wins]) if wins else 0.0
    m.avg_loss = fmean([t.pnl for t in losses]) if losses else 0.0
    m.largest_win = max((t.pnl for t in trades), default=0.0)
    m.largest_loss = min((t.pnl for t in trades), default=0.0)
    m.total_costs = sum(t.costs for t in trades)
    m.total_financing = sum(t.financing for t in trades)
    m.avg_duration_hours = fmean([t.duration_hours for t in trades])

    streak = 0
    for t in trades:
        streak = streak + 1 if t.pnl <= 0 else 0
        m.max_consecutive_losses = max(m.max_consecutive_losses, streak)

    for t in trades:
        key = t.exit_reason or "unspecified"
        m.exit_reasons[key] = m.exit_reasons.get(key, 0) + 1
    return m
