"""An ordered checklist with a conversion funnel.

Most discretionary systems are taught as a named sequence -- check this, then
this, then this, and only then take the trade. Encoding one as a nested chain
of ``if`` statements works, but it throws away the single most useful piece of
diagnostic information: **where in the sequence setups die.**

A checklist here records, for every step, how many evaluations reached it and
how many passed. That turns a vague "the strategy doesn't trade much" into a
specific "step 3 rejects 94% of everything that reaches it", which is the
difference between a filter that is doing work and one that is just switched
off. Tightening a step that already passes everything changes nothing;
loosening a step that kills 99% is usually the whole game.

The steps carry a short key and a human name so a published framework can be
mapped onto them one-to-one and the funnel reads in the framework's own words.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Step:
    """One condition in an ordered checklist."""

    key: str
    name: str
    detail: str = ""

    @property
    def label(self) -> str:
        return f"{self.key} · {self.name}" if self.key else self.name


@dataclass
class Checklist:
    """An ordered set of steps that records how far each evaluation gets."""

    steps: tuple[Step, ...]
    reached: dict[str, int] = field(default_factory=dict)
    passed: dict[str, int] = field(default_factory=dict)
    completed: int = 0
    started: int = 0

    def __post_init__(self) -> None:
        if not self.steps:
            raise ValueError("a checklist needs at least one step")
        keys = [s.key for s in self.steps]
        if len(set(keys)) != len(keys):
            raise ValueError(f"duplicate step keys: {keys}")
        self._by_key = {s.key: s for s in self.steps}

    def step(self, key: str) -> Step:
        try:
            return self._by_key[key]
        except KeyError:
            raise KeyError(
                f"unknown checklist step {key!r}; steps are {list(self._by_key)}"
            ) from None

    def run(self) -> ChecklistRun:
        """Begin one evaluation."""
        self.started += 1
        return ChecklistRun(self)

    def reset(self) -> None:
        self.reached.clear()
        self.passed.clear()
        self.completed = 0
        self.started = 0

    # -- reporting --------------------------------------------------------

    def kill_rate(self, key: str) -> float:
        """Share of evaluations reaching this step that it rejects."""
        seen = self.reached.get(key, 0)
        if seen == 0:
            return 0.0
        return 1.0 - self.passed.get(key, 0) / seen

    def funnel(self) -> str:
        """A table of how far evaluations get through the checklist."""
        width = max(len(s.label) for s in self.steps)
        lines = [
            f"  {'step':<{width}} {'reached':>10} {'passed':>9} {'rejected':>10}",
            f"  {'-' * (width + 32)}",
        ]
        for s in self.steps:
            seen = self.reached.get(s.key, 0)
            ok = self.passed.get(s.key, 0)
            rate = f"{self.kill_rate(s.key) * 100:.1f}%" if seen else "--"
            lines.append(f"  {s.label:<{width}} {seen:>10,} {ok:>9,} {rate:>10}")
        lines.append(f"  {'-' * (width + 32)}")
        lines.append(
            f"  {'complete setups':<{width}} {self.started:>10,} {self.completed:>9,}"
        )
        return "\n".join(lines)

    def bottleneck(self) -> Step | None:
        """The step rejecting the most setups in absolute terms.

        Absolute, not proportional: a step that kills 99% of the 10 setups that
        reach it matters far less than one killing 60% of 10,000.
        """
        best, worst = None, 0
        for s in self.steps:
            rejected = self.reached.get(s.key, 0) - self.passed.get(s.key, 0)
            if rejected > worst:
                best, worst = s, rejected
        return best


@dataclass
class ChecklistRun:
    """One pass through a checklist. Stops recording at the first failure."""

    checklist: Checklist
    failed: Step | None = None
    _done: bool = False

    def check(self, key: str, ok: bool) -> bool:
        """Record an attempt at ``key``. Returns ``ok`` so it reads inline."""
        if self.failed is not None:
            raise RuntimeError(
                f"checklist run already failed at {self.failed.key!r}; "
                "a run must stop at its first failure"
            )
        step = self.checklist.step(key)
        self.checklist.reached[key] = self.checklist.reached.get(key, 0) + 1
        if ok:
            self.checklist.passed[key] = self.checklist.passed.get(key, 0) + 1
        else:
            self.failed = step
        return ok

    def complete(self) -> None:
        """Mark the run as having passed every step."""
        if self.failed is not None:
            raise RuntimeError(f"cannot complete a run that failed at {self.failed.key!r}")
        if not self._done:
            self.checklist.completed += 1
            self._done = True

    @property
    def failure(self) -> str:
        """A human-readable reason for the failure, in the step's own words."""
        if self.failed is None:
            return ""
        return self.failed.detail or self.failed.label
