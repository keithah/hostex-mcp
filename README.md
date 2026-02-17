# hostex-mcp

[![Release](https://github.com/keithah/hostex-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/keithah/hostex-mcp/actions/workflows/release.yml)
[![Check hostex-ts Updates](https://github.com/keithah/hostex-mcp/actions/workflows/check-npm-updates.yml/badge.svg)](https://github.com/keithah/hostex-mcp/actions/workflows/check-npm-updates.yml)
[![Smithery](https://smithery.ai/badge/@keithah/hostex-mcp)](https://smithery.ai/server/@keithah/hostex-mcp)

Model Context Protocol server for the Hostex property-management API. It exposes 22 tools for property, reservation, availability, messaging, review, listing, and webhook workflows so MCP clients can automate vacation-rental operations.

## What You Get

- 22 validated Hostex MCP tools with sanitized, fail-closed error behavior.
- Dual transport support: stdio (desktop clients) and streamable HTTP (remote clients).
- Production-focused resilience behavior (retry, throttle, timeout) in the gateway layer.
- Operational endpoints: `healthz`, `readyz`, and `metrics`.

## Requirements

- Node.js >= 18
- npm
- Hostex account with API access token
- MCP-compatible client (Claude Desktop, Poke, MCP Inspector, or equivalent)

## Setup

### 1) Get a Hostex API token

Create or copy your token in Hostex account/API settings, then keep it available as `HOSTEX_ACCESS_TOKEN`.

### 2) Install the server

Smithery install (recommended):

```bash
npx -y @smithery/cli install @keithah/hostex-mcp --client claude
```

Hosted endpoint (for remote MCP clients):

```text
https://server.smithery.ai/@keithah/hostex-mcp/mcp
```

### 3) Configure an MCP client

Claude Desktop example (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `~/.config/Claude/claude_desktop_config.json` on Linux):

```json
{
  "mcpServers": {
    "hostex": {
      "command": "npx",
      "args": ["-y", "hostex-mcp"],
      "env": {
        "HOSTEX_ACCESS_TOKEN": "your_hostex_api_token"
      }
    }
  }
}
```

Smithery-hosted variant:

```json
{
  "mcpServers": {
    "hostex": {
      "url": "https://server.smithery.ai/@keithah/hostex-mcp/mcp",
      "env": {
        "HOSTEX_ACCESS_TOKEN": "your_hostex_api_token"
      }
    }
  }
}
```

## Configuration

`configSchema` currently requires one field:

- `accessToken` (required): Hostex API access token

Optional runtime environment:

- `LOG_LEVEL`: defaults to `info`
- `HOSTEX_E2E_ENABLED`: set to `true` to enable real-API e2e suites

## Usage

Common prompts:

- "List my Hostex properties"
- "Show reservations checking in this week"
- "Create a direct booking for property 123"
- "List webhooks and flag broken endpoints"

Core tools include:

- `hostex_list_properties`, `hostex_list_room_types`, `hostex_list_reservations`
- `hostex_create_reservation`, `hostex_cancel_reservation`, `hostex_update_custom_fields`
- `hostex_list_webhooks`, `hostex_create_webhook`, `hostex_delete_webhook`
- `hostex_get_listing_calendar`, `hostex_update_listing_prices`

See `docs/hostex-endpoints-and-constraints.md` for the full endpoint/constraint reference.

## Development Workflow

```bash
git clone https://github.com/keithah/hostex-mcp.git
cd hostex-mcp
npm install
npm run build:all
```

Validation commands:

```bash
npm run typecheck
npm run test
npm run test:integration -- --run
node scripts/verify-inspector-compat.ts
```

Real Hostex API validation (requires token):

```bash
HOSTEX_E2E_ENABLED=true npm run test:e2e -- --run
node scripts/verify-live-api-validation.ts
node scripts/verify-client-matrix.ts
```

## Operations

Operational guidance for deployments and incidents is in `docs/production-runbook.md`.

For self-hosted HTTP deployments:

- `GET /healthz` - process liveness
- `GET /readyz` - Hostex dependency readiness probe
- `GET /metrics` - Prometheus output (HTTP deployment mode only)

## Client Compatibility and Validation

Reproducible client matrix instructions are in `docs/client-validation.md` and cover:

- Claude Desktop
- Poke
- Standard MCP client paths (Inspector/stdio and streamable HTTP)

## Known Limitations

Documented Hostex behavior limits and mitigations are tracked in `docs/known-limitations.md`.

## Related Docs

- `docs/production-runbook.md`
- `docs/client-validation.md`
- `docs/known-limitations.md`
- `docs/hostex-endpoints-and-constraints.md`
- Hostex API docs: https://docs.hostex.io/

## License

MIT

## Support

- GitHub issues: https://github.com/keithah/hostex-mcp/issues
- MCP docs: https://modelcontextprotocol.io/

---

This is an unofficial community project and is not officially supported by Hostex.
