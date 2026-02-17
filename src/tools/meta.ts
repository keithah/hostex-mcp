import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { handleToolError, toToolResult, withToolErrorHandling } from "../handlers/tool-error-handler.js";
import { validateHostexResponse } from "../lib/response-validation.js";
import type {
  HostexApiClient,
  ListCustomChannelsResponse,
  ListIncomeMethodsResponse,
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

export function registerMetaTools(
  server: McpServer,
  hostexClient: HostexApiClient,
  sharedDeps?: SharedToolRegistrationDeps,
): void {
  const resolvedDeps = resolveSharedDeps(sharedDeps);

  server.registerTool(
    "hostex_list_custom_channels",
    {
      description:
        "List custom channel definitions configured in Hostex custom options. Use to discover valid custom_channel_id values before creating direct reservations; returns validated channel metadata.",
      inputSchema: {},
    },
    withToolErrorHandling("hostex_list_custom_channels", async (_params: Record<string, never>) => {
      try {
        const result: ListCustomChannelsResponse = await hostexClient.listCustomChannels();
        const validation = validateHostexResponse("hostex_list_custom_channels", result);
        if (!validation.ok) {
          return toValidationErrorResult(validation.error, resolvedDeps);
        }

        return toToolResult(validation.data);
      } catch (error) {
        return resolvedDeps.handleToolError("hostex_list_custom_channels", error);
      }
    }),
  );

  server.registerTool(
    "hostex_list_income_methods",
    {
      description:
        "List income/payment methods configured in Hostex custom options. Use to discover valid income_method_id values required by reservation creation flows; returns validated method metadata.",
      inputSchema: {},
    },
    withToolErrorHandling("hostex_list_income_methods", async (_params: Record<string, never>) => {
      try {
        const result: ListIncomeMethodsResponse = await hostexClient.listIncomeMethods();
        const validation = validateHostexResponse("hostex_list_income_methods", result);
        if (!validation.ok) {
          return toValidationErrorResult(validation.error, resolvedDeps);
        }

        return toToolResult(validation.data);
      } catch (error) {
        return resolvedDeps.handleToolError("hostex_list_income_methods", error);
      }
    }),
  );
}
