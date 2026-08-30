"""What a trading plan has to achieve to break even, before you risk anything.

A plan is a set of promises about frequency and payoff. Most of them can be
falsified with arithmetic in a few seconds, and doing that first is cheaper
than discovering it over six months of live trading.

The model here takes a scale-out plan expressed in R and asks: given these
targets and this stop, **how often must each outcome occur for expectancy to be
positive?** It charges the spread properly, which matters enormously at tight
stops -- a "1R" loss on a 5 pip stop with a 1.2 pip round trip is really
-1.24R, and the 3R target needs 15.6 pips of movement rather than 15.

Nothing here predicts whether you will hit those rates. It tells you what you
are signing up for.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Plan:
    """A stop, a scale-out ladder, and the cost of trading it."""

    stop_pips: float
    #: (R multiple, fraction of position) partial exits, in ascending order.
    scale_out: tuple[tuple[float, float], ...] = ((3.0, 0.5),)
    #: Where the remainder is aimed.
    final_r: float = 10.0
    #: Spread plus slippage paid on entry and again on exit, in pips.
    round_trip_pips: float = 1.2
    #: Stop moves to entry once the first partial fills.
    breakeven_after_scale: bool = True

    def __post_init__(self) -> None:
        if self.stop_pips <= 0:
            raise ValueError("stop_pips must be positive")
        if sum(f for _, f in self.scale_out) > 1.0 + 1e-9:
            raise ValueError("scale-out fractions sum to more than the whole position")
        if self.scale_out and self.final_r <= max(m for m, _ in self.scale_out):
            raise ValueError("final_r must be beyond the last scale-out level")

    # -- cost-adjusted geometry -------------------------------------------

    @property
    def cost_r(self) -> float:
        """The round trip expressed in R. This is the tax on every trade."""
        return self.round_trip_pips / self.stop_pips

    @property
    def loss_r(self) -> float:
        """What a stop-out actually costs, including crossing the spread."""
        return -(1.0 + self.cost_r)

    def gain_r(self, target_r: float, fraction: float) -> float:
        """Net R banked by taking ``fraction`` off at ``target_r``."""
        return fraction * (target_r - self.cost_r)

    @property
    def remainder(self) -> float:
        return 1.0 - sum(f for _, f in self.scale_out)

    # -- outcomes ---------------------------------------------------------

    def outcome_full_stop(self) -> float:
        return self.loss_r

    def outcome_partial(self, level: int) -> float:
        """Reached scale-out ``level`` (1-based), then stopped at breakeven.

        Without a breakeven move, whatever is left is stopped for a full loss,
        which is why the breakeven rule is worth so much at tight stops.
        """
        banked = sum(
            self.gain_r(m, f) for m, f in self.scale_out[:level]
        )
        held = 1.0 - sum(f for _, f in self.scale_out[:level])
        # Exiting at entry still pays the exit half of the spread; without the
        # breakeven move the remainder is stopped for a full loss instead.
        residual = -held * self.cost_r if self.breakeven_after_scale else held * self.loss_r
        return banked + residual

    def outcome_full_target(self) -> float:
        banked = sum(self.gain_r(m, f) for m, f in self.scale_out)
        return banked + self.gain_r(self.final_r, self.remainder)

    def describe(self) -> str:
        ladder = ", ".join(f"{f:.0%} at {m:g}R" for m, f in self.scale_out)
        return (
            f"stop {self.stop_pips:g} pips | {ladder} | "
            f"{self.remainder:.0%} to {self.final_r:g}R | "
            f"round trip {self.round_trip_pips:g} pips ({self.cost_r:.0%} of R)"
        )


@dataclass
class PlanOutcome:
    """Expectancy of a plan under an assumed distribution of outcomes."""

    plan: Plan
    p_full_target: float
    p_partial: float
    p_stop: float
    expectancy_r: float = 0.0
    r_full_target: float = 0.0
    r_partial: float = 0.0
    r_stop: float = 0.0
    breakeven_p_partial: float = 0.0
    notes: list[str] = field(default_factory=list)

    def report(self) -> str:
        lines = [
            f"  Plan: {self.plan.describe()}",
            "",
            f"  {'outcome':<26}{'probability':>13}{'result':>11}{'contribution':>15}",
            f"  {'-' * 63}",
            f"  {'runs to target':<26}{self.p_full_target:>12.1%}"
            f"{self.r_full_target:>10.2f}R{self.p_full_target * self.r_full_target:>14.3f}R",
            f"  {'partial then breakeven':<26}{self.p_partial:>12.1%}"
            f"{self.r_partial:>10.2f}R{self.p_partial * self.r_partial:>14.3f}R",
            f"  {'full stop':<26}{self.p_stop:>12.1%}"
            f"{self.r_stop:>10.2f}R{self.p_stop * self.r_stop:>14.3f}R",
            f"  {'-' * 63}",
            f"  {'expectancy per trade':<26}{'':>12}{'':>11}{self.expectancy_r:>14.3f}R",
        ]
        if self.expectancy_r <= 0:
            lines.append("")
            lines.append(
                f"  Negative. To break even at this target rate you would need to "
                f"reach\n  the first partial on {self.breakeven_p_partial:.1%} of trades "
                f"instead of {self.p_partial:.1%}."
            )
        for note in self.notes:
            lines.append(f"  ! {note}")
        return "\n".join(lines)


def evaluate(
    plan: Plan,
    p_full_target: float,
    p_partial: float,
) -> PlanOutcome:
    """Expectancy given how often the plan reaches its target and its first partial.

    ``p_partial`` is the probability of reaching the first scale-out but *not*
    the final target; whatever probability is left over is a full stop.
    """
    if p_full_target < 0 or p_partial < 0 or p_full_target + p_partial > 1.0:
        raise ValueError("probabilities must be non-negative and sum to at most 1")

    p_stop = 1.0 - p_full_target - p_partial
    r_target = plan.outcome_full_target()
    r_partial = plan.outcome_partial(1) if plan.scale_out else plan.loss_r
    r_stop = plan.outcome_full_stop()

    outcome = PlanOutcome(
        plan=plan, p_full_target=p_full_target, p_partial=p_partial, p_stop=p_stop,
        expectancy_r=p_full_target * r_target + p_partial * r_partial + p_stop * r_stop,
        r_full_target=r_target, r_partial=r_partial, r_stop=r_stop,
    )

    # Solve for the p_partial that makes expectancy zero, holding p_target fixed.
    # E = pt*Rt + pp*Rp + (1 - pt - pp)*Rs = 0
    denominator = r_partial - r_stop
    if abs(denominator) > 1e-12:
        outcome.breakeven_p_partial = (
            -(p_full_target * r_target + (1 - p_full_target) * r_stop) / denominator
        )

    if plan.cost_r > 0.15:
        outcome.notes.append(
            f"the spread is {plan.cost_r:.0%} of your risk; a stop this tight is "
            "mostly transaction cost"
        )
    if plan.final_r >= 8 and plan.stop_pips <= 7:
        move = plan.final_r * plan.stop_pips
        outcome.notes.append(
            f"the {plan.final_r:g}R target needs a {move:.0f} pip run from entry -- "
            "check that against the session's average range"
        )
    return outcome


def breakeven_grid(
    plan: Plan,
    target_rates: tuple[float, ...] = (0.0, 0.02, 0.05, 0.10),
) -> str:
    """A table of the partial-hit rate needed to break even, per target rate.

    Reading this is the fastest way to sanity-check a scale-out plan: if the
    required rate is higher than you have ever achieved, the plan is arithmetic,
    not psychology.
    """
    lines = [
        f"  {plan.describe()}",
        "",
        f"  {'reaches ' + str(plan.final_r) + 'R':<18}{'needs first partial on':>26}",
        f"  {'-' * 44}",
    ]
    for rate in target_rates:
        outcome = evaluate(plan, p_full_target=rate, p_partial=0.0)
        needed = outcome.breakeven_p_partial
        text = f"{needed:.1%}" if 0 <= needed <= 1 else "impossible"
        lines.append(f"  {rate:<17.1%}{text:>26}")
    return "\n".join(lines)
