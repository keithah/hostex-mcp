#!/usr/bin/env node
/**
 * Hostex MCP Server
 * Model Context Protocol server for Hostex property management API
 * Supports both stdio and streamable HTTP transports via Smithery
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HostexClient } from 'hostex-ts';
import {
  toToolErrorResult,
  toToolResult,
  withErrorHandling,
} from "./lib/error-handler.js";
import { logger } from "./lib/logger.js";
import { validateHostexResponse } from "./lib/response-validation.js";
import {
  dateSchema,
  paginationSchema,
  propertyIdSchema,
  reservationCodeSchema,
  stayCodeSchema,
} from "./lib/validation.js";
import type {
  CancelReservationParams,
  CancelReservationResponse,
  CreateReservationData,
  CreateReservationResponse,
  CreateReviewParams,
  CreateReviewResponse,
  CreateWebhookParams,
  CreateWebhookResponse,
  DeleteWebhookParams,
  DeleteWebhookResponse,
  GetConversationParams,
  GetConversationResponse,
  GetCustomFieldsParams,
  GetCustomFieldsResponse,
  GetListingCalendarData,
  GetListingCalendarResponse,
  ListAvailabilitiesParams,
  ListAvailabilitiesResponse,
  ListConversationsParams,
  ListConversationsResponse,
  ListCustomChannelsResponse,
  ListIncomeMethodsResponse,
  ListPropertiesParams,
  ListPropertiesResponse,
  ListReservationsParams,
  ListReservationsResponse,
  ListReviewsParams,
  ListReviewsResponse,
  ListRoomTypesParams,
  ListRoomTypesResponse,
  ListWebhooksResponse,
  SendMessageParams,
  SendMessageResponse,
  UpdateAvailabilitiesData,
  UpdateAvailabilitiesResponse,
  UpdateCustomFieldsParams,
  UpdateCustomFieldsResponse,
  UpdateListingPricesData,
  UpdateListingPricesResponse,
  UpdateLockCodeParams,
  UpdateLockCodeResponse,
} from "./types/hostex-client.js";

// Configuration schema - automatically detected by Smithery
export const configSchema = z.object({
  accessToken: z
    .string()
    .min(1, { error: "Hostex API access token is required" })
    .describe("Your Hostex API access token"),
});

export default function createServer({
  config
}: {
  config: z.infer<typeof configSchema>
}) {
  let validatedConfig: z.infer<typeof configSchema>;
  try {
    validatedConfig = configSchema.parse(config);
    logger.info({ config: { accessToken: "***" } }, "Configuration validated successfully");
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.issues.map((issue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
      });
      logger.error({ validationErrors }, "Configuration validation failed");
      throw new Error(`Configuration validation failed: ${validationErrors.join(", ")}`);
    }
    throw error;
  }

  // Create MCP server
  const server = new McpServer({
    name: "hostex-mcp",
    title: "Hostex Property Management",
    version: "0.2.0"
  });
  logger.info("Hostex MCP server initialized");

  // Initialize Hostex client with provided API token
  const hostexClient = new HostexClient({
    accessToken: validatedConfig.accessToken,
  });

  // Register list_properties tool
  server.tool(
    "hostex_list_properties",
    "List properties from your Hostex account. Returns property details including ID, title, address, channels, and location coordinates.",
    {
      ...paginationSchema,
      id: propertyIdSchema.optional().describe("Filter by specific property ID"),
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
    })
  );

  // Register list_room_types tool
  server.tool(
    "hostex_list_room_types",
    "List room types from your Hostex account",
    {
      ...paginationSchema,
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
    })
  );

  // Register list_reservations tool
  server.tool(
    "hostex_list_reservations",
    "List and search reservations with filters like status, dates, property ID, etc.",
    {
      reservation_code: reservationCodeSchema.optional(),
      property_id: propertyIdSchema.optional(),
      status: z.enum(['wait_accept', 'wait_pay', 'accepted', 'cancelled', 'denied', 'timeout']).optional(),
      start_check_in_date: dateSchema.optional().describe("Check-in start date (YYYY-MM-DD format)"),
      end_check_in_date: dateSchema.optional().describe("Check-in end date (YYYY-MM-DD format)"),
      start_check_out_date: dateSchema.optional().describe("Check-out start date (YYYY-MM-DD format)"),
      end_check_out_date: dateSchema.optional().describe("Check-out end date (YYYY-MM-DD format)"),
      order_by: z.string().optional().describe("Sort field (default: booked_at)"),
      ...paginationSchema,
    },
    withErrorHandling("hostex_list_reservations", async (params: ListReservationsParams) => {
      const result: ListReservationsResponse = await hostexClient.listReservations(
        params,
      );
      const validation = validateHostexResponse("hostex_list_reservations", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_reservations", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register create_reservation tool
  server.tool(
    "hostex_create_reservation",
    "Create a direct booking reservation in Hostex",
    {
      property_id: z.string().min(1).describe("Property ID"),
      custom_channel_id: z.number().int().positive().describe("Custom channel ID"),
      check_in_date: dateSchema.describe("Check-in date (YYYY-MM-DD)"),
      check_out_date: dateSchema.describe("Check-out date (YYYY-MM-DD)"),
      guest_name: z.string().min(1).max(200).describe("Primary guest name"),
      currency: z.string().length(3).describe("Currency code (ISO 4217, e.g., USD)"),
      rate_amount: z.number().int().min(0).describe("Total rate amount in cents"),
      commission_amount: z.number().int().min(0).describe("Commission amount in cents"),
      received_amount: z.number().int().min(0).describe("Amount received in cents"),
      income_method_id: z.number().int().positive().describe("Income method ID"),
      number_of_guests: z.number().int().min(1).optional(),
      email: z.string().optional(),
      mobile: z.string().optional(),
      remarks: z.string().optional(),
    },
    withErrorHandling("hostex_create_reservation", async (data: CreateReservationData) => {
      const result: CreateReservationResponse = await hostexClient.createReservation(
        data,
      );
      const validation = validateHostexResponse("hostex_create_reservation", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_create_reservation", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register cancel_reservation tool
  server.tool(
    "hostex_cancel_reservation",
    "Cancel a direct booking reservation (channel bookings not supported)",
    {
      reservation_code: reservationCodeSchema.describe("Reservation code to cancel"),
    },
    withErrorHandling("hostex_cancel_reservation", async ({ reservation_code }: { reservation_code: CancelReservationParams[0] }) => {
      const result: CancelReservationResponse = await hostexClient.cancelReservation(
        reservation_code,
      );
      const validation = validateHostexResponse("hostex_cancel_reservation", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_cancel_reservation", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register update_lock_code tool
  server.tool(
    "hostex_update_lock_code",
    "Update the lock code for a stay",
    {
      stay_code: stayCodeSchema.describe("Stay code"),
      lock_code: z.string().min(1).describe("New lock code"),
    },
    withErrorHandling("hostex_update_lock_code", async ({
      stay_code,
      lock_code,
    }: {
      stay_code: UpdateLockCodeParams[0];
      lock_code: UpdateLockCodeParams[1];
    }) => {
      const result: UpdateLockCodeResponse = await hostexClient.updateLockCode(
        stay_code,
        lock_code,
      );
      const validation = validateHostexResponse("hostex_update_lock_code", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_update_lock_code", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register get_custom_fields tool
  server.tool(
    "hostex_get_custom_fields",
    "Get custom fields for a stay",
    {
      stay_code: stayCodeSchema.describe("Stay code"),
    },
    withErrorHandling("hostex_get_custom_fields", async ({ stay_code }: { stay_code: GetCustomFieldsParams[0] }) => {
      const result: GetCustomFieldsResponse = await hostexClient.getCustomFields(
        stay_code,
      );
      const validation = validateHostexResponse("hostex_get_custom_fields", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_get_custom_fields", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register update_custom_fields tool
  server.tool(
    "hostex_update_custom_fields",
    "Update custom fields for a stay. Custom fields can be used in automated messages using {{cf.field_name}} syntax.",
    {
      stay_code: stayCodeSchema.describe("Stay code"),
      custom_fields: z.record(z.string(), z.any()).describe("Custom fields as key-value pairs"),
    },
    withErrorHandling("hostex_update_custom_fields", async ({
      stay_code,
      custom_fields,
    }: {
      stay_code: UpdateCustomFieldsParams[0];
      custom_fields: UpdateCustomFieldsParams[1];
    }) => {
      const result: UpdateCustomFieldsResponse = await hostexClient.updateCustomFields(
        stay_code,
        custom_fields,
      );
      const validation = validateHostexResponse("hostex_update_custom_fields", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_update_custom_fields", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register list_availabilities tool
  server.tool(
    "hostex_list_availabilities",
    "Query property availability for date ranges",
    {
      property_ids: z.string().min(1).describe("Comma-separated property IDs, max 100"),
      start_date: dateSchema.describe("Start date (YYYY-MM-DD)"),
      end_date: dateSchema.describe("End date (YYYY-MM-DD)"),
    },
    withErrorHandling("hostex_list_availabilities", async (params: ListAvailabilitiesParams) => {
      const result: ListAvailabilitiesResponse =
        await hostexClient.listAvailabilities(params);
      const validation = validateHostexResponse("hostex_list_availabilities", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_availabilities", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register update_availabilities tool
  server.tool(
    "hostex_update_availabilities",
    "Update property availability status for specific dates or date ranges",
    {
      property_ids: z.array(z.number().int().positive()).max(100).describe("Array of property IDs to update (max 100)"),
      start_date: dateSchema.optional().describe("Start date (YYYY-MM-DD)"),
      end_date: dateSchema.optional().describe("End date (YYYY-MM-DD)"),
      dates: z.array(dateSchema).optional().describe("Specific dates array (alternative to date range)"),
      available: z.boolean().describe("Availability status"),
    },
    withErrorHandling("hostex_update_availabilities", async (data: UpdateAvailabilitiesData) => {
      const result: UpdateAvailabilitiesResponse =
        await hostexClient.updateAvailabilities(data);
      const validation = validateHostexResponse("hostex_update_availabilities", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_update_availabilities", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register list_conversations tool
  server.tool(
    "hostex_list_conversations",
    "List guest conversations and inquiries",
    {
      ...paginationSchema,
    },
    withErrorHandling("hostex_list_conversations", async (params: ListConversationsParams) => {
      const result: ListConversationsResponse =
        await hostexClient.listConversations(params);
      const validation = validateHostexResponse("hostex_list_conversations", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_conversations", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register get_conversation tool
  server.tool(
    "hostex_get_conversation",
    "Get conversation details including all messages",
    {
      conversation_id: z.string().min(1).describe("Conversation ID"),
    },
    withErrorHandling("hostex_get_conversation", async ({
      conversation_id,
    }: {
      conversation_id: GetConversationParams[0];
    }) => {
      const result: GetConversationResponse = await hostexClient.getConversation(
        conversation_id,
      );
      const validation = validateHostexResponse("hostex_get_conversation", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_get_conversation", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register send_message tool
  server.tool(
    "hostex_send_message",
    "Send a text or image message to a guest",
    {
      conversation_id: z.string().min(1).describe("Conversation ID"),
      message: z.string().min(1).optional().describe("Text message content; provide message or jpeg_base64"),
      jpeg_base64: z.string().min(1).optional().describe("Base64 encoded JPEG image; provide message or jpeg_base64"),
    },
    withErrorHandling("hostex_send_message", async ({
      conversation_id,
      message,
      jpeg_base64,
    }: {
      conversation_id: SendMessageParams[0];
      message?: SendMessageParams[1]["message"];
      jpeg_base64?: SendMessageParams[1]["jpeg_base64"];
    }) => {
      const result: SendMessageResponse = await hostexClient.sendMessage(
        conversation_id,
        { message, jpeg_base64 },
      );
      const validation = validateHostexResponse("hostex_send_message", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_send_message", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register list_reviews tool
  server.tool(
    "hostex_list_reviews",
    "Query reviews with filters",
    {
      reservation_code: reservationCodeSchema.optional(),
      property_id: propertyIdSchema.optional(),
      review_status: z.string().optional(),
      start_check_out_date: dateSchema.optional().describe("Check-out start date (YYYY-MM-DD format)"),
      end_check_out_date: dateSchema.optional().describe("Check-out end date (YYYY-MM-DD format)"),
      ...paginationSchema,
    },
    withErrorHandling("hostex_list_reviews", async (params: ListReviewsParams) => {
      const result: ListReviewsResponse = await hostexClient.listReviews(params);
      const validation = validateHostexResponse("hostex_list_reviews", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_reviews", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register create_review tool
  server.tool(
    "hostex_create_review",
    "Create a review or reply for a reservation",
    {
      reservation_code: reservationCodeSchema.describe("Reservation code"),
      host_review_score: z.number().int().min(0).max(5).optional().describe("Rating score (0-5)"),
      host_review_content: z.string().optional().describe("Review comment"),
      host_reply_content: z.string().optional().describe("Reply to guest review"),
    },
    withErrorHandling("hostex_create_review", async ({
      reservation_code,
      ...data
    }: {
      reservation_code: CreateReviewParams[0];
    } & CreateReviewParams[1]) => {
      const result: CreateReviewResponse = await hostexClient.createReview(
        reservation_code,
        data,
      );
      const validation = validateHostexResponse("hostex_create_review", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_create_review", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register list_webhooks tool
  server.tool(
    "hostex_list_webhooks",
    "List configured webhooks",
    {},
    withErrorHandling("hostex_list_webhooks", async () => {
      const result: ListWebhooksResponse = await hostexClient.listWebhooks();
      const validation = validateHostexResponse("hostex_list_webhooks", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_webhooks", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register create_webhook tool
  server.tool(
    "hostex_create_webhook",
    "Create a new webhook",
    {
      url: z.string().url().describe("Webhook URL endpoint"),
    },
    withErrorHandling("hostex_create_webhook", async ({ url }: { url: CreateWebhookParams[0] }) => {
      const result: CreateWebhookResponse = await hostexClient.createWebhook(url);
      const validation = validateHostexResponse("hostex_create_webhook", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_create_webhook", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register delete_webhook tool
  server.tool(
    "hostex_delete_webhook",
    "Delete a webhook (only manageable ones)",
    {
      webhook_id: z.number().int().positive().describe("Webhook ID to delete"),
    },
    withErrorHandling("hostex_delete_webhook", async ({ webhook_id }: { webhook_id: DeleteWebhookParams[0] }) => {
      const result: DeleteWebhookResponse = await hostexClient.deleteWebhook(
        webhook_id,
      );
      const validation = validateHostexResponse("hostex_delete_webhook", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_delete_webhook", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register get_listing_calendar tool
  server.tool(
    "hostex_get_listing_calendar",
    "Get calendar information for multiple listings",
    {
      start_date: dateSchema.describe("Calendar start date (YYYY-MM-DD)"),
      end_date: dateSchema.describe("Calendar end date (YYYY-MM-DD)"),
      listings: z.array(z.object({
        channel_type: z.string().min(1),
        listing_id: z.string().min(1),
      })),
    },
    withErrorHandling("hostex_get_listing_calendar", async (data: GetListingCalendarData) => {
      const result: GetListingCalendarResponse =
        await hostexClient.getListingCalendar(data);
      const validation = validateHostexResponse("hostex_get_listing_calendar", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_get_listing_calendar", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register update_listing_prices tool
  server.tool(
    "hostex_update_listing_prices",
    "Update listing prices for channel listings",
    {
      channel_type: z.string().describe("Channel type (e.g., airbnb)"),
      listing_id: z.string().describe("Channel listing ID"),
      prices: z.array(z.object({
        date: dateSchema,
        price: z.number().min(0),
      })),
    },
    withErrorHandling("hostex_update_listing_prices", async (data: UpdateListingPricesData) => {
      const result: UpdateListingPricesResponse =
        await hostexClient.updateListingPrices(data);
      const validation = validateHostexResponse("hostex_update_listing_prices", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_update_listing_prices", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register list_custom_channels tool
  server.tool(
    "hostex_list_custom_channels",
    "Get custom channels from Custom Options Page",
    {},
    withErrorHandling("hostex_list_custom_channels", async () => {
      const result: ListCustomChannelsResponse =
        await hostexClient.listCustomChannels();
      const validation = validateHostexResponse("hostex_list_custom_channels", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_custom_channels", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  // Register list_income_methods tool
  server.tool(
    "hostex_list_income_methods",
    "Get income methods from Custom Options Page",
    {},
    withErrorHandling("hostex_list_income_methods", async () => {
      const result: ListIncomeMethodsResponse = await hostexClient.listIncomeMethods();
      const validation = validateHostexResponse("hostex_list_income_methods", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_income_methods", validation.error);
      }

      return toToolResult(validation.data);
    })
  );

  process.on("unhandledRejection", (reason) => {
    logger.error({ reason: String(reason) }, "Unhandled promise rejection");
  });

  // Return the server object (Smithery CLI handles transport)
  return server.server;
}
