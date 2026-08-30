import pytest

from fxbot.analysis import Plan, breakeven_grid, evaluate


class TestPlanGeometry:
    def test_cost_is_a_larger_share_of_a_tighter_stop(self):
        assert Plan(stop_pips=5, round_trip_pips=1.2).cost_r == pytest.approx(0.24)
        assert Plan(stop_pips=20, round_trip_pips=1.2).cost_r == pytest.approx(0.06)

    def test_a_stop_out_costs_more_than_one_r(self):
        """You pay the spread on the way in and again on the way out."""
        plan = Plan(stop_pips=5, round_trip_pips=1.2)
        assert plan.loss_r == pytest.approx(-1.24)

    def test_a_zero_cost_plan_loses_exactly_one_r(self):
        assert Plan(stop_pips=5, round_trip_pips=0.0).loss_r == pytest.approx(-1.0)

    def test_reaching_the_full_target_nets_less_than_the_nominal_r(self):
        plan = Plan(stop_pips=5, scale_out=((3.0, 0.5),), final_r=10.0, round_trip_pips=1.2)
        # Nominal 0.5*3 + 0.5*10 = 6.5R; costs make it less.
        assert plan.outcome_full_target() < 6.5
        assert plan.outcome_full_target() == pytest.approx(6.26, abs=0.01)

    def test_breakeven_after_a_partial_still_leaves_a_profit(self):
        plan = Plan(stop_pips=5, scale_out=((3.0, 0.5),), final_r=10.0, round_trip_pips=1.2)
        assert plan.outcome_partial(1) == pytest.approx(1.26, abs=0.01)

    def test_without_the_breakeven_move_the_remainder_is_a_full_loss(self):
        with_be = Plan(stop_pips=5, scale_out=((3.0, 0.5),), breakeven_after_scale=True)
        without = Plan(stop_pips=5, scale_out=((3.0, 0.5),), breakeven_after_scale=False)
        assert without.outcome_partial(1) < with_be.outcome_partial(1)

    def test_remainder_is_what_is_left_after_the_ladder(self):
        assert Plan(stop_pips=5, scale_out=((2.0, 0.3), (5.0, 0.3))).remainder == pytest.approx(0.4)

    @pytest.mark.parametrize("kwargs", [
        {"stop_pips": 0},
        {"stop_pips": 5, "scale_out": ((3.0, 0.7), (5.0, 0.7))},
        {"stop_pips": 5, "scale_out": ((12.0, 0.5),), "final_r": 10.0},
    ])
    def test_incoherent_plans_are_rejected(self, kwargs):
        with pytest.raises(ValueError):
            Plan(**kwargs)


class TestEvaluate:
    def test_expectancy_matches_the_hand_calculation(self):
        plan = Plan(stop_pips=5, scale_out=((3.0, 0.5),), final_r=10.0, round_trip_pips=1.2)
        out = evaluate(plan, p_full_target=0.10, p_partial=0.30)
        expected = 0.10 * out.r_full_target + 0.30 * out.r_partial + 0.60 * out.r_stop
        assert out.expectancy_r == pytest.approx(expected)
        assert out.p_stop == pytest.approx(0.60)

    def test_wider_stops_have_better_expectancy_at_equal_hit_rates(self):
        """Because the spread is a smaller share of the risk."""
        tight = evaluate(Plan(stop_pips=5), 0.10, 0.30).expectancy_r
        wide = evaluate(Plan(stop_pips=25), 0.10, 0.30).expectancy_r
        assert wide > tight

    def test_a_plan_that_never_reaches_a_target_is_negative(self):
        out = evaluate(Plan(stop_pips=5), p_full_target=0.0, p_partial=0.0)
        assert out.expectancy_r == pytest.approx(Plan(stop_pips=5).loss_r)

    def test_the_breakeven_solve_actually_gives_zero_expectancy(self):
        plan = Plan(stop_pips=5, scale_out=((3.0, 0.5),), final_r=10.0)
        out = evaluate(plan, p_full_target=0.05, p_partial=0.0)
        recomputed = evaluate(plan, p_full_target=0.05, p_partial=out.breakeven_p_partial)
        assert recomputed.expectancy_r == pytest.approx(0.0, abs=1e-9)

    def test_tight_stops_earn_a_warning(self):
        out = evaluate(Plan(stop_pips=4, round_trip_pips=1.2), 0.1, 0.3)
        assert any("transaction cost" in n for n in out.notes)

    def test_ambitious_targets_earn_a_warning(self):
        out = evaluate(Plan(stop_pips=5, final_r=10.0), 0.1, 0.3)
        assert any("pip run" in n for n in out.notes)

    def test_impossible_probabilities_are_rejected(self):
        with pytest.raises(ValueError, match="probabilities"):
            evaluate(Plan(stop_pips=5), p_full_target=0.7, p_partial=0.7)

    def test_report_renders(self):
        text = evaluate(Plan(stop_pips=5), 0.1, 0.3).report()
        assert "expectancy per trade" in text and "full stop" in text


class TestBreakevenGrid:
    def test_higher_target_rates_demand_fewer_partials(self):
        text = breakeven_grid(Plan(stop_pips=5, scale_out=((3.0, 0.5),), final_r=10.0))
        assert "needs first partial on" in text

    def test_the_documented_plan_needs_roughly_half_of_trades_to_reach_3r(self):
        """The headline number: with no 10R runners, ~50% must reach 3R."""
        plan = Plan(stop_pips=5, scale_out=((3.0, 0.5),), final_r=10.0, round_trip_pips=1.2)
        needed = evaluate(plan, p_full_target=0.0, p_partial=0.0).breakeven_p_partial
        assert 0.45 < needed < 0.55
