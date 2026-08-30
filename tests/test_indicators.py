import pytest

from fxbot.strategy.indicators import ATR, EMA, RSI, SMA, Donchian


class TestReadiness:
    @pytest.mark.parametrize("cls", [SMA, EMA])
    def test_not_ready_before_the_period_is_filled(self, cls):
        ind = cls(5)
        for x in range(4):
            assert ind.update(float(x)) is None
        assert ind.update(4.0) is not None
        assert ind.ready

    def test_zero_period_is_rejected(self):
        with pytest.raises(ValueError):
            SMA(0)


class TestSMA:
    def test_matches_the_arithmetic_mean(self):
        sma = SMA(3)
        for x in (1.0, 2.0, 3.0):
            sma.update(x)
        assert sma.value == pytest.approx(2.0)
        sma.update(4.0)
        assert sma.value == pytest.approx(3.0)   # window rolled

    def test_constant_input_gives_the_constant(self):
        sma = SMA(10)
        for _ in range(20):
            sma.update(1.0850)
        assert sma.value == pytest.approx(1.0850)


class TestEMA:
    def test_seeds_from_an_sma_rather_than_the_first_print(self):
        ema, sma = EMA(5), SMA(5)
        for x in (10.0, 20.0, 30.0, 40.0, 50.0):
            ema.update(x)
            sma.update(x)
        assert ema.value == pytest.approx(sma.value)

    def test_responds_faster_than_the_sma(self):
        ema, sma = EMA(10), SMA(10)
        for _ in range(10):
            ema.update(1.0)
            sma.update(1.0)
        for _ in range(3):
            ema.update(2.0)
            sma.update(2.0)
        assert ema.value > sma.value

    def test_converges_to_a_constant(self):
        ema = EMA(5)
        for _ in range(200):
            ema.update(1.2345)
        assert ema.value == pytest.approx(1.2345, abs=1e-9)


class TestATR:
    def test_equals_the_range_for_gapless_constant_bars(self):
        atr = ATR(14)
        for _ in range(30):
            atr.update_bar(1.0860, 1.0850, 1.0855)
        assert atr.value == pytest.approx(0.0010, abs=1e-9)

    def test_true_range_includes_the_gap_from_the_previous_close(self):
        """The property that makes ATR the right stop basis in FX."""
        atr = ATR(2)
        atr.update_bar(1.0860, 1.0850, 1.0855)
        # Next bar gaps far below: its own range is small, true range is not.
        atr.update_bar(1.0800, 1.0795, 1.0798)
        assert atr.value > 0.0005

    def test_rising_volatility_raises_atr(self):
        calm, wild = ATR(5), ATR(5)
        for _ in range(20):
            calm.update_bar(1.0855, 1.0850, 1.0852)
            wild.update_bar(1.0900, 1.0800, 1.0850)
        assert wild.value > calm.value


class TestRSI:
    def test_pegs_at_100_on_an_unbroken_advance(self):
        rsi = RSI(14)
        for i in range(30):
            rsi.update(1.0 + i * 0.001)
        assert rsi.value == pytest.approx(100.0)

    def test_pegs_near_zero_on_an_unbroken_decline(self):
        rsi = RSI(14)
        for i in range(30):
            rsi.update(2.0 - i * 0.001)
        assert rsi.value == pytest.approx(0.0, abs=1e-6)

    def test_sits_near_the_middle_on_an_alternating_series(self):
        rsi = RSI(14)
        for i in range(60):
            rsi.update(1.0 + (0.001 if i % 2 else 0.0))
        assert 30 < rsi.value < 70


class TestDonchian:
    def test_channel_excludes_the_bar_being_tested(self):
        """Including the current bar makes every breakout unattainable."""
        d = Donchian(3)
        for high, low in [(1.09, 1.08), (1.10, 1.07), (1.11, 1.06)]:
            d.update_bar(high, low)
        assert d.upper is None          # only 3 bars seen, none complete yet
        d.update_bar(1.20, 1.00)        # a huge bar
        assert d.upper == pytest.approx(1.11)   # unaffected by the huge bar
        assert d.lower == pytest.approx(1.06)

    def test_middle_is_the_channel_midpoint(self):
        d = Donchian(2)
        for high, low in [(1.10, 1.00), (1.20, 1.05), (1.15, 1.02)]:
            d.update_bar(high, low)
        assert d.middle == pytest.approx((d.upper + d.lower) / 2)
