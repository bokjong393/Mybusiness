
import pytest

from fxbot.config import LIVE_CONFIRMATION, Config, ConfigError, Credentials


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for key in ("FXBOT_ALLOW_LIVE", "OANDA_API_TOKEN", "OANDA_ACCOUNT_ID"):
        monkeypatch.delenv(key, raising=False)


class TestLiveGate:
    """Three independent interlocks. Any one missing means no live trading."""

    def test_practice_needs_no_ceremony(self):
        assert Config(environment="practice").check_live_permitted() is None

    def test_live_without_allow_live_is_refused(self):
        with pytest.raises(ConfigError, match="allow_live is false"):
            Config(environment="live", allow_live=False).check_live_permitted()

    def test_live_without_the_env_var_is_refused(self):
        with pytest.raises(ConfigError, match="FXBOT_ALLOW_LIVE"):
            Config(environment="live", allow_live=True).check_live_permitted()

    def test_a_wrong_env_var_value_is_refused(self, monkeypatch):
        monkeypatch.setenv("FXBOT_ALLOW_LIVE", "yes")
        with pytest.raises(ConfigError, match="FXBOT_ALLOW_LIVE"):
            Config(environment="live", allow_live=True).check_live_permitted()

    def test_all_three_plus_credentials_are_required(self, monkeypatch):
        monkeypatch.setenv("FXBOT_ALLOW_LIVE", LIVE_CONFIRMATION)
        config = Config(environment="live", allow_live=True)
        with pytest.raises(ConfigError, match="missing OANDA credentials"):
            config.check_live_permitted()

        config.credentials = Credentials(api_token="t", account_id="001-1")
        assert config.check_live_permitted() is None

    def test_the_host_differs_between_practice_and_live(self):
        assert "fxpractice" in Config(environment="practice").api_host
        assert "fxtrade" in Config(environment="live").api_host
        assert "fxpractice" not in Config(environment="live").api_host


class TestCredentials:
    def test_read_from_the_environment(self, monkeypatch):
        monkeypatch.setenv("OANDA_API_TOKEN", "abc123")
        monkeypatch.setenv("OANDA_ACCOUNT_ID", "101-001-1-001")
        creds = Credentials.from_env()
        assert creds.complete and creds.account_id == "101-001-1-001"

    def test_incomplete_credentials_are_detected(self, monkeypatch):
        monkeypatch.setenv("OANDA_API_TOKEN", "abc123")
        assert not Credentials.from_env().complete

    def test_the_token_never_appears_in_repr(self):
        text = repr(Credentials(api_token="supersecrettoken", account_id="101-1"))
        assert "supersecrettoken" not in text
        assert "..." in text


class TestLoading:
    def test_yaml_round_trip(self, tmp_path):
        path = tmp_path / "c.yaml"
        path.write_text(
            "symbol: gbp/jpy\ngranularity: M15\nrisk_per_trade: 0.005\n"
            "strategy: donchian_breakout\nstrategy_params:\n  entry: 30\n"
        )
        config = Config.load(path)
        assert config.symbol == "GBP_JPY"       # normalised
        assert config.risk_per_trade == 0.005
        assert config.strategy_params == {"entry": 30}

    def test_overrides_beat_the_file(self, tmp_path):
        path = tmp_path / "c.yaml"
        path.write_text("symbol: EUR_USD\ngranularity: H1\n")
        assert Config.load(path, granularity="M5").granularity == "M5"

    def test_none_overrides_are_ignored(self, tmp_path):
        path = tmp_path / "c.yaml"
        path.write_text("symbol: EUR_USD\ngranularity: H4\n")
        assert Config.load(path, granularity=None).granularity == "H4"

    def test_a_typo_in_a_key_is_an_error_not_a_silent_default(self, tmp_path):
        path = tmp_path / "c.yaml"
        path.write_text("symbol: EUR_USD\nrisk_per_trad: 0.5\n")
        with pytest.raises(ConfigError, match="unknown config key"):
            Config.load(path)

    def test_credentials_in_the_file_are_ignored(self, tmp_path):
        path = tmp_path / "c.yaml"
        path.write_text("symbol: EUR_USD\ncredentials:\n  api_token: leaked\n")
        assert Config.load(path).credentials.api_token != "leaked"

    def test_missing_file_is_an_error(self):
        with pytest.raises(ConfigError, match="no such config file"):
            Config.load("does/not/exist.yaml")

    def test_bad_environment_is_rejected(self):
        with pytest.raises(ConfigError, match="environment must be"):
            Config(environment="prod")

    def test_shipped_configs_are_valid(self):
        practice = Config.load("config/default.yaml")
        assert practice.environment == "practice" and not practice.allow_live

        live = Config.load("config/live.yaml")
        assert live.environment == "live" and live.allow_live
        # Even so, it cannot run without the environment variable.
        with pytest.raises(ConfigError, match="FXBOT_ALLOW_LIVE"):
            live.check_live_permitted()

    def test_limits_and_costs_are_derived_from_config(self):
        config = Config.load("config/default.yaml")
        assert config.to_limits().risk_per_trade == config.risk_per_trade
        assert config.to_costs().spread_pips["EUR_USD"] == 0.8
