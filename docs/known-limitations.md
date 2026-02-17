# Known Limitations

This file documents known Hostex API and client-surface limitations that operators should account for in production.

## 1) Webhook Constraints and Timeout Behavior

Observed/known behavior:

- Hostex webhook operations are quota-limited (for example, max webhook count per account).
- Webhook delivery timeout behavior is platform-controlled and can surface as delayed or dropped event processing.

Operational guidance:

- Keep webhook handlers idempotent and tolerant of retries/out-of-order delivery.
- Monitor webhook creation failures and treat quota errors as expected operational states.
- Maintain fallback polling/reconciliation for critical state transitions.

## 2) Data Sync Drift Across Hostex Surfaces

Observed/known behavior:

- Mutations can appear in one surface before another due to eventual consistency.
- Listings, availability, and reservation views may briefly disagree after writes.
- Temporary sync gaps can occur between API resources during high update volume.

Operational guidance:

- Prefer read-after-write verification with bounded retry/backoff.
- Avoid immediate destructive follow-up actions when a just-written record appears missing.
- Escalate only after retry windows expire and `/readyz` confirms Hostex dependency health.

## 3) Webhook Signature Verification Uncertainty

Current status:

- A stable, documented Hostex webhook signature-verification contract is not yet confirmed in this repository's integration surface.
- Because signature semantics are uncertain, webhook authenticity guarantees cannot be asserted here.

Operational guidance:

- Treat incoming webhook payloads as untrusted until upstream signature documentation is confirmed.
- Restrict webhook endpoints by source IP/network controls where possible.
- Record raw event metadata safely for forensic correlation, but never log tokens or sensitive headers.
- Reconcile critical webhook-triggered changes with direct Hostex API reads before irreversible actions.

## 4) Real-API Validation Dependence

Limitation:

- High-confidence behavior validation requires a real Hostex token and live account state.

Operational guidance:

- Run `HOSTEX_E2E_ENABLED=true npm run test:e2e -- --run` before release.
- Run `node scripts/verify-live-api-validation.ts` and `node scripts/verify-client-matrix.ts` as release readiness checks.
- Track skipped e2e mutation paths (risky write operations) as explicit known test coverage gaps.
