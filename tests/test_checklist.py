import pytest

from fxbot.strategy.checklist import Checklist, Step


@pytest.fixture
def checklist():
    return Checklist(steps=(
        Step("a", "First", "failed the first"),
        Step("b", "Second", "failed the second"),
        Step("c", "Third", "failed the third"),
    ))


class TestConstruction:
    def test_an_empty_checklist_is_rejected(self):
        with pytest.raises(ValueError, match="at least one step"):
            Checklist(steps=())

    def test_duplicate_keys_are_rejected(self):
        with pytest.raises(ValueError, match="duplicate step keys"):
            Checklist(steps=(Step("a", "One"), Step("a", "Two")))

    def test_an_unknown_step_names_the_valid_ones(self, checklist):
        with pytest.raises(KeyError, match="unknown checklist step"):
            checklist.step("z")

    def test_label_combines_key_and_name(self):
        assert Step("S", "Structure").label == "S · Structure"
        assert Step("", "Structure").label == "Structure"


class TestCounting:
    def test_a_full_pass_counts_as_complete(self, checklist):
        run = checklist.run()
        for key in ("a", "b", "c"):
            assert run.check(key, True)
        run.complete()
        assert checklist.completed == 1
        assert checklist.passed == {"a": 1, "b": 1, "c": 1}

    def test_a_failure_stops_the_run_short(self, checklist):
        run = checklist.run()
        run.check("a", True)
        assert run.check("b", False) is False
        assert checklist.reached == {"a": 1, "b": 1}
        assert "c" not in checklist.reached

    def test_later_steps_only_see_what_earlier_ones_passed(self, checklist):
        for ok in (True, False, True):
            run = checklist.run()
            if run.check("a", ok):
                run.check("b", True)
        assert checklist.reached["a"] == 3
        assert checklist.reached["b"] == 2

    def test_started_counts_every_evaluation(self, checklist):
        for _ in range(5):
            checklist.run()
        assert checklist.started == 5

    def test_checking_after_a_failure_is_a_programming_error(self, checklist):
        run = checklist.run()
        run.check("a", False)
        with pytest.raises(RuntimeError, match="already failed"):
            run.check("b", True)

    def test_completing_a_failed_run_is_a_programming_error(self, checklist):
        run = checklist.run()
        run.check("a", False)
        with pytest.raises(RuntimeError, match="cannot complete"):
            run.complete()

    def test_completing_twice_counts_once(self, checklist):
        run = checklist.run()
        for key in ("a", "b", "c"):
            run.check(key, True)
        run.complete()
        run.complete()
        assert checklist.completed == 1


class TestReporting:
    def test_failure_reads_in_the_steps_own_words(self, checklist):
        run = checklist.run()
        run.check("a", False)
        assert run.failure == "failed the first"

    def test_a_passing_run_has_no_failure_text(self, checklist):
        run = checklist.run()
        run.check("a", True)
        assert run.failure == ""

    def test_kill_rate_is_relative_to_what_reached_the_step(self, checklist):
        for ok in (True, True, False, False):
            checklist.run().check("a", ok)
        assert checklist.kill_rate("a") == pytest.approx(0.5)

    def test_an_unreached_step_has_no_kill_rate(self, checklist):
        assert checklist.kill_rate("c") == 0.0

    def test_the_bottleneck_is_measured_in_absolute_rejections(self, checklist):
        """A step killing 99% of 10 matters less than one killing 50% of 1000."""
        for _ in range(1000):
            run = checklist.run()
            if run.check("a", True):
                run.check("b", False)          # rejects 1000
        for _ in range(10):
            run = checklist.run()
            run.check("a", False)              # rejects 10
        assert checklist.bottleneck().key == "b"

    def test_no_rejections_means_no_bottleneck(self, checklist):
        run = checklist.run()
        for key in ("a", "b", "c"):
            run.check(key, True)
        assert checklist.bottleneck() is None

    def test_funnel_renders_every_step(self, checklist):
        run = checklist.run()
        run.check("a", True)
        run.check("b", False)
        text = checklist.funnel()
        for step in checklist.steps:
            assert step.label in text
        assert "complete setups" in text

    def test_reset_clears_counts(self, checklist):
        run = checklist.run()
        run.check("a", False)
        checklist.reset()
        assert checklist.started == 0 and not checklist.reached
