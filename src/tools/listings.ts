import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HostexClient } from "hostex-ts";
import { z } from "zod";

import { toToolErrorResult, toToolResult, withErrorHandling } from "../lib/error-handler.js";
import { validateHostexResponse } from "../lib/response-validation.js";
import { dateSchema } from "../lib/validation.js";
import type {
  GetListingCalendarData,
  GetListingCalendarResponse,
  UpdateListingPricesData,
  UpdateListingPricesResponse,
} from "../types/hostex-client.js";

export function registerListingTools(server: McpServer, hostexClient: HostexClient): void {
  server.registerTool(
    "hostex_get_listing_calendar",
    {
      description: "Get calendar information for multiple listings",
      inputSchema: {
        start_date: dateSchema.describe("Calendar start date (YYYY-MM-DD)"),
        end_date: dateSchema.describe("Calendar end date (YYYY-MM-DD)"),
        listings: z.array(
          z.object({
            channel_type: z.string().min(1),
            listing_id: z.string().min(1),
          }),
        ),
      },
    },
    withErrorHandling("hostex_get_listing_calendar", async (data: GetListingCalendarData) => {
      const result: GetListingCalendarResponse = await hostexClient.getListingCalendar(data);
      const validation = validateHostexResponse("hostex_get_listing_calendar", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_get_listing_calendar", validation.error);
      }

      return toToolResult(validation.data);
    }),
  );

  server.registerTool(
    "hostex_update_listing_prices",
    {
      description: "Update listing prices for channel listings",
      inputSchema: {
        channel_type: z.string().describe("Channel type (e.g., airbnb)"),
        listing_id: z.string().describe("Channel listing ID"),
        prices: z.array(
          z.object({
            date: dateSchema,
            price: z.number().min(0),
          }),
        ),
      },
    },
    withErrorHandling("hostex_update_listing_prices", async (data: UpdateListingPricesData) => {
      const result: UpdateListingPricesResponse = await hostexClient.updateListingPrices(data);
      const validation = validateHostexResponse("hostex_update_listing_prices", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_update_listing_prices", validation.error);
      }

      return toToolResult(validation.data);
    }),
  );
}
