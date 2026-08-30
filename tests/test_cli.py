import pytest

from fxbot.cli import main
from fxbot.data import csv_source
from fxbot.data.synthetic import generate


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for key in ("FXBOT_ALLOW_LIVE", "OANDA_API_TOKEN", "OANDA_ACCOUNT_ID"):
        monkeypatch.delenv(key, raising=False)


@pytest.fixture
def candle_csv(tmp_path):
    return csv_source.write(generate(bars=1500, trend_strength=0.06), tmp_path / "eu.csv")


class TestCommands:
    def test_strategies_lists_the_registry(self, capsys):
        assert main(["strategies"]) == 0
        assert "ema_crossover" in capsys.readouterr().out

    def test_demo_runs_without_credentials(self, capsys):
        assert main(["demo", "--bars", "800"]) == 0
        assert "BACKTEST RESULTS" in capsys.readouterr().out

    def test_demo_accepts_strategy_parameters(self, capsys):
        assert main(["demo", "--bars", "600", "--param", "fast=5", "--param", "slow=15"]) == 0
        assert "fast=5" in capsys.readouterr().out

    def test_backtest_against_a_csv(self, candle_csv, capsys):
        assert main(["backtest", "--csv", str(candle_csv)]) == 0
        assert "BACKTEST RESULTS" in capsys.readouterr().out

    def test_backtest_can_print_every_trade(self, candle_csv, capsys):
        assert main(["backtest", "--csv", str(candle_csv), "--trades"]) == 0
        assert "reason" in capsys.readouterr().out

    def test_backtest_writes_an_equity_curve(self, candle_csv, tmp_path):
        out = tmp_path / "equity.csv"
        assert main(["backtest", "--csv", str(candle_csv), "--equity-csv", str(out)]) == 0
        assert out.exists() and out.read_text().startswith("time,equity")

    def test_backtest_uses_the_shipped_config(self, candle_csv, capsys):
        assert main(["backtest", "--csv", str(candle_csv),
                     "--config", "config/default.yaml"]) == 0
        assert "BACKTEST RESULTS" in capsys.readouterr().out

    def test_a_missing_csv_exits_nonzero(self, capsys):
        assert main(["backtest", "--csv", "nope.csv"]) == 1


class TestSafety:
    def test_live_without_the_interlocks_exits_with_a_config_error(self, capsys):
        code = main(["live", "--config", "config/live.yaml", "--yes"])
        assert code == 2
        assert "FXBOT_ALLOW_LIVE" in capsys.readouterr().err

    def test_paper_without_credentials_fails_cleanly(self, capsys):
        code = main(["paper", "--config", "config/default.yaml", "--cycles", "1"])
        assert code == 2
        assert "credentials" in capsys.readouterr().err.lower()

    def test_fetch_without_credentials_fails_cleanly(self, capsys):
        assert main(["fetch", "--config", "config/default.yaml"]) == 2


class TestArgumentParsing:
    def test_bad_parameter_syntax_is_rejected(self):
        with pytest.raises(SystemExit):
            main(["demo", "--param", "fastequals12"])

    def test_unknown_strategy_is_rejected_by_argparse(self):
        with pytest.raises(SystemExit):
            main(["demo", "--strategy", "moon_phase"])

    def test_no_command_is_an_error(self):
        with pytest.raises(SystemExit):
            main([])
