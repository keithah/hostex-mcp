import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { handleToolError, toToolResult, withToolErrorHandling } from "../handlers/tool-error-handler.js";
import { validateHostexResponse } from "../lib/response-validation.js";
import { dateSchema, paginationSchema, propertyIdSchema, reservationCodeSchema } from "../lib/validation.js";
import type {
  HostexApiClient,
  CreateReviewParams,
  CreateReviewResponse,
  ListReviewsParams,
  ListReviewsResponse,
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

export function registerReviewTools(
  server: McpServer,
  hostexClient: HostexApiClient,
  sharedDeps?: SharedToolRegistrationDeps,
): void {
  const resolvedDeps = resolveSharedDeps(sharedDeps);

  server.registerTool(
    "hostex_list_reviews",
    {
      description:
        "Query host and guest review records with optional reservation/property/date/status filters plus pagination. Use for reputation monitoring workflows and return validated review-list payloads.",
      inputSchema: {
        reservation_code: reservationCodeSchema.optional(),
        property_id: propertyIdSchema.optional(),
        review_status: z.string().optional(),
        start_check_out_date: dateSchema.optional().describe("Check-out start date (YYYY-MM-DD format)"),
        end_check_out_date: dateSchema.optional().describe("Check-out end date (YYYY-MM-DD format)"),
        ...paginationSchema,
      },
    },
    withToolErrorHandling("hostex_list_reviews", async (params: ListReviewsParams) => {
      try {
        const result: ListReviewsResponse = await hostexClient.listReviews(params);
        const validation = validateHostexResponse("hostex_list_reviews", result);
        if (!validation.ok) {
          return toValidationErrorResult(validation.error, resolvedDeps);
        }

        return toToolResult(validation.data);
      } catch (error) {
        return resolvedDeps.handleToolError("hostex_list_reviews", error);
      }
    }),
  );

  server.registerTool(
    "hostex_create_review",
    {
      description:
        "Create or update host review content for a reservation_code, including score, review text, or host reply text. Provide only fields you intend to publish and expect a validated Hostex acknowledgement response.",
      inputSchema: {
        reservation_code: reservationCodeSchema.describe("Reservation code"),
        host_review_score: z.number().int().min(0).max(5).optional().describe("Rating score (0-5)"),
        host_review_content: z.string().optional().describe("Review comment"),
        host_reply_content: z.string().optional().describe("Reply to guest review"),
      },
    },
    withToolErrorHandling(
      "hostex_create_review",
      async ({
        reservation_code,
        ...data
      }: {
        reservation_code: CreateReviewParams[0];
      } & CreateReviewParams[1]) => {
        try {
          const result: CreateReviewResponse = await hostexClient.createReview(reservation_code, data);
          const validation = validateHostexResponse("hostex_create_review", result);
          if (!validation.ok) {
            return toValidationErrorResult(validation.error, resolvedDeps);
          }

          return toToolResult(validation.data);
        } catch (error) {
          return resolvedDeps.handleToolError("hostex_create_review", error);
        }
      },
    ),
  );
}
