import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HostexClient } from "hostex-ts";

import { registerConversationTools } from "./conversations.js";
import { registerListingTools } from "./listings.js";
import { registerMetaTools } from "./meta.js";
import { registerPropertyTools } from "./properties.js";
import { registerReservationTools } from "./reservations.js";
import { registerReviewTools } from "./reviews.js";
import { registerWebhookTools } from "./webhooks.js";

export interface RegisterAllToolsDeps {
  hostexClient: HostexClient;
}

export function registerAllTools(server: McpServer, deps: RegisterAllToolsDeps): void {
  registerPropertyTools(server, deps.hostexClient);
  registerReservationTools(server, deps.hostexClient);
  registerConversationTools(server, deps.hostexClient);
  registerReviewTools(server, deps.hostexClient);
  registerWebhookTools(server, deps.hostexClient);
  registerListingTools(server, deps.hostexClient);
  registerMetaTools(server, deps.hostexClient);
}
