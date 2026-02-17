import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { toToolErrorResult, toToolResult, withErrorHandling } from "../lib/error-handler.js";
import { validateHostexResponse } from "../lib/response-validation.js";
import type {
  HostexApiClient,
  ListCustomChannelsResponse,
  ListIncomeMethodsResponse,
} from "../types/hostex-client.js";

export function registerMetaTools(server: McpServer, hostexClient: HostexApiClient): void {
  server.registerTool(
    "hostex_list_custom_channels",
    {
      description: "Get custom channels from Custom Options Page",
      inputSchema: {},
    },
    withErrorHandling("hostex_list_custom_channels", async (_params: Record<string, never>) => {
      const result: ListCustomChannelsResponse = await hostexClient.listCustomChannels();
      const validation = validateHostexResponse("hostex_list_custom_channels", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_custom_channels", validation.error);
      }

      return toToolResult(validation.data);
    }),
  );

  server.registerTool(
    "hostex_list_income_methods",
    {
      description: "Get income methods from Custom Options Page",
      inputSchema: {},
    },
    withErrorHandling("hostex_list_income_methods", async (_params: Record<string, never>) => {
      const result: ListIncomeMethodsResponse = await hostexClient.listIncomeMethods();
      const validation = validateHostexResponse("hostex_list_income_methods", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_income_methods", validation.error);
      }

      return toToolResult(validation.data);
    }),
  );
}
