import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HostexClient } from "hostex-ts";

import { toToolErrorResult, toToolResult, withErrorHandling } from "../lib/error-handler.js";
import { validateHostexResponse } from "../lib/response-validation.js";
import { paginationSchema, propertyIdSchema } from "../lib/validation.js";
import type {
  ListPropertiesParams,
  ListPropertiesResponse,
  ListRoomTypesParams,
  ListRoomTypesResponse,
} from "../types/hostex-client.js";

export function registerPropertyTools(server: McpServer, hostexClient: HostexClient): void {
  server.registerTool(
    "hostex_list_properties",
    {
      description:
        "List properties from your Hostex account. Returns property details including ID, title, address, channels, and location coordinates.",
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
      description: "List room types from your Hostex account",
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
