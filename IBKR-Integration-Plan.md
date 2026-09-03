# IBKR Integration Plan

Handoff document. Everything needed to implement the Interactive Brokers integration in Blue Star is here — research findings, decisions already made, architecture, and a phased task list. Read it fully before writing code.

---

## 1. Goal

Bring the user's Interactive Brokers portfolio into Blue Star and allow placing buy orders with an attached profit target and stop loss, from the Blue Star UI.

### Decisions already made (do not relitigate)

| Decision                      | Choice                                                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Source of truth for positions | **IBKR.** The existing `position` module is a legacy holdout and will be retired later (Phase 6). Do not migrate or modify it in Phases 1–5. |
| Order shape                   | **Bracket order**: entry BUY + attached sell-limit (target) + attached sell-stop (stop loss), submitted as one unit.                         |
| Automation level              | **Human confirms every order.** No cron, screener, or signal may transmit an order. Ever.                                                    |

### Scope boundaries

- **Market data stays where it is** (Yahoo / Finnhub / TradingView, in the `market-data` module). IBKR real-time quotes require paid entitlements and carry their own pacing rules. IBKR is used **only** for account state and order management.
- Single user, single IBKR account. No per-user OAuth flow — credentials are application config.
- Long positions only in Phase 1–5. Shorts, options, and multi-currency handling are out of scope.

---

## 2. Research findings

Condensed so the implementing agent does not need to redo this.

### What IBKR offers

| Product                                                                    | Summary                                                                                                                                                                                                                    | Verdict                                                                                                                                           |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TWS API**                                                                | Socket protocol against a running Trader Workstation or IB Gateway (Java desktop app). Richest surface: streaming quotes, full order catalog, real-time execution events. Node client `@stoqey/ib` is actively maintained. | **Rejected.** Requires a ~1 GB JVM GUI app running on the Raspberry Pi with a daily restart cycle. Not worth it for a handful of orders per week. |
| **Web API** (merged Client Portal API + Digital Account Management + Flex) | REST + WebSocket. Same trading capability for our needs. Base URL `https://api.ibkr.com/v1/api`.                                                                                                                           | **Chosen.**                                                                                                                                       |
| **FIX**                                                                    | Institutional, dedicated onboarding, account minimums.                                                                                                                                                                     | Not applicable.                                                                                                                                   |
| **Flex Web Service**                                                       | Token-based, read-only XML statements (positions, trades, cash). Trivial to integrate.                                                                                                                                     | Useful later as a reconciliation / history-backfill source in Phase 6.                                                                            |

### Web API authentication — three paths

1. **OAuth 2.0** — `private_key_jwt` (RFC 7521/7523). Beta, institutional-first. As of mid-2026 IBKR states individual access is "considered for the future, no ETA." **Not available to us.**
2. **OAuth 1.0a** — RSA signature + encryption key pairs plus a Diffie-Hellman prime, registered via a self-service portal, yielding a long-lived access token. Officially framed as institutional, but individual Pro account holders register successfully and IBKR API support has confirmed no technical barrier. **No local gateway process at all** — this is the production target.
3. **Client Portal Gateway** — a small Java proxy run locally (`https://localhost:5000/v1/api`), officially the retail path. Login is a manual browser form; automation requires the unofficial [IBeam](https://github.com/voyz/ibeam) tool. **Development path and fallback.**

Both (2) and (3) expose an **identical REST surface** — only request signing differs. This is why auth is a swappable strategy in the design below.

### Hard constraints — design around these

- **One brokerage session per username, across all IB platforms.** If the Pi holds a session and the user logs into TWS or the IBKR mobile app, one of them is killed. Mitigated by a dedicated second username (see Prerequisites).
- **Session dies after 5 minutes idle.** `/tickle` must be called roughly every minute.
- **OAuth live session token lasts ~24 h**, and IBKR's daily server maintenance kills sessions regardless of age. A supervised reconnect loop is mandatory, not optional.
- **Rate limits:** 50 req/s per authenticated session, but only **10 req/s through the CP Gateway**. `/iserver/marketdata/history` is capped at 5 concurrent. Exceeding limits returns `429` and puts the source IP in a **10-minute penalty box**. Client-side throttling is not optional.
- **Order modification requires resending every key** from the original submission, unchanged, except the field being altered. The full submitted payload must therefore be persisted.
- **`cOID` (customer order id) must be unique over any 24-hour span.**
- **Order placement can return a confirmation-question flow** (`/iserver/reply/{replyId}`) that must be answered before the order goes live.
- **Market data is separately entitled.** Free tier is delayed L1 only. Another reason to keep quotes out of scope.

### Endpoint reference

Verify each against current docs before use. Note that `interactivebrokers.com` **blocks automated fetching (HTTP 403)** — the implementing agent will need the user to open pages, or should rely on the community references listed in §10.

| Purpose                           | Endpoint                                              |
| --------------------------------- | ----------------------------------------------------- |
| Auth status                       | `GET /iserver/auth/status`                            |
| Re-authenticate                   | `POST /iserver/reauthenticate`                        |
| Validate SSO                      | `GET /sso/validate`                                   |
| Keepalive                         | `POST /tickle`                                        |
| List accounts                     | `GET /portfolio/accounts`                             |
| Positions                         | `GET /portfolio/{accountId}/positions/{pageId}`       |
| Account summary                   | `GET /portfolio/{accountId}/summary`                  |
| Cash balances                     | `GET /portfolio/{accountId}/ledger`                   |
| Contract search                   | `GET /iserver/secdef/search`                          |
| Contract detail                   | `GET /iserver/secdef/info`                            |
| Preview order (margin/commission) | `POST /iserver/account/{accountId}/orders/whatif`     |
| Place order(s) — **array body**   | `POST /iserver/account/{accountId}/orders`            |
| Answer confirmation question      | `POST /iserver/reply/{replyId}`                       |
| Live orders                       | `GET /iserver/account/orders`                         |
| Modify order — **object body**    | `POST /iserver/account/{accountId}/order/{orderId}`   |
| Cancel order                      | `DELETE /iserver/account/{accountId}/order/{orderId}` |
| Executions                        | `GET /iserver/account/trades`                         |

### Bracket order shape

One POST to `/iserver/account/{accountId}/orders` with an array of three orders:

1. Parent BUY, carrying a `cOID` (e.g. the order ticket id).
2. Child SELL `LMT` at the profit target, with `parentId` equal to the parent's `cOID`.
3. Child SELL `STP` at the stop loss, with `parentId` equal to the parent's `cOID`.

IBKR OCA-links the two children automatically — filling one cancels the other.

---

## 3. Prerequisites

**These are human actions the user must perform. They gate the work — surface them immediately and do not start Phase 4 before they are done.**

1. **Create a second IBKR username** on the account, dedicated to API use, and grant it trading permissions. Without this, the Pi's session and the user's TWS/mobile sessions will evict each other continuously. This is the single most important prerequisite.
2. **Register for OAuth 1.0a** via the IBKR self-service portal, using the new username. Requires an IBKR **Pro**, funded account. Steps:
   - Generate four files with OpenSSL: private/public signature keys, private/public encryption keys, and DH parameters (`dhparam.pem`).
   - Choose a 9-character consumer key.
   - Upload the public signature key, public encryption key, and DH params.
   - Generate and securely store the access token and access token secret.
   - Extract the hex DH prime from `dhparam.pem`.
   - Toggle OAuth access on.
   - **Activation takes 24 hours to ~2 weeks.** Start this on day one; Phases 1–3 proceed on the CP Gateway meanwhile.
3. **Confirm the paper trading account** is attached to the new username, and record both the paper and live account IDs.
4. **Decide where the CP Gateway runs** for development — locally on the dev machine is fine; on the Pi it needs a container in `docker-compose.prod.yml`. It is a small Java process and runs acceptably on ARM.
5. **Store secrets** in the backend's existing config mechanism (`ConfigService` / `.env`). Never commit key files; mount them as paths.

---

## 4. Architecture

Follow the conventions in `CLAUDE.md`, `apps/backend/CLAUDE.md`, and the `backend-patterns` / `backend-testing` / `backend-security` skills. Dependency direction: Domain ← Application ← Infrastructure ← API. IBKR must not appear anywhere outside `infrastructure/`.

New module: `apps/backend/src/modules/broker/`

```
broker/
  broker.module.ts
  constants/tokens.ts
  domain/
    domain-errors.ts               # re-export DomainError/AuthorizationError/NotFoundError, extend with InvariantError/StateError
    value-objects/
      con-id.ts
      broker-account-id.ts
      client-order-id.ts           # cOID; derived from ticket id, unique per 24h
      broker-order-id.ts
      order-quantity.ts
      limit-price.ts
      stop-price.ts
      order-side.ts                # BUY | SELL
      order-type.ts                # MKT | LMT | STP
      time-in-force.ts
      money.ts
    entities/
      order-ticket.ts              # aggregate: the local intent + lifecycle
      bracket-plan.ts              # entry + target + stop, validated as a unit
      broker-position.ts           # mirrored read model, not an aggregate
    services/
      broker-gateway.ts            # PORT interface — the only thing use cases know about
      broker-session.ts            # PORT interface — auth/session strategy
    repositories/
      order-ticket-read.repository.interface.ts
      order-ticket-write.repository.interface.ts
      broker-position.repository.interface.ts
      broker-contract.repository.interface.ts
  use-cases/
    get-broker-health.use-case.ts
    get-broker-positions.use-case.ts
    get-account-summary.use-case.ts
    resolve-contract.use-case.ts
    preview-order.use-case.ts
    confirm-order.use-case.ts
    cancel-order.use-case.ts
    get-order-tickets.use-case.ts
  infrastructure/
    http/
      ibkr-http.client.ts          # base URL, throttle, retry, error mapping
      ibkr-rate-limiter.ts         # token bucket
    session/
      cp-gateway-broker-session.ts
      oauth1-broker-session.ts     # + oauth1-signer.ts
    services/
      ibkr-web-api-broker-gateway.ts
      session-keepalive.cron.ts
      broker-position-sync.cron.ts
      order-status-poll.cron.ts
    repositories/
      order-ticket-read.repository.ts
      order-ticket-write.repository.ts
      broker-position.repository.ts
      broker-contract.repository.ts
  api/
    broker.controller.ts
    broker-api.dto.ts
    broker-api.mapper.ts
```

### Key design points

**`BrokerSession` is a strategy.** `CpGatewayBrokerSession` and `OAuth1BrokerSession` implement the same port and are selected by `IBKR_AUTH_MODE`. Swapping them must require zero changes to the gateway, use cases, or controller.

**`IbkrHttpClient` owns all cross-cutting concerns**: base URL, a token bucket set conservatively at ~5 req/s (well under the 10 req/s gateway ceiling — a `429` costs a 10-minute ban), retry with exponential backoff on 429/5xx, and mapping IBKR error payloads to `DomainError` subtypes so the global `DomainErrorFilter` produces sane HTTP statuses.

**Polling, not WebSocket.** Simpler, survives Pi reboots, and trivially within rate limits at this order volume. A WS subscription for live order status can be added later if fills feel laggy.

**Reuse the `notification` module** (ntfy) for session-loss and order-fill alerts. See `modules/notification/domain/services/notification.service.ts`.

**Cron conventions** follow `modules/paper-trading/infrastructure/services/paper-trade-monitor.cron.ts` — `@Cron` with `timeZone: 'America/Toronto'`, market-hours guard via `watchlist-monitoring/infrastructure/services/market-time.util`.

### The confirm gate

Enforced server-side, in the domain — **not** as a frontend dialog.

1. `POST /broker/orders/preview` — resolve ticker → `conid`, build the `BracketPlan`, call IBKR `whatif` for margin impact and commission estimate, persist an `OrderTicket` in state `PREVIEWED` with a short TTL (suggest 2 minutes), return the plan plus costs and warnings.
2. `POST /broker/orders/:ticketId/confirm` — **the only code path that transmits.** Requires the ticket to be `PREVIEWED`, unexpired, and the request to carry a hash of the previewed plan so nothing changed underneath. Then places the bracket, handles the reply/question flow, records `SUBMITTED` plus the broker order ids.

### Safety rails — build these in Phase 1, not later

- `BROKER_TRADING_ENABLED` kill switch in config, default `false`.
- `IBKR_ENVIRONMENT` must be explicitly `live`; anything else means paper.
- Max notional and max share count as **domain invariants on `BracketPlan`**, not controller validation.
- `cOID` derived deterministically from the ticket id — gives idempotency and satisfies the 24-hour uniqueness rule.
- `BracketPlan` validates ordering: for a long, `stop < entry < target`.
- No cron may call anything that transmits. Enforce by construction: crons do not depend on `ConfirmOrderUseCase`.

---

## 5. Database

Migrations in `apps/backend/migrations/sqls/`, created with `npx db-migrate create --env dev <name> --sql-file`. Always write both up and down. UUID primary keys, `TIMESTAMP WITH TIME ZONE`, index foreign keys.

| Table                        | Purpose                                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `broker_contracts`           | `symbol → conid` cache with exchange and currency pinned. Unique on `(symbol, exchange, currency)`.                                                               |
| `broker_positions`           | Mirror snapshot: `account_id`, `conid`, `symbol`, `quantity`, `avg_cost`, `market_price`, `unrealized_pnl`, `currency`, `as_of`. Replaced wholesale on each sync. |
| `broker_order_tickets`       | Aggregate state: `id`, `status`, `symbol`, `conid`, plan fields, **`submitted_payload JSONB`** (required for the modify quirk), broker order ids, timestamps.     |
| `broker_order_ticket_events` | Append-only lifecycle audit: previewed, confirmed, submitted, acknowledged, partially filled, filled, cancelled, rejected.                                        |

---

## 6. Frontend

New `apps/frontend/src/broker/` following the shape of `apps/frontend/src/position/` (`api/`, `hooks/`, `components/`, `pages/`, `constants/query-keys.ts`).

- `pages/Portfolio.tsx` — the broker-truth position list (Phase 2).
- `components/OrderTicketModal.tsx` — entry / target / stop inputs, preview results (margin, commission, warnings), explicit confirm button (Phase 3–4).
- `components/OrderList.tsx` — open and recent orders with status (Phase 4).

Note: `apps/frontend` type-checks with `tsc -b` (project references), **not** flat `tsc --noEmit`.

---

## 7. Phases

Run the quality gate after every change: `npx tsc --noEmit && npm run lint && npm run test` (frontend: `tsc -b`).

### Phase 1 — Connectivity

- `broker` module skeleton, module wiring, tokens.
- `IbkrHttpClient` + rate limiter + error mapping.
- `BrokerSession` port; `CpGatewayBrokerSession` implementation.
- `SessionKeepaliveCron`: `/tickle` every minute, reconnect after maintenance, ntfy alert on session loss.
- `GET /broker/health` returning auth status, session age, last tickle.
- Config plumbing and all safety-rail flags.

**Done when:** the Pi holds a session across a full 24 h including IBKR's maintenance window, and the user gets a phone alert when it drops.

### Phase 2 — Read-only portfolio

- `GET /portfolio/accounts`, positions, account summary through the gateway port.
- `broker_positions` mirror table + `BrokerPositionSyncCron` (market hours + on-demand refresh).
- `GET /broker/positions`, `GET /broker/summary`.
- Frontend `Portfolio.tsx`.

**Done when:** the Portfolio page matches what IBKR shows.

> **Stop here and live on it for a couple of weeks.** This is the phase that proves the session survives daily maintenance, Pi reboots, and IBKR's quirks. It is also useful on its own. Do not build the order path on an unproven session layer.

### Phase 3 — Contract resolution + preview

- `/iserver/secdef/search` + `broker_contracts` cache, with explicit disambiguation when a symbol has multiple listings.
- `BracketPlan` entity with full validation.
- `PreviewOrderUseCase` → `whatif`. **Nothing transmits in this phase.**
- `POST /broker/orders/preview`; frontend order ticket UI showing margin and commission.

**Done when:** previewing a bracket for any Blue Star ticker returns correct margin and commission, and no order has ever reached IBKR.

### Phase 4 — Transmit, against paper only

- `ConfirmOrderUseCase`: state/TTL/hash checks, bracket array construction, reply-flow handling.
- `POST /broker/orders/:ticketId/confirm`, `DELETE /broker/orders/:ticketId`.
- `OrderStatusPollCron` + fill notifications.
- Cancel and modify (remember: modify resends the whole payload).
- Frontend order list.

**Done when:** a full bracket lifecycle — place, partial fill, target hit, stop cancelled — has been exercised end to end on the paper account.

### Phase 5 — Live

- Switch `IBKR_ENVIRONMENT=live`, flip `BROKER_TRADING_ENABLED`.
- Set conservative notional and share caps.
- Cut over to `OAuth1BrokerSession` if registration has cleared; retire the CP Gateway container.

**Done when:** one small real order has been placed and closed successfully.

### Phase 6 — Retire the `position` module

Separate effort, planned later. See §8 before starting it.

---

## 8. Known issue with Phase 6 — read before retiring `position`

IBKR is authoritative for _what is held_, but not for _why_. The `position` module's real value is its event stream — stop-loss adjustments, partial adds, and the reasoning trail that `RiskManagementDashboard` and the risk-journal tooling read.

`/iserver/account/trades` (or a Flex statement) replaces the `BUY` and `SELL` events cleanly. There is **no broker-side equivalent of a `STOP_LOSS` event** recorded before it triggered — that is Blue Star's own data, and it does not exist at IBKR.

Retiring the module therefore means either accepting that loss or keeping a thin journal alongside the broker mirror. **Decide this before Phase 6 begins, not during it.**

---

## 9. Risks

| Risk                                                 | Mitigation                                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Session eviction by the user's own TWS/mobile logins | Dedicated second username (Prerequisite 1)                                                   |
| OAuth 1.0a registration denied or delayed            | CP Gateway + IBeam is a working fallback; the REST surface is identical                      |
| IBeam login automation is unofficial and can break   | Session-loss alerting in Phase 1 means the user finds out immediately                        |
| Rate-limit ban (10-minute IP penalty box)            | Conservative token bucket, well under the ceiling                                            |
| Contract resolution picks the wrong listing          | Pin exchange + currency; explicit disambiguation, never a silent first-match                 |
| Accidental live order during development             | `IBKR_ENVIRONMENT` + `BROKER_TRADING_ENABLED`, both default-safe; paper-only through Phase 4 |
| Currency mismatch (account base vs USD equities)     | Out of scope for now — surface currency in the UI, do not convert                            |

---

## 10. Configuration

```
IBKR_ENVIRONMENT=paper              # paper | live — must be explicitly "live"
IBKR_AUTH_MODE=cp_gateway           # cp_gateway | oauth1
IBKR_BASE_URL=https://localhost:5000/v1/api   # OAuth: https://api.ibkr.com/v1/api
IBKR_ACCOUNT_ID=
BROKER_TRADING_ENABLED=false
BROKER_MAX_ORDER_NOTIONAL=
BROKER_MAX_ORDER_SHARES=

# OAuth 1.0a only
IBKR_OAUTH_CONSUMER_KEY=
IBKR_OAUTH_ACCESS_TOKEN=
IBKR_OAUTH_ACCESS_TOKEN_SECRET=
IBKR_OAUTH_SIGNATURE_KEY_PATH=
IBKR_OAUTH_ENCRYPTION_KEY_PATH=
IBKR_OAUTH_DH_PRIME=
```

---

## 11. Sources

- [IBKR Trading API Solutions](https://www.interactivebrokers.com/en/trading/ib-api.php)
- [Web API documentation](https://www.interactivebrokers.com/campus/ibkr-api-page/webapi-doc/)
- [Pacing limitations](https://www.interactivebrokers.com/docs/web-api/trading/usage-and-availability/pacing-limitations)
- [Authentication FAQ](https://www.interactivebrokers.com/docs/web-api/authentication/faq)
- [How to Code a Bracket Order in the Web API](https://www.interactivebrokers.com/campus/ibkr-quant-news/how-to-code-a-bracket-order-in-the-web-api/)
- [ibind OAuth 1.0a wiki](https://github.com/Voyz/ibind/wiki/OAuth-1.0a) — practical registration walkthrough
- [IBeam](https://github.com/voyz/ibeam) — CP Gateway login automation
- [IBKR Web API endpoint reference (community)](https://github.com/Aristidesthejust/IBKR-Web-API-Reference)
- [ib-gateway-docker](https://github.com/gnzsnz/ib-gateway-docker) — ARM64 images, if the TWS route is ever revisited
