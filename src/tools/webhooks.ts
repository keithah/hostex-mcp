import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { toToolErrorResult, toToolResult, withErrorHandling } from "../lib/error-handler.js";
import { validateHostexResponse } from "../lib/response-validation.js";
import type {
  HostexApiClient,
  CreateWebhookParams,
  CreateWebhookResponse,
  DeleteWebhookParams,
  DeleteWebhookResponse,
  ListWebhooksResponse,
} from "../types/hostex-client.js";

export function registerWebhookTools(server: McpServer, hostexClient: HostexApiClient): void {
  server.registerTool(
    "hostex_list_webhooks",
    {
      description:
        "List currently configured Hostex webhook subscriptions for operational auditing. Returns validated webhook records; signature-verification behavior is not exposed by this MCP server and must be handled by your receiving endpoint.",
      inputSchema: {},
    },
    withErrorHandling("hostex_list_webhooks", async (_params: Record<string, never>) => {
      const result: ListWebhooksResponse = await hostexClient.listWebhooks();
      const validation = validateHostexResponse("hostex_list_webhooks", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_webhooks", validation.error);
      }

      return toToolResult(validation.data);
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
    withErrorHandling("hostex_create_webhook", async ({ url }: { url: CreateWebhookParams[0] }) => {
      const result: CreateWebhookResponse = await hostexClient.createWebhook(url);
      const validation = validateHostexResponse("hostex_create_webhook", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_create_webhook", validation.error);
      }

      return toToolResult(validation.data);
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
    withErrorHandling("hostex_delete_webhook", async ({ webhook_id }: { webhook_id: DeleteWebhookParams[0] }) => {
      const result: DeleteWebhookResponse = await hostexClient.deleteWebhook(webhook_id);
      const validation = validateHostexResponse("hostex_delete_webhook", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_delete_webhook", validation.error);
      }

      return toToolResult(validation.data);
    }),
  );
}
