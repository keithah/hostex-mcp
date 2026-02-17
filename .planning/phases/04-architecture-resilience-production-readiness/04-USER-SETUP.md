# Phase 04: User Setup Required

**Generated:** 2026-02-17
**Phase:** 04-architecture-resilience-production-readiness
**Status:** Incomplete

Complete these items for real Hostex API validation and client-matrix verification.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `HOSTEX_ACCESS_TOKEN` | Hostex account settings/API token page | `.env` or client runtime env |

## Account Setup

- [ ] **Confirm Hostex account token is active**
  - URL: https://app.hostex.io/
  - Skip if: Existing API token is already valid for target account

## Dashboard Configuration

- [ ] **Enable API access for integration token**
  - Location: Hostex account settings -> API/token configuration
  - Set to: Token has required read/write scopes for tools you plan to validate
  - Notes: Use least privilege; avoid sharing production admin tokens in local dev

## Verification

After completing setup, verify with:

```bash
HOSTEX_E2E_ENABLED=true npm run test:e2e -- --run
node scripts/verify-live-api-validation.ts
node scripts/verify-client-matrix.ts
```

Expected results:
- E2E suite runs (not fully skipped by missing token)
- Live API validation script returns success
- Client matrix verification script passes

---

**Once all items complete:** Mark status as "Complete" at top of file.
