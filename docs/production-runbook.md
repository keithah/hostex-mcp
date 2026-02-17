# Production Runbook

This runbook is for operating `hostex-mcp` in production and validating readiness before release.

## Scope

- Deployment preflight and rollout checks
- Runtime health and readiness checks
- Metrics and incident-response entry points
- Real API validation flow

## Prerequisites

- Node.js >= 18
- Built artifacts present (`npm run build:all`)
- `HOSTEX_ACCESS_TOKEN` available for the target environment

## Pre-Deployment Checklist

1. Install dependencies and build artifacts:

```bash
npm ci
npm run build:all
```

2. Run quality and protocol checks:

```bash
npm run typecheck
npm run test
npm run test:integration -- --run
node scripts/verify-inspector-compat.ts
```

3. Run release-equivalent CI checks locally (optional but recommended):

```bash
node scripts/verify-ci-readiness.ts
```

## Real API Validation Flow

Use this flow before production changes that affect tool behavior, response validation, or transport wiring.

```bash
HOSTEX_E2E_ENABLED=true npm run test:e2e -- --run
node scripts/verify-live-api-validation.ts
node scripts/verify-client-matrix.ts
```

Expected outcomes:

- E2E matrix reports no missing tool accounting gaps.
- Live validation confirms real response acceptance and sanitized fail-closed behavior.
- Client matrix script confirms docs/commands for Claude Desktop, Poke, and standard MCP paths are aligned.

## Health and Readiness Endpoints

For HTTP-mode deployments:

- `GET /healthz`
  - Purpose: process liveness
  - Expected: `200` with `status: "ok"`

- `GET /readyz`
  - Purpose: dependency readiness against Hostex API
  - Expected healthy: `200` with `status: "ready"`
  - Expected degraded: `503` with dependency reason when Hostex is unavailable

- `GET /metrics`
  - Purpose: Prometheus scrape endpoint
  - Expected in HTTP mode: `200` text metrics payload
  - Expected in non-HTTP mode: deterministic unavailable response

Example probes:

```bash
curl -sSf http://localhost:3000/healthz
curl -sSf http://localhost:3000/readyz
curl -sSf http://localhost:3000/metrics | head -n 20
```

## Incident Triage

1. Check deployment liveness (`/healthz`).
2. Check dependency readiness (`/readyz`).
3. Check recent error volume and latency in scraped metrics.
4. Confirm Hostex token validity and account-level API access.
5. Run `node scripts/verify-live-api-validation.ts` in a safe environment to isolate API/schema regressions.

## Escalation Notes

- If `/readyz` is degraded and Hostex is down, fail closed and defer write operations.
- If validation scripts fail due to shape drift, capture sample responses and update response schema allowlists conservatively.
- If webhook workflows fail, cross-check current webhook limitations in `docs/known-limitations.md` before retry loops.
