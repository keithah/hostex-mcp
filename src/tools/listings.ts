import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { handleToolError, toToolResult, withToolErrorHandling } from "../handlers/tool-error-handler.js";
import { validateHostexResponse } from "../lib/response-validation.js";
import { dateSchema } from "../lib/validation.js";
import type {
  HostexApiClient,
  GetListingCalendarData,
  GetListingCalendarResponse,
  UpdateListingPricesData,
  UpdateListingPricesResponse,
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

export function registerListingTools(
  server: McpServer,
  hostexClient: HostexApiClient,
  sharedDeps?: SharedToolRegistrationDeps,
): void {
  const resolvedDeps = resolveSharedDeps(sharedDeps);

  server.registerTool(
    "hostex_get_listing_calendar",
    {
      description:
        "Fetch calendar availability/pricing context for channel listings across a required date window. Provide one or more listing objects (channel_type + listing_id) and receive validated listing-calendar payload data.",
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
    withToolErrorHandling("hostex_get_listing_calendar", async (data: GetListingCalendarData) => {
      try {
        const result: GetListingCalendarResponse = await hostexClient.getListingCalendar(data);
        const validation = validateHostexResponse("hostex_get_listing_calendar", result);
        if (!validation.ok) {
          return toValidationErrorResult(validation.error, resolvedDeps);
        }

        return toToolResult(validation.data);
      } catch (error) {
        return resolvedDeps.handleToolError("hostex_get_listing_calendar", error);
      }
    }),
  );

  server.registerTool(
    "hostex_update_listing_prices",
    {
      description:
        "Push nightly price updates for a specific channel listing. Requires channel_type, listing_id, and a non-empty prices array (date + non-negative price); returns validated Hostex acknowledgement payload.",
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
    withToolErrorHandling("hostex_update_listing_prices", async (data: UpdateListingPricesData) => {
      try {
        const result: UpdateListingPricesResponse = await hostexClient.updateListingPrices(data);
        const validation = validateHostexResponse("hostex_update_listing_prices", result);
        if (!validation.ok) {
          return toValidationErrorResult(validation.error, resolvedDeps);
        }

        return toToolResult(validation.data);
      } catch (error) {
        return resolvedDeps.handleToolError("hostex_update_listing_prices", error);
      }
    }),
  );
}
