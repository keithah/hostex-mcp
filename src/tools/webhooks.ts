import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { handleToolError, toToolResult, withToolErrorHandling } from "../handlers/tool-error-handler.js";
import { validateHostexResponse } from "../lib/response-validation.js";
import type {
  HostexApiClient,
  CreateWebhookParams,
  CreateWebhookResponse,
  DeleteWebhookParams,
  DeleteWebhookResponse,
  ListWebhooksResponse,
} from "../types/hostex-client.js";
import { sanitizedToolErrorSchema, type SanitizedToolError } from "../types/tool-contracts.js";
import { validate } from "../utils/validation-utils.js";
import type { SharedToolRegistrationDeps } from "./register-all.js";

function resolveSharedDeps(sharedDeps?: SharedToolRegistrationDeps): SharedToolRegistrationDeps {
  return {
    handleToolError: sharedDeps?.handleToolError ?? handleToolError,
    toolErrorSchema: sharedDeps?.toolErrorSchema ?? sanitizedToolErrorSchema,
    validateSchema: sharedDeps?.validateSchema ?? validate,
  };
}

function toValidationErrorResult(error: unknown, sharedDeps: SharedToolRegistrationDeps): CallToolResult {
  const sanitizedError = sharedDeps.validateSchema(sharedDeps.toolErrorSchema, error) as SanitizedToolError;

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify(sanitizedError),
      },
    ],
    structuredContent: sanitizedError,
  };
}

export function registerWebhookTools(
  server: McpServer,
  hostexClient: HostexApiClient,
  sharedDeps?: SharedToolRegistrationDeps,
): void {
  const resolvedDeps = resolveSharedDeps(sharedDeps);

  server.registerTool(
    "hostex_list_webhooks",
    {
      description:
        "List currently configured Hostex webhook subscriptions for operational auditing. Returns validated webhook records; signature-verification behavior is not exposed by this MCP server and must be handled by your receiving endpoint.",
      inputSchema: {},
    },
    withToolErrorHandling("hostex_list_webhooks", async (_params: Record<string, never>) => {
      try {
        const result: ListWebhooksResponse = await hostexClient.listWebhooks();
        const validation = validateHostexResponse("hostex_list_webhooks", result);
        if (!validation.ok) {
          return toValidationErrorResult(validation.error, resolvedDeps);
        }

        return toToolResult(validation.data);
      } catch (error) {
        return resolvedDeps.handleToolError("hostex_list_webhooks", error);
      }
    }),
  );

  server.registerTool(
    "hostex_create_webhook",
    {
      description:
        "Register a webhook callback URL with Hostex. Requires a valid HTTPS URL and returns validated webhook creation data; downstream endpoint availability and security controls are your responsibility.",
      inputSchema: {
        url: z.string().url().describe("Webhook URL endpoint"),
      },
    },
    withToolErrorHandling("hostex_create_webhook", async ({ url }: { url: CreateWebhookParams[0] }) => {
      try {
        const result: CreateWebhookResponse = await hostexClient.createWebhook(url);
        const validation = validateHostexResponse("hostex_create_webhook", result);
        if (!validation.ok) {
          return toValidationErrorResult(validation.error, resolvedDeps);
        }

        return toToolResult(validation.data);
      } catch (error) {
        return resolvedDeps.handleToolError("hostex_create_webhook", error);
      }
    }),
  );

  server.registerTool(
    "hostex_delete_webhook",
    {
      description:
        "Delete a Hostex-managed webhook by numeric webhook_id. Only deletable/manageable webhook entries can be removed by this endpoint; returns validated success/error payload from Hostex.",
      inputSchema: {
        webhook_id: z.number().int().positive().describe("Webhook ID to delete"),
      },
    },
    withToolErrorHandling("hostex_delete_webhook", async ({ webhook_id }: { webhook_id: DeleteWebhookParams[0] }) => {
      try {
        const result: DeleteWebhookResponse = await hostexClient.deleteWebhook(webhook_id);
        const validation = validateHostexResponse("hostex_delete_webhook", result);
        if (!validation.ok) {
          return toValidationErrorResult(validation.error, resolvedDeps);
        }

        return toToolResult(validation.data);
      } catch (error) {
        return resolvedDeps.handleToolError("hostex_delete_webhook", error);
      }
    }),
  );
}
