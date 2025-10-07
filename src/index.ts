#!/usr/bin/env node
/**
 * Hostex MCP Server
 * Model Context Protocol server for Hostex property management API
 * Supports both stdio and streamable HTTP transports via Smithery
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HostexClient } from 'hostex-ts';

// Configuration schema - automatically detected by Smithery
// All fields are optional to allow Smithery scanning, but accessToken is required for actual usage
export const configSchema = z.object({
  accessToken: z.string().optional().describe("Your Hostex API access token (required)"),
  // TEMPORARILY DISABLED FOR DEBUGGING
  // email: z.string().optional().describe("Hostex account email (optional, required for review posting)"),
  // password: z.string().optional().describe("Hostex account password (optional, required for review posting)"),
});

export default async function createServer({
  config
}: {
  config: z.infer<typeof configSchema>
}) {
  // Create MCP server
  const server = new McpServer({
    name: "hostex-mcp",
    title: "Hostex Property Management",
    version: "0.2.0"
  });

  // Lazy initialization of Hostex client - only create when accessToken is available
  let hostexClient: HostexClient | null = null;
  const getHostexClient = () => {
    if (!config.accessToken) {
      throw new Error('accessToken is required. Please configure your Hostex API access token.');
    }
    if (!hostexClient) {
      hostexClient = new HostexClient({
        accessToken: config.accessToken,
      });
    }
    return hostexClient;
  };

  // Helper function to check if accessToken is configured
  const requireAccessToken = () => {
    if (!config.accessToken) {
      throw new Error('accessToken is required. Please configure your Hostex API access token.');
    }
  };

  // Track login state for review posting
  // let isLoggedIn = false;

  // Login if email and password are provided
  // TEMPORARILY DISABLED FOR DEBUGGING
  // if (config.email && config.password && config.accessToken) {
  //   try {
  //     await getHostexClient().login({
  //       account: config.email,
  //       password: config.password,
  //     });
  //     console.error('✓ Logged in to Hostex successfully');
  //     isLoggedIn = true;
  //   } catch (error) {
  //     console.error('⚠️  Hostex login failed:', error instanceof Error ? error.message : error);
  //     console.error('   Review posting will not be available');
  //   }
  // }

  // Register list_properties tool
  server.tool(
    "hostex_list_properties",
    "List properties from your Hostex account. Returns property details including ID, title, address, channels, and location coordinates.",
    {
      offset: z.number().optional().describe("Starting point for results (default: 0)"),
      limit: z.number().optional().describe("Maximum results to return, max 100 (default: 20)"),
      id: z.number().optional().describe("Filter by specific property ID"),
    },
    async ({ offset, limit, id }) => {
      requireAccessToken();
      const result = await getHostexClient().listProperties({ offset, limit, id });
      return result.data;
    }
  );

  // Register list_room_types tool
  server.tool(
    "hostex_list_room_types",
    "List room types from your Hostex account",
    {
      offset: z.number().optional().describe("Starting point (default: 0)"),
      limit: z.number().optional().describe("Max results, max 100 (default: 20)"),
    },
    async ({ offset, limit }) => {
      requireAccessToken();
      const result = await getHostexClient().listRoomTypes({ offset, limit });
      return result.data;
    }
  );

  // Register list_reservations tool
  server.tool(
    "hostex_list_reservations",
    "List and search reservations with filters like status, dates, property ID, etc.",
    {
      reservation_code: z.string().optional(),
      property_id: z.number().optional(),
      status: z.enum(['wait_accept', 'wait_pay', 'accepted', 'cancelled', 'denied', 'timeout']).optional(),
      start_check_in_date: z.string().optional().describe("YYYY-MM-DD format"),
      end_check_in_date: z.string().optional().describe("YYYY-MM-DD format"),
      start_check_out_date: z.string().optional().describe("YYYY-MM-DD format"),
      end_check_out_date: z.string().optional().describe("YYYY-MM-DD format"),
      order_by: z.string().optional().describe("Sort field (default: booked_at)"),
      offset: z.number().optional(),
      limit: z.number().optional(),
    },
    async (params) => {
      requireAccessToken();
      const result = await getHostexClient().listReservations(params as any);
      return result.data;
    }
  );

  // Register create_reservation tool
  server.tool(
    "hostex_create_reservation",
    "Create a direct booking reservation in Hostex",
    {
      property_id: z.string().describe("Property ID"),
      custom_channel_id: z.number().describe("Custom channel ID"),
      check_in_date: z.string().describe("Check-in date (YYYY-MM-DD)"),
      check_out_date: z.string().describe("Check-out date (YYYY-MM-DD)"),
      guest_name: z.string().describe("Primary guest name"),
      currency: z.string().describe("Currency code (e.g., USD)"),
      rate_amount: z.number().describe("Total rate amount in cents"),
      commission_amount: z.number().describe("Commission amount in cents"),
      received_amount: z.number().describe("Amount received in cents"),
      income_method_id: z.number().describe("Income method ID"),
      number_of_guests: z.number().optional(),
      email: z.string().optional(),
      mobile: z.string().optional(),
      remarks: z.string().optional(),
    },
    async (data) => {
      requireAccessToken();
      const result = await getHostexClient().createReservation(data as any);
      return result.data;
    }
  );

  // Register cancel_reservation tool
  server.tool(
    "hostex_cancel_reservation",
    "Cancel a direct booking reservation (channel bookings not supported)",
    {
      reservation_code: z.string().describe("Reservation code to cancel"),
    },
    async ({ reservation_code }) => {
      requireAccessToken();
      const result = await getHostexClient().cancelReservation(reservation_code);
      return result;
    }
  );

  // Register update_lock_code tool
  server.tool(
    "hostex_update_lock_code",
    "Update the lock code for a stay",
    {
      stay_code: z.string().describe("Stay code"),
      lock_code: z.string().describe("New lock code"),
    },
    async ({ stay_code, lock_code }) => {
      requireAccessToken();
      const result = await getHostexClient().updateLockCode(stay_code, lock_code);
      return result;
    }
  );

  // Register get_custom_fields tool
  server.tool(
    "hostex_get_custom_fields",
    "Get custom fields for a stay",
    {
      stay_code: z.string().describe("Stay code"),
    },
    async ({ stay_code }) => {
      requireAccessToken();
      const result = await getHostexClient().getCustomFields(stay_code);
      return result.data;
    }
  );

  // Register update_custom_fields tool
  server.tool(
    "hostex_update_custom_fields",
    "Update custom fields for a stay. Custom fields can be used in automated messages using {{cf.field_name}} syntax.",
    {
      stay_code: z.string().describe("Stay code"),
      custom_fields: z.record(z.any()).describe("Custom fields as key-value pairs"),
    },
    async ({ stay_code, custom_fields }) => {
      requireAccessToken();
      const result = await getHostexClient().updateCustomFields(stay_code, custom_fields);
      return result;
    }
  );

  // Register list_availabilities tool
  server.tool(
    "hostex_list_availabilities",
    "Query property availability for date ranges",
    {
      property_ids: z.string().describe("Comma-separated property IDs (max 100)"),
      start_date: z.string().describe("Start date (YYYY-MM-DD)"),
      end_date: z.string().describe("End date (YYYY-MM-DD)"),
    },
    async (params) => {
      requireAccessToken();
      const result = await getHostexClient().listAvailabilities(params);
      return result.data;
    }
  );

  // Register update_availabilities tool
  server.tool(
    "hostex_update_availabilities",
    "Update property availability status for specific dates or date ranges",
    {
      property_ids: z.array(z.number()).describe("Array of property IDs to update"),
      start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
      dates: z.array(z.string()).optional().describe("Specific dates array (alternative to date range)"),
      available: z.boolean().describe("Availability status"),
    },
    async (data) => {
      requireAccessToken();
      const result = await getHostexClient().updateAvailabilities(data as any);
      return result;
    }
  );

  // Register list_conversations tool
  server.tool(
    "hostex_list_conversations",
    "List guest conversations and inquiries",
    {
      offset: z.number().optional(),
      limit: z.number().optional(),
    },
    async (params) => {
      requireAccessToken();
      const result = await getHostexClient().listConversations(params);
      return result.data;
    }
  );

  // Register get_conversation tool
  server.tool(
    "hostex_get_conversation",
    "Get conversation details including all messages",
    {
      conversation_id: z.string().describe("Conversation ID"),
    },
    async ({ conversation_id }) => {
      requireAccessToken();
      const result = await getHostexClient().getConversation(conversation_id);
      return result.data;
    }
  );

  // Register send_message tool
  server.tool(
    "hostex_send_message",
    "Send a text or image message to a guest",
    {
      conversation_id: z.string().describe("Conversation ID"),
      message: z.string().optional().describe("Text message content"),
      jpeg_base64: z.string().optional().describe("Base64 encoded JPEG image"),
    },
    async ({ conversation_id, message, jpeg_base64 }) => {
      requireAccessToken();
      const result = await getHostexClient().sendMessage(conversation_id, { message, jpeg_base64 });
      return result;
    }
  );

  // Register list_reviews tool
  server.tool(
    "hostex_list_reviews",
    "Query reviews with filters",
    {
      reservation_code: z.string().optional(),
      property_id: z.number().optional(),
      review_status: z.string().optional(),
      start_check_out_date: z.string().optional().describe("YYYY-MM-DD format"),
      end_check_out_date: z.string().optional().describe("YYYY-MM-DD format"),
      offset: z.number().optional(),
      limit: z.number().optional(),
    },
    async (params) => {
      requireAccessToken();
      const result = await getHostexClient().listReviews(params as any);
      return result.data;
    }
  );

  // Register create_review tool
  server.tool(
    "hostex_create_review",
    "Create a review or reply for a reservation",
    {
      reservation_code: z.string().describe("Reservation code"),
      host_review_score: z.number().optional().describe("Rating score (0-5)"),
      host_review_content: z.string().optional().describe("Review comment"),
      host_reply_content: z.string().optional().describe("Reply to guest review"),
    },
    async ({ reservation_code, ...data }) => {
      requireAccessToken();
      const result = await getHostexClient().createReview(reservation_code, data);
      return result;
    }
  );

  // TEMPORARILY DISABLED FOR DEBUGGING
  // Register post_guest_review tool
  // server.tool(
  //   "hostex_post_guest_review",
  //   "Post a comprehensive guest review with category ratings (requires login via email/password config). This posts reviews as they appear on the Hostex web app.",
  //   {
  //     reservation_order_code: z.string().describe("Reservation order code (e.g., 0-ABC123-xyz)"),
  //     content: z.string().describe("Review text content"),
  //     recommend: z.enum(['0', '1']).describe("Would recommend: 1 = yes, 0 = no"),
  //     overall_rating: z.enum(['1', '2', '3', '4', '5']).describe("Overall rating (1-5)"),
  //     cleanliness: z.enum(['1', '2', '3', '4', '5']).describe("Cleanliness rating (1-5)"),
  //     cleanliness_content: z.string().optional().describe("Additional cleanliness comments"),
  //     respect_of_house_rules: z.enum(['1', '2', '3', '4', '5']).describe("Respect of house rules rating (1-5)"),
  //     respect_house_rules_content: z.string().optional().describe("Additional house rules comments"),
  //     communication: z.enum(['1', '2', '3', '4', '5']).describe("Communication rating (1-5)"),
  //     communication_content: z.string().optional().describe("Additional communication comments"),
  //   },
  //   async ({ reservation_order_code, content, recommend, overall_rating, cleanliness, cleanliness_content, respect_of_house_rules, respect_house_rules_content, communication, communication_content }) => {
  //     requireAccessToken();
  //     if (!isLoggedIn) {
  //       throw new Error('Review posting requires login. Please provide email and password in config.');
  //     }
  //     const result = await getHostexClient().postGuestReview({
  //       reservation_order_code,
  //       content,
  //       category_ratings: {
  //         recommend: Number(recommend) as 0 | 1,
  //         overall_rating: Number(overall_rating) as 1 | 2 | 3 | 4 | 5,
  //         cleanliness: Number(cleanliness) as 1 | 2 | 3 | 4 | 5,
  //         cleanliness_content: cleanliness_content || '',
  //         respect_of_house_rules: Number(respect_of_house_rules) as 1 | 2 | 3 | 4 | 5,
  //         respect_house_rules_content: respect_house_rules_content || '',
  //         communication: Number(communication) as 1 | 2 | 3 | 4 | 5,
  //         communication_content: communication_content || '',
  //       }
  //     });
  //     return result;
  //   }
  // );

  // Register list_webhooks tool
  server.tool(
    "hostex_list_webhooks",
    "List configured webhooks",
    {},
    async () => {
      requireAccessToken();
      const result = await getHostexClient().listWebhooks();
      return result.data;
    }
  );

  // Register create_webhook tool
  server.tool(
    "hostex_create_webhook",
    "Create a new webhook",
    {
      url: z.string().describe("Webhook URL endpoint"),
    },
    async ({ url }) => {
      requireAccessToken();
      const result = await getHostexClient().createWebhook(url);
      return result.data;
    }
  );

  // Register delete_webhook tool
  server.tool(
    "hostex_delete_webhook",
    "Delete a webhook (only manageable ones)",
    {
      webhook_id: z.number().describe("Webhook ID to delete"),
    },
    async ({ webhook_id }) => {
      requireAccessToken();
      const result = await getHostexClient().deleteWebhook(webhook_id);
      return result;
    }
  );

  // Register get_listing_calendar tool
  server.tool(
    "hostex_get_listing_calendar",
    "Get calendar information for multiple listings",
    {
      start_date: z.string().describe("Calendar start date (YYYY-MM-DD)"),
      end_date: z.string().describe("Calendar end date (YYYY-MM-DD)"),
      listings: z.array(z.object({
        channel_type: z.string(),
        listing_id: z.string(),
      })),
    },
    async (data) => {
      requireAccessToken();
      const result = await getHostexClient().getListingCalendar(data);
      return result.data;
    }
  );

  // Register update_listing_prices tool
  server.tool(
    "hostex_update_listing_prices",
    "Update listing prices for channel listings",
    {
      channel_type: z.string().describe("Channel type (e.g., airbnb)"),
      listing_id: z.string().describe("Channel listing ID"),
      prices: z.array(z.object({
        date: z.string(),
        price: z.number(),
      })),
    },
    async (data) => {
      requireAccessToken();
      const result = await getHostexClient().updateListingPrices(data);
      return result;
    }
  );

  // Register list_custom_channels tool
  server.tool(
    "hostex_list_custom_channels",
    "Get custom channels from Custom Options Page",
    {},
    async () => {
      requireAccessToken();
      const result = await getHostexClient().listCustomChannels();
      return result.data;
    }
  );

  // Register list_income_methods tool
  server.tool(
    "hostex_list_income_methods",
    "Get income methods from Custom Options Page",
    {},
    async () => {
      requireAccessToken();
      const result = await getHostexClient().listIncomeMethods();
      return result.data;
    }
  );

  // Return the MCP server object (Smithery handles transport wrapping)
  return server;
}