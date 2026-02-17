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

export interface SharedToolRegistrationDeps {
  handleToolError: (tool: string, error: unknown) => CallToolResult;
  toolErrorSchema: z.ZodTypeAny;
  validateSchema: <TSchema extends z.ZodTypeAny>(schema: TSchema, value: unknown) => z.infer<TSchema>;
}

export function registerAllTools(server: McpServer, deps: RegisterAllToolsDeps): void {
  const sharedDeps: SharedToolRegistrationDeps = {
    handleToolError: deps.handleToolError ?? handleToolError,
    toolErrorSchema: deps.toolErrorSchema ?? sanitizedToolErrorSchema,
    validateSchema: deps.validateSchema ?? validate,
  };

  (registerPropertyTools as (...args: unknown[]) => void)(server, deps.gateway, sharedDeps);
  (registerReservationTools as (...args: unknown[]) => void)(server, deps.gateway, sharedDeps);
  (registerConversationTools as (...args: unknown[]) => void)(server, deps.gateway, sharedDeps);
  (registerReviewTools as (...args: unknown[]) => void)(server, deps.gateway, sharedDeps);
  (registerWebhookTools as (...args: unknown[]) => void)(server, deps.gateway, sharedDeps);
  (registerListingTools as (...args: unknown[]) => void)(server, deps.gateway, sharedDeps);
  (registerMetaTools as (...args: unknown[]) => void)(server, deps.gateway, sharedDeps);
}
