# External Integrations

**Analysis Date:** 2026-02-16

## APIs & External Services

**Hostex Property Management:**
- Hostex API v3.0.0 - Complete property management platform integration
  - SDK/Client: `hostex-ts` npm package (0.1.1)
  - Auth: `accessToken` (configured via `HOSTEX_ACCESS_TOKEN` env var)
  - Endpoints accessed through `HostexClient` in `src/index.ts` lines 29-31

**Model Context Protocol:**
- MCP Protocol - Enables Claude and other MCP clients to access Hostex tools
  - SDK/Client: `@modelcontextprotocol/sdk` (1.0.4)
  - Implementation: `McpServer` class in `src/index.ts` lines 23-27

## Hostex API Capabilities

**Properties:**
- `listProperties()` - List properties with pagination (limit max 100)
- `listRoomTypes()` - List room types with pagination

**Reservations:**
- `listReservations()` - Search with filters (status, dates, property_id, codes)
- `createReservation()` - Create direct booking reservations
- `cancelReservation()` - Cancel direct bookings (channel bookings not supported)
- Supported statuses: `wait_accept`, `wait_pay`, `accepted`, `cancelled`, `denied`, `timeout`

**Availability & Pricing:**
- `listAvailabilities()` - Query property availability for date ranges
- `updateAvailabilities()` - Block/open dates or specific date ranges
- `getListingCalendar()` - Get calendar info for multiple channel listings
- `updateListingPrices()` - Update prices for Airbnb and other channels

**Messaging & Conversations:**
- `listConversations()` - List guest conversations and inquiries
- `getConversation()` - Get conversation details with message history
- `sendMessage()` - Send text or base64-encoded JPEG images to guests

**Stays & Custom Fields:**
- `updateLockCode()` - Update lock codes for guest access
- `getCustomFields()` - Retrieve custom field values for a stay
- `updateCustomFields()` - Update custom fields (used in automated messages via `{{cf.field_name}}`)

**Reviews:**
- `listReviews()` - Query reviews with filters (property, dates, status)
- `createReview()` - Create reviews or reply to guest reviews

**Webhooks:**
- `listWebhooks()` - List configured webhooks
- `createWebhook()` - Register new webhook endpoints
- `deleteWebhook()` - Remove webhooks (manageable ones only)

**Configuration:**
- `listCustomChannels()` - Get custom channels from Custom Options Page
- `listIncomeMethods()` - Get income methods from Custom Options Page

## Data Storage

**Databases:**
- None directly managed by this server (state stored in Hostex backend)

**File Storage:**
- None configured (messages can include base64-encoded JPEG images sent to Hostex API)

**Caching:**
- None - All requests are direct to Hostex API

## Authentication & Identity

**Auth Provider:**
- Hostex API access token (custom OAuth/API token system)
- Implementation: Token-based authentication passed to `HostexClient` constructor
- Env var: `HOSTEX_ACCESS_TOKEN` (required)
- Configured via Zod schema `configSchema` in `src/index.ts` lines 13-15

**MCP Protocol Auth:**
- Handled by MCP clients (e.g., Claude Desktop passes configured env vars)
- Server exposes tools that require valid Hostex token

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, DataDog, or similar integration

**Logs:**
- Not explicitly configured - Relies on MCP client logging and Node.js console output

## CI/CD & Deployment

**Hosting:**
- Primary: Smithery platform (`https://server.smithery.ai/@keithah/hostex-mcp/mcp`)
- Also: npm registry (published as `hostex-mcp` package)
- Alternative: Claude Desktop local installation via config file

**CI Pipeline:**
- GitHub Actions workflows present:
  - `release.yml` - Release workflow
  - `check-npm-updates.yml` - Hourly checks for hostex-ts updates, auto-creates PRs

## Environment Configuration

**Required env vars:**
- `HOSTEX_ACCESS_TOKEN` - Hostex API access token (obtained from https://www.hostex.io/ account settings)

**Optional env vars:**
- None documented (all other config driven by MCP client configuration)

**Secrets location:**
- Hostex token typically stored in:
  - Claude Desktop config (`~/.config/Claude/claude_desktop_config.json` or macOS equivalent)
  - Environment variable when running via npx/npm
  - Smithery client when using hosted server

## Webhooks & Callbacks

**Incoming (Hostex → MCP):**
- Not used - This is a read/write API client, not a webhook receiver
- Hostex can send webhooks to user-configured endpoints (via `createWebhook()` tool)

**Outgoing (MCP → Hostex):**
- All MCP tools make synchronous HTTP requests to Hostex API
- Tools that trigger Hostex events:
  - `hostex_create_reservation` - Creates booking (may trigger Hostex notifications)
  - `hostex_cancel_reservation` - Cancels booking (triggers cancellation events)
  - `hostex_update_availabilities` - Updates calendar (affects synced channels)
  - `hostex_send_message` - Sends guest message (triggers Hostex messaging system)
  - `hostex_create_review` - Creates/replies to reviews (triggers review system)
  - `hostex_update_listing_prices` - Updates channel prices (syncs to Airbnb, etc.)

## Transport & Protocol

**Transports:**
- stdio: Standard input/output for local MCP clients
- shttp: Streamable HTTP for remote/web-based clients
- Both managed by Smithery CLI tooling

**MCP Server Details:**
- Server name: `hostex-mcp`
- Server title: `Hostex Property Management`
- Version: 0.2.0
- Tools exposed: 25+ (all hostex_* prefixed)

---

*Integration audit: 2026-02-16*
