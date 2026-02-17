import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { toToolErrorResult, toToolResult, withErrorHandling } from "../lib/error-handler.js";
import { validateHostexResponse } from "../lib/response-validation.js";
import { dateSchema, paginationSchema, propertyIdSchema, reservationCodeSchema } from "../lib/validation.js";
import type {
  HostexApiClient,
  CreateReviewParams,
  CreateReviewResponse,
  ListReviewsParams,
  ListReviewsResponse,
} from "../types/hostex-client.js";

export function registerReviewTools(server: McpServer, hostexClient: HostexApiClient): void {
  server.registerTool(
    "hostex_list_reviews",
    {
      description: "Query reviews with filters",
      inputSchema: {
        reservation_code: reservationCodeSchema.optional(),
        property_id: propertyIdSchema.optional(),
        review_status: z.string().optional(),
        start_check_out_date: dateSchema.optional().describe("Check-out start date (YYYY-MM-DD format)"),
        end_check_out_date: dateSchema.optional().describe("Check-out end date (YYYY-MM-DD format)"),
        ...paginationSchema,
      },
    },
    withErrorHandling("hostex_list_reviews", async (params: ListReviewsParams) => {
      const result: ListReviewsResponse = await hostexClient.listReviews(params);
      const validation = validateHostexResponse("hostex_list_reviews", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_reviews", validation.error);
      }

      return toToolResult(validation.data);
    }),
  );

  server.registerTool(
    "hostex_create_review",
    {
      description: "Create a review or reply for a reservation",
      inputSchema: {
        reservation_code: reservationCodeSchema.describe("Reservation code"),
        host_review_score: z.number().int().min(0).max(5).optional().describe("Rating score (0-5)"),
        host_review_content: z.string().optional().describe("Review comment"),
        host_reply_content: z.string().optional().describe("Reply to guest review"),
      },
    },
    withErrorHandling(
      "hostex_create_review",
      async ({
        reservation_code,
        ...data
      }: {
        reservation_code: CreateReviewParams[0];
      } & CreateReviewParams[1]) => {
        const result: CreateReviewResponse = await hostexClient.createReview(reservation_code, data);
        const validation = validateHostexResponse("hostex_create_review", result);
        if (!validation.ok) {
          return toToolErrorResult("hostex_create_review", validation.error);
        }

        return toToolResult(validation.data);
      },
    ),
  );
}
