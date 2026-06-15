# Full-Stack Job Operations Application

NestJS backend (HTTP API + Socket.IO) and Next.js operator dashboard for submitting and monitoring asset jobs. Jobs progress through `PENDING → RUNNING → COMPLETED` (or `FAILED` for `asset-fault`) on internal timers, with live updates pushed over Socket.IO.


## Requirements

Before running the application, ensure the following tools are installed on your machine:

| Tool | Recommended Version |
|--------|-------------------|
| Node.js | >= 22.x |
| npm | >= 10.x |
| Docker | >= 27.x |
| Git | Latest |

### Verify installation

```bash
node -v
npm -v
docker -v
docker compose version
git --version
```

## How to run

```bash
# From project root — build and start backend (:8000) + frontend (:3000)
docker compose up -d --build

# Sanity checks
curl http://localhost:8000/health          # {"status":"ok"}
open http://localhost:3000
```

Wait until both services are listening (typically under 60 seconds).

### Local development (npm)

```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

### Makefile

```bash
make setup    # docker compose build
make run      # docker compose up -d
make fresh    # docker compose down --remove-orphans && up --build
make stop     # docker compose down
make test     # Playwright harness (19 scenarios)
```

### Run your own tests

```bash
# Backend (Jest) — validation, authz, state machine
cd backend && npm install && npm test

# Frontend (Vitest) — JobRow FAILED state
cd frontend && npm install && npm test

# Full self-assessment harness
cd harness
npm install
npx playwright install --with-deps chromium   # first run only
npx playwright test
```

**Test tokens** (`data/seed.json`):

| User  | Token                    |
|-------|--------------------------|
| Alice | `tok_alice_a1b2c3d4e5f6` |
| Bob   | `tok_bob_b2c3d4e5f6a1`  |
| Carol | `tok_carol_c3d4e5f6a1b2`|

---

## Architecture

### Backend — NestJS (port 8000)

A single NestJS process with feature modules separating routing, validation, persistence, state machine, and real-time updates:

| Module | Files | Responsibility |
|--------|-------|----------------|
| `AppConfigModule` | `config/` | Environment configuration (global) |
| `HealthModule` | `health/` | `GET /health` liveness |
| `SeedModule` | `seed/` | Load users/assets from `seed.json` |
| `AuthModule` | `auth/` | Bearer token guard + `@UserId()` decorator |
| `JobsModule` | `jobs/` | REST API, validation, in-memory persistence |
| `StateMachineModule` | `state-machine/` | Timer-driven `PENDING → RUNNING → terminal` |
| `SocketModule` | `socket/` | Socket.IO gateway, per-user rooms, `job_update` |

```
Browser ──Bearer HTTP──► JobsController ──► JobsService (in-memory)
         │                                    ▲
         └──Socket.IO ?token=──► JobsGateway │
                                              │
                               StateMachineService (setTimeout)
                                              │
                               emit job_update → room user:<user_id>
```

### Frontend — Next.js App Router (port 3000)

| Area | Location | Responsibility |
|------|----------|----------------|
| Pages | `src/app/login`, `src/app/` | Token login, dashboard |
| API client | `src/lib/api.ts` | Authenticated HTTP to backend |
| Auth | `src/lib/auth.ts` | `localStorage` token storage |
| Socket hook | `src/hooks/useJobSocket.ts` | `job_update` subscription |
| Components | `src/components/*` | Form, job list, logout (`data-testid`s per §5.4) |

---

## State machine

After `POST /api/jobs` returns `201` with `state: PENDING`:

1. **`TRANSITION_TO_RUNNING_SECONDS`** (default `1.0`) → `RUNNING` + Socket.IO emit
2. **`TRANSITION_TO_TERMINAL_SECONDS`** (default `1.0`) → `COMPLETED`, or `FAILED` if `asset_id === "asset-fault"` with `error_message: "Simulated failure (asset-fault)"`

Implemented in `StateMachineService` using `setTimeout` chains. Only these transitions are produced; terminal states do not change further.

**On restart:** jobs live in memory only. In-flight `PENDING`/`RUNNING` jobs are not resumed after a process restart — they are lost when the container stops. This is acceptable per the exercise spec.

---

## Authentication

| Channel | Mechanism |
|---------|-----------|
| HTTP `/api/*` | `Authorization: Bearer <token>` |
| Socket.IO | `?token=<bearer>` on connect to `/socket.io/` |

Tokens are static fixtures in `data/seed.json`. Invalid/missing credentials → `401` (HTTP) or disconnect (Socket.IO).

**Client:** token stored in `localStorage` (`api_token`) on `/login`. Sent on every API request and Socket.IO handshake. Cleared on logout or `401`, then redirect to `/login`.

**Authorisation:** jobs scoped per `user_id`. Cross-user reads return `404`. Socket.IO events emitted only to `user:<user_id>` room.

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Backend port |
| `SEED_DATA_PATH` | `/app/data/seed.json` | Seed data file |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed origins (HTTP + Socket.IO) |
| `TRANSITION_TO_RUNNING_SECONDS` | `1.0` | PENDING → RUNNING delay |
| `TRANSITION_TO_TERMINAL_SECONDS` | `1.0` | RUNNING → terminal delay |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL (browser) |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:8000` | Socket.IO URL (browser) |

---

## Trade-offs

**Kept simple for the 5–7h budget:**

- In-memory persistence (no DB; data lost on restart)
- Static bearer tokens (no JWT/SSO)
- No job overlap detection or cancel endpoint
- Minimal table UI, client-side rendering only
- NestJS over plain Node for modular structure, guards, DI, and WebSocket gateway decorators

**Would build next:**

- SQLite/Postgres with restart recovery for in-flight jobs
- Proper auth (JWT + refresh)
- Asset availability checks
- CI pipeline running `docker compose up` + Playwright harness

---

## Project layout

```
├── backend/              # NestJS API + Socket.IO (npm)
│   └── src/
│       ├── auth/         # AuthGuard, @UserId()
│       ├── config/       # AppConfigService
│       ├── health/       # GET /health
│       ├── jobs/         # Controller, service, validation
│       ├── seed/         # seed.json loader
│       ├── socket/       # JobsGateway (Socket.IO)
│       └── state-machine/
├── frontend/             # Next.js dashboard (npm)
├── data/seed.json        # Users, assets, tokens
├── harness/              # Playwright self-assessment (npm)
├── docker-compose.yml
├── Makefile
└── README.md
```

## Package managers

- **Backend, frontend & harness:** npm (`package-lock.json` after `npm install`)
