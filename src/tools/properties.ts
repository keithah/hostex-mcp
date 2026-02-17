import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { handleToolError, toToolResult, withToolErrorHandling } from "../handlers/tool-error-handler.js";
import { validateHostexResponse } from "../lib/response-validation.js";
import { paginationSchema, propertyIdSchema } from "../lib/validation.js";
import type {
  HostexApiClient,
  ListPropertiesParams,
  ListPropertiesResponse,
  ListRoomTypesParams,
  ListRoomTypesResponse,
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

function toValidationErrorResult(
  error: unknown,
  sharedDeps: SharedToolRegistrationDeps,
): CallToolResult {
  const sanitizedError = sharedDeps.validateSchema(
    sharedDeps.toolErrorSchema,
    error,
  ) as SanitizedToolError;

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

export function registerPropertyTools(
  server: McpServer,
  hostexClient: HostexApiClient,
  sharedDeps?: SharedToolRegistrationDeps,
): void {
  const resolvedDeps = resolveSharedDeps(sharedDeps);

  server.registerTool(
    "hostex_list_properties",
    {
      description:
        "Use when you need Hostex property records for planning or lookup workflows. Optional pagination (offset/limit) and optional id filter are supported; returns validated property list data (or a single matching property) in the Hostex response envelope.",
      inputSchema: {
        ...paginationSchema,
        id: propertyIdSchema.optional().describe("Filter by specific property ID"),
      },
    },
    withToolErrorHandling("hostex_list_properties", async (params: ListPropertiesParams = {}) => {
      try {
        const { offset, limit, id } = params;
        const result: ListPropertiesResponse = await hostexClient.listProperties({
          offset,
          limit,
          id,
        });

        const validation = validateHostexResponse("hostex_list_properties", result);
        if (!validation.ok) {
          return toValidationErrorResult(validation.error, resolvedDeps);
        }

        return toToolResult(validation.data);
      } catch (error) {
        return resolvedDeps.handleToolError("hostex_list_properties", error);
      }
    }),
  );

  server.registerTool(
    "hostex_list_room_types",
    {
      description:
        "Use when a workflow needs Hostex room-type catalog metadata. Supports optional pagination (offset/limit) and returns validated room-type entries in the standard Hostex response envelope.",
      inputSchema: {
        ...paginationSchema,
      },
    },
    withToolErrorHandling("hostex_list_room_types", async (params: ListRoomTypesParams = {}) => {
      try {
        const { offset, limit } = params;
        const result: ListRoomTypesResponse = await hostexClient.listRoomTypes({
          offset,
          limit,
        });

        const validation = validateHostexResponse("hostex_list_room_types", result);
        if (!validation.ok) {
          return toValidationErrorResult(validation.error, resolvedDeps);
        }

        return toToolResult(validation.data);
      } catch (error) {
        return resolvedDeps.handleToolError("hostex_list_room_types", error);
      }
    }),
  );
}
