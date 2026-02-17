import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

import { handleToolError } from "../handlers/tool-error-handler.js";
import type { HostexApiClient } from "../types/hostex-client.js";
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
  gateway: HostexApiClient;
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

  registerPropertyTools(server, deps.gateway);
  registerReservationTools(server, deps.gateway);
  registerConversationTools(server, deps.gateway);
  registerReviewTools(server, deps.gateway);
  registerWebhookTools(server, deps.gateway);
  registerListingTools(server, deps.gateway);
  registerMetaTools(server, deps.gateway);
}
