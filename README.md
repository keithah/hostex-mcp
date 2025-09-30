# hostex-mcp

[![Release](https://github.com/keithah/hostex-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/keithah/hostex-mcp/actions/workflows/release.yml)
[![Check hostex-ts Updates](https://github.com/keithah/hostex-mcp/actions/workflows/check-npm-updates.yml/badge.svg)](https://github.com/keithah/hostex-mcp/actions/workflows/check-npm-updates.yml)
[![Smithery](https://smithery.ai/badge/@keithah/hostex-mcp)](https://smithery.ai/server/@keithah/hostex-mcp)

Model Context Protocol server for the Hostex property management API. Manage your vacation rental properties, reservations, guest communications, and more through Claude and other MCP clients.

Built on [hostex-ts](https://www.npmjs.com/package/hostex-ts) - TypeScript client library for Hostex API v3.0.0.

## Features

- 🏠 **Properties** - Property and room type management
- 📅 **Reservations** - CRUD operations, custom fields, lock codes
- 📊 **Availability** - Property availability calendars
- 📋 **Listings** - Channel listings, pricing, inventory
- 💬 **Messaging** - Guest communication and messaging
- ⭐ **Reviews** - Review management and responses
- 🔗 **Webhooks** - Real-time event notifications
- ⚙️ **Utilities** - Custom channels and income methods

### Available Tools (25+)

- `hostex_list_properties` - List all properties
- `hostex_list_room_types` - List room types
- `hostex_list_reservations` - Search and filter reservations
- `hostex_create_reservation` - Create direct bookings
- `hostex_cancel_reservation` - Cancel reservations
- `hostex_update_lock_code` - Update stay lock codes
- `hostex_get_custom_fields` - Get custom field values
- `hostex_update_custom_fields` - Update custom fields
- `hostex_list_availabilities` - Check property availability
- `hostex_update_availabilities` - Block/open dates
- `hostex_list_conversations` - List guest conversations
- `hostex_get_conversation` - Get conversation details
- `hostex_send_message` - Send messages to guests
- `hostex_list_reviews` - Query reviews
- `hostex_create_review` - Leave reviews or replies
- `hostex_list_webhooks` - List configured webhooks
- `hostex_create_webhook` - Register new webhooks
- `hostex_delete_webhook` - Remove webhooks
- `hostex_get_listing_calendar` - Get listing calendars
- `hostex_update_listing_prices` - Update channel prices
- `hostex_list_custom_channels` - List custom channels
- `hostex_list_income_methods` - List income methods

## Installation

### Option 1: Via Smithery (Recommended)

Install directly from Smithery:

```bash
npx -y @smithery/cli install @keithah/hostex-mcp --client claude
```

Or add the hosted server URL to your MCP client:

```
https://server.smithery.ai/@keithah/hostex-mcp/mcp
```

When prompted, provide your Hostex API access token.

### Option 2: MCPB Package

1. Download the latest `.mcpb` file from [Releases](https://github.com/keithah/hostex-mcp/releases)
2. Double-click the file to install in your MCP client
3. Configure your Hostex API token when prompted

### Option 3: Manual Installation (Claude Desktop)

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `~/.config/Claude/claude_desktop_config.json` on Linux):

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

Or use the Smithery hosted server:

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

You need a Hostex API access token. Get yours from your Hostex account settings at https://www.hostex.io/

The server accepts configuration through the `configSchema`:

- `accessToken` (required): Your Hostex API access token

## Usage Examples

Once installed, you can ask Claude natural language questions like:

- "Show me all my Hostex properties"
- "List reservations checking in this week"
- "Block property 12345 for next weekend"
- "Send a welcome message to the guest in conversation ABC123"
- "What reviews have I received this month?"
- "Create a direct booking for property XYZ"

## Development

### Prerequisites

- Node.js >= 18
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/keithah/hostex-mcp.git
cd hostex-mcp

# Install dependencies
npm install

# Build for stdio transport
npm run build:stdio

# Build for streamable HTTP transport
npm run build:shttp

# Build both transports
npm run build:all
```

### Testing Locally

```bash
# Start dev server with Smithery
npm run dev
```

## Architecture

This MCP server uses:

- **[@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)** - MCP protocol implementation
- **[@smithery/sdk](https://www.npmjs.com/package/@smithery/sdk)** - Multi-transport support
- **[hostex-ts](https://www.npmjs.com/package/hostex-ts)** - Hostex API client library
- **[zod](https://www.npmjs.com/package/zod)** - Schema validation

### Transports

The server supports two transport protocols:

- **stdio** - Standard input/output (for local MCP clients like Claude Desktop)
- **shttp** - Streamable HTTP (for remote/web-based MCP clients)

Both are built using [Smithery](https://smithery.ai) for seamless multi-transport support.

## Automatic Updates

This repository includes a GitHub Actions workflow that:

1. Checks hourly for new releases of `hostex-ts` on npm
2. Automatically creates a PR to update the dependency
3. Bumps the patch version
4. Rebuilds the MCP bundles

When you merge the PR and create a new release tag, the MCPB package is automatically built and attached to the GitHub release.

## Requirements

- Node.js >= 18
- MCP-compatible client (Claude Desktop v0.10.0+, or any MCP client)
- Hostex account with API access

## Documentation

- [Hostex API Documentation](https://docs.hostex.io/)
- [hostex-ts npm package](https://www.npmjs.com/package/hostex-ts)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## License

MIT

## Author

Keith Hadfield

## Support

- **Issues**: [GitHub Issues](https://github.com/keithah/hostex-mcp/issues)
- **Hostex API**: https://docs.hostex.io/
- **MCP Documentation**: https://modelcontextprotocol.io/

---

**Note**: This is an unofficial community project and is not officially supported by Hostex.