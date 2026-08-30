"""A thin OANDA v20 REST client.

Built on the standard library so the package has no required runtime
dependencies.  It covers only the endpoints this bot needs, and it is
deliberately strict about two things:

* **Prices are parsed as strings.**  OANDA returns numbers as JSON strings for
  exactly the reason you would hope, and this client keeps that discipline
  right up to the point of converting to float.
* **Errors are surfaced, not swallowed.**  A rejected order raises, carrying
  the venue's own reason code, because a silently dropped order in a trading
  loop looks identical to a strategy that decided not to trade.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from typing import Any

USER_AGENT = "fxbot/0.1 (+https://github.com/bokjong393/Mybusiness)"
RETRY_STATUSES = frozenset({408, 429, 500, 502, 503, 504})


class OandaError(RuntimeError):
    """An error returned by the OANDA API."""

    def __init__(self, message: str, status: int | None = None, payload: Any = None):
        super().__init__(message)
        self.status = status
        self.payload = payload


def parse_time(raw: str) -> datetime:
    """Parse an RFC3339 timestamp, tolerating OANDA's nanosecond precision."""
    text = raw.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    # Python accepts at most 6 fractional digits; OANDA sends 9.
    if "." in text:
        head, _, tail = text.partition(".")
        digits = "".join(c for c in tail if c.isdigit())[:6].ljust(6, "0")
        offset = tail[len(digits):] if not tail[len(digits):].isdigit() else ""
        for marker in ("+", "-"):
            if marker in tail:
                offset = tail[tail.index(marker):]
                break
        text = f"{head}.{digits}{offset or '+00:00'}"
    return datetime.fromisoformat(text).astimezone(UTC)


class OandaClient:
    """Authenticated HTTP access to one OANDA account."""

    def __init__(
        self,
        api_token: str,
        account_id: str,
        host: str,
        timeout: float = 20.0,
        max_retries: int = 4,
    ) -> None:
        if not api_token or not account_id:
            raise OandaError("api_token and account_id are both required")
        self._token = api_token
        self.account_id = account_id
        self.host = host.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries

    # -- transport --------------------------------------------------------

    def request(
        self, method: str, path: str, params: dict | None = None, body: dict | None = None
    ) -> dict:
        url = f"{self.host}{path}"
        if params:
            url = f"{url}?{urllib.parse.urlencode(params)}"
        payload = json.dumps(body).encode() if body is not None else None

        last: Exception | None = None
        for attempt in range(self.max_retries):
            request = urllib.request.Request(url, data=payload, method=method)
            request.add_header("Authorization", f"Bearer {self._token}")
            request.add_header("Content-Type", "application/json")
            request.add_header("Accept-Datetime-Format", "RFC3339")
            request.add_header("User-Agent", USER_AGENT)
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    return json.loads(response.read() or b"{}")
            except urllib.error.HTTPError as exc:
                raw = exc.read()
                try:
                    detail = json.loads(raw)
                except (ValueError, TypeError):
                    detail = {"raw": raw.decode(errors="replace")[:500]}
                message = (
                    detail.get("errorMessage")
                    or detail.get("rejectReason")
                    or str(detail)
                )
                if exc.code not in RETRY_STATUSES:
                    raise OandaError(
                        f"{method} {path} failed [{exc.code}]: {message}",
                        status=exc.code, payload=detail,
                    ) from exc
                last = OandaError(
                    f"{method} {path} failed [{exc.code}]: {message}",
                    status=exc.code, payload=detail,
                )
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                last = OandaError(f"{method} {path} network error: {exc}")

            if attempt < self.max_retries - 1:
                time.sleep(2.0 ** attempt)  # 1s, 2s, 4s

        raise last or OandaError(f"{method} {path} failed after {self.max_retries} attempts")

    def get(self, path: str, params: dict | None = None) -> dict:
        return self.request("GET", path, params=params)

    def post(self, path: str, body: dict) -> dict:
        return self.request("POST", path, body=body)

    def put(self, path: str, body: dict | None = None) -> dict:
        return self.request("PUT", path, body=body or {})

    # -- endpoints --------------------------------------------------------

    def candles(
        self,
        instrument: str,
        granularity: str = "H1",
        count: int | None = 500,
        start: datetime | None = None,
        end: datetime | None = None,
        price: str = "MBA",
    ) -> list[dict]:
        """Raw candle dictionaries, newest last. ``count`` is capped at 5000."""
        params: dict[str, Any] = {"granularity": granularity, "price": price}
        if start is not None:
            params["from"] = start.astimezone(UTC).isoformat().replace("+00:00", "Z")
            if end is not None:
                params["to"] = end.astimezone(UTC).isoformat().replace("+00:00", "Z")
            elif count:
                params["count"] = min(count, 5000)
        else:
            params["count"] = min(count or 500, 5000)
        data = self.get(f"/v3/instruments/{instrument}/candles", params)
        return data.get("candles", [])

    def account_summary(self) -> dict:
        return self.get(f"/v3/accounts/{self.account_id}/summary").get("account", {})

    def open_trades(self) -> list[dict]:
        return self.get(f"/v3/accounts/{self.account_id}/openTrades").get("trades", [])

    def pricing(self, instruments: list[str]) -> list[dict]:
        return self.get(
            f"/v3/accounts/{self.account_id}/pricing",
            {"instruments": ",".join(instruments)},
        ).get("prices", [])

    def instrument_details(self, instruments: list[str] | None = None) -> list[dict]:
        params = {"instruments": ",".join(instruments)} if instruments else None
        return self.get(f"/v3/accounts/{self.account_id}/instruments", params).get(
            "instruments", []
        )

    def market_order(
        self,
        instrument: str,
        units: int,
        stop_loss: float | None = None,
        take_profit: float | None = None,
        precision: int = 5,
        time_in_force: str = "FOK",
        client_tag: str = "",
    ) -> dict:
        """Place a market order. Returns the fill transaction.

        Raises :class:`OandaError` if the venue cancels the order -- most often
        ``FIFO_VIOLATION``, ``INSUFFICIENT_MARGIN``, or ``MARKET_HALTED``.
        """
        order: dict[str, Any] = {
            "type": "MARKET",
            "instrument": instrument,
            "units": str(int(units)),
            "timeInForce": time_in_force,
            "positionFill": "DEFAULT",
        }
        if stop_loss is not None:
            order["stopLossOnFill"] = {
                "price": f"{stop_loss:.{precision}f}", "timeInForce": "GTC",
            }
        if take_profit is not None:
            order["takeProfitOnFill"] = {
                "price": f"{take_profit:.{precision}f}", "timeInForce": "GTC",
            }
        if client_tag:
            order["clientExtensions"] = {"tag": client_tag}

        response = self.post(f"/v3/accounts/{self.account_id}/orders", {"order": order})
        if "orderFillTransaction" not in response:
            reason = (
                response.get("orderCancelTransaction", {}).get("reason")
                or response.get("orderRejectTransaction", {}).get("rejectReason")
                or "no fill transaction returned"
            )
            raise OandaError(f"order not filled: {reason}", payload=response)
        return response["orderFillTransaction"]

    def close_trade(self, trade_id: str, units: str = "ALL") -> dict:
        response = self.put(
            f"/v3/accounts/{self.account_id}/trades/{trade_id}/close", {"units": units}
        )
        if "orderFillTransaction" not in response:
            raise OandaError(f"close of trade {trade_id} did not fill", payload=response)
        return response["orderFillTransaction"]
