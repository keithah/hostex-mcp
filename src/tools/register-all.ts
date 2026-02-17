import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { HostexClient } from "hostex-ts";
import type { z } from "zod";

import { handleToolError } from "../handlers/tool-error-handler.js";
import { sanitizedToolErrorSchema } from "../types/tool-contracts.js";
import { validate } from "../utils/validation-utils.js";
import { registerConversationTools } from "./conversations.js";
import { registerListingTools } from "./listings.js";
import { registerMetaTools } from "./meta.js";
import { registerPropertyTools } from "./properties.js";
import { registerReservationTools } from "./reservations.js";
import { registerReviewTools } from "./reviews.js";
import { registerWebhookTools } from "./webhooks.js";

export interface RegisterAllToolsDeps {
  hostexClient: HostexClient;
  handleToolError?: (tool: string, error: unknown) => CallToolResult;
  toolErrorSchema?: z.ZodTypeAny;
  validateSchema?: <TSchema extends z.ZodTypeAny>(
    schema: TSchema,
    value: unknown,
  ) => z.infer<TSchema>;
}

export function registerAllTools(server: McpServer, deps: RegisterAllToolsDeps): void {
  const toHandledToolError = deps.handleToolError ?? handleToolError;
  const toolErrorSchema = deps.toolErrorSchema ?? sanitizedToolErrorSchema;
  const validateSchema = deps.validateSchema ?? validate;

  void toHandledToolError;
  void toolErrorSchema;
  void validateSchema;

  registerPropertyTools(server, deps.hostexClient);
  registerReservationTools(server, deps.hostexClient);
  registerConversationTools(server, deps.hostexClient);
  registerReviewTools(server, deps.hostexClient);
  registerWebhookTools(server, deps.hostexClient);
  registerListingTools(server, deps.hostexClient);
  registerMetaTools(server, deps.hostexClient);
}
