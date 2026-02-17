import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { toToolErrorResult, toToolResult, withErrorHandling } from "../lib/error-handler.js";
import { validateHostexResponse } from "../lib/response-validation.js";
import { paginationSchema, propertyIdSchema } from "../lib/validation.js";
import type {
  HostexApiClient,
  ListPropertiesParams,
  ListPropertiesResponse,
  ListRoomTypesParams,
  ListRoomTypesResponse,
} from "../types/hostex-client.js";

export function registerPropertyTools(server: McpServer, hostexClient: HostexApiClient): void {
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
    withErrorHandling("hostex_list_properties", async (params: ListPropertiesParams = {}) => {
      const { offset, limit, id } = params;
      const result: ListPropertiesResponse = await hostexClient.listProperties({
        offset,
        limit,
        id,
      });

      const validation = validateHostexResponse("hostex_list_properties", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_properties", validation.error);
      }

      return toToolResult(validation.data);
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
    withErrorHandling("hostex_list_room_types", async (params: ListRoomTypesParams = {}) => {
      const { offset, limit } = params;
      const result: ListRoomTypesResponse = await hostexClient.listRoomTypes({
        offset,
        limit,
      });

      const validation = validateHostexResponse("hostex_list_room_types", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_room_types", validation.error);
      }

      return toToolResult(validation.data);
    }),
  );
}
