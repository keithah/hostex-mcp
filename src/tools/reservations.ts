import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { toToolErrorResult, toToolResult, withErrorHandling } from "../lib/error-handler.js";
import { validateHostexResponse } from "../lib/response-validation.js";
import {
  dateSchema,
  paginationSchema,
  propertyIdSchema,
  reservationCodeSchema,
  stayCodeSchema,
} from "../lib/validation.js";
import type {
  HostexApiClient,
  CancelReservationParams,
  CancelReservationResponse,
  CreateReservationData,
  CreateReservationResponse,
  GetCustomFieldsParams,
  GetCustomFieldsResponse,
  ListAvailabilitiesParams,
  ListAvailabilitiesResponse,
  ListReservationsParams,
  ListReservationsResponse,
  UpdateAvailabilitiesData,
  UpdateAvailabilitiesResponse,
  UpdateCustomFieldsParams,
  UpdateCustomFieldsResponse,
  UpdateLockCodeParams,
  UpdateLockCodeResponse,
} from "../types/hostex-client.js";

export function registerReservationTools(server: McpServer, hostexClient: HostexApiClient): void {
  server.registerTool(
    "hostex_list_reservations",
    {
      description:
        "Use to search reservation records by reservation_code, property_id, status, check-in/check-out windows, and pagination. Returns validated reservation list data; for broad date ranges, send narrow filters to reduce payload size.",
      inputSchema: {
        reservation_code: reservationCodeSchema.optional(),
        property_id: propertyIdSchema.optional(),
        status: z
          .enum(["wait_accept", "wait_pay", "accepted", "cancelled", "denied", "timeout"])
          .optional(),
        start_check_in_date: dateSchema.optional().describe("Check-in start date (YYYY-MM-DD format)"),
        end_check_in_date: dateSchema.optional().describe("Check-in end date (YYYY-MM-DD format)"),
        start_check_out_date: dateSchema.optional().describe("Check-out start date (YYYY-MM-DD format)"),
        end_check_out_date: dateSchema.optional().describe("Check-out end date (YYYY-MM-DD format)"),
        order_by: z.string().optional().describe("Sort field (default: booked_at)"),
        ...paginationSchema,
      },
    },
    withErrorHandling("hostex_list_reservations", async (params: ListReservationsParams) => {
      const result: ListReservationsResponse = await hostexClient.listReservations(params);
      const validation = validateHostexResponse("hostex_list_reservations", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_reservations", validation.error);
      }

      return toToolResult(validation.data);
    }),
  );

  server.registerTool(
    "hostex_create_reservation",
    {
      description:
        "Create a direct (custom-channel) reservation when all required booking and payment fields are available. Requires property_id, custom_channel_id, stay dates, currency, amount fields in cents, and income_method_id; returns validated creation result from Hostex.",
      inputSchema: {
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
    },
    withErrorHandling("hostex_create_reservation", async (data: CreateReservationData) => {
      const result: CreateReservationResponse = await hostexClient.createReservation(data);
      const validation = validateHostexResponse("hostex_create_reservation", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_create_reservation", validation.error);
      }

      return toToolResult(validation.data);
    }),
  );

  server.registerTool(
    "hostex_cancel_reservation",
    {
      description:
        "Cancel a reservation by reservation_code for direct/custom-channel bookings only. Do not use for OTA/channel-managed bookings that Hostex does not allow this endpoint to cancel; returns validated success/error payload.",
      inputSchema: {
        reservation_code: reservationCodeSchema.describe("Reservation code to cancel"),
      },
    },
    withErrorHandling(
      "hostex_cancel_reservation",
      async ({ reservation_code }: { reservation_code: CancelReservationParams[0] }) => {
        const result: CancelReservationResponse = await hostexClient.cancelReservation(reservation_code);
        const validation = validateHostexResponse("hostex_cancel_reservation", result);
        if (!validation.ok) {
          return toToolErrorResult("hostex_cancel_reservation", validation.error);
        }

        return toToolResult(validation.data);
      },
    ),
  );

  server.registerTool(
    "hostex_update_lock_code",
    {
      description:
        "Update smart-lock access code for a specific stay_code. Requires non-empty lock_code string and returns validated Hostex acknowledgement payload.",
      inputSchema: {
        stay_code: stayCodeSchema.describe("Stay code"),
        lock_code: z.string().min(1).describe("New lock code"),
      },
    },
    withErrorHandling(
      "hostex_update_lock_code",
      async ({
        stay_code,
        lock_code,
      }: {
        stay_code: UpdateLockCodeParams[0];
        lock_code: UpdateLockCodeParams[1];
      }) => {
        const result: UpdateLockCodeResponse = await hostexClient.updateLockCode(stay_code, lock_code);
        const validation = validateHostexResponse("hostex_update_lock_code", result);
        if (!validation.ok) {
          return toToolErrorResult("hostex_update_lock_code", validation.error);
        }

        return toToolResult(validation.data);
      },
    ),
  );

  server.registerTool(
    "hostex_get_custom_fields",
    {
      description:
        "Fetch custom field key/value data for one stay_code. Use before message templating or workflow branching that depends on stay metadata; returns validated custom-fields payload.",
      inputSchema: {
        stay_code: stayCodeSchema.describe("Stay code"),
      },
    },
    withErrorHandling("hostex_get_custom_fields", async ({ stay_code }: { stay_code: GetCustomFieldsParams[0] }) => {
      const result: GetCustomFieldsResponse = await hostexClient.getCustomFields(stay_code);
      const validation = validateHostexResponse("hostex_get_custom_fields", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_get_custom_fields", validation.error);
      }

      return toToolResult(validation.data);
    }),
  );

  server.registerTool(
    "hostex_update_custom_fields",
    {
      description:
        "Set or clear stay custom fields for one stay_code using a key/value object. Values may be heterogeneous JSON-compatible data; updated fields can be referenced in Hostex message templates (for example {{cf.field_name}}). Returns validated update response.",
      inputSchema: {
        stay_code: stayCodeSchema.describe("Stay code"),
        custom_fields: z.record(z.string(), z.any()).describe("Custom fields as key-value pairs"),
      },
    },
    withErrorHandling(
      "hostex_update_custom_fields",
      async ({
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
      },
    ),
  );

  server.registerTool(
    "hostex_list_availabilities",
    {
      description:
        "Read availability blocks for one or more properties over a date range. property_ids must be a comma-separated string and date bounds are required; returns validated day-level availability data from Hostex.",
      inputSchema: {
        property_ids: z.string().min(1).describe("Comma-separated property IDs, max 100"),
        start_date: dateSchema.describe("Start date (YYYY-MM-DD)"),
        end_date: dateSchema.describe("End date (YYYY-MM-DD)"),
      },
    },
    withErrorHandling("hostex_list_availabilities", async (params: ListAvailabilitiesParams) => {
      const result: ListAvailabilitiesResponse = await hostexClient.listAvailabilities(params);
      const validation = validateHostexResponse("hostex_list_availabilities", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_availabilities", validation.error);
      }

      return toToolResult(validation.data);
    }),
  );

  server.registerTool(
    "hostex_update_availabilities",
    {
      description:
        "Open or block inventory for up to 100 properties in a single call. Provide either a start_date/end_date range or explicit dates array plus available boolean; returns validated Hostex acknowledgement payload.",
      inputSchema: {
        property_ids: z.array(z.number().int().positive()).max(100).describe("Array of property IDs to update (max 100)"),
        start_date: dateSchema.optional().describe("Start date (YYYY-MM-DD)"),
        end_date: dateSchema.optional().describe("End date (YYYY-MM-DD)"),
        dates: z.array(dateSchema).optional().describe("Specific dates array (alternative to date range)"),
        available: z.boolean().describe("Availability status"),
      },
    },
    withErrorHandling("hostex_update_availabilities", async (data: UpdateAvailabilitiesData) => {
      const result: UpdateAvailabilitiesResponse = await hostexClient.updateAvailabilities(data);
      const validation = validateHostexResponse("hostex_update_availabilities", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_update_availabilities", validation.error);
      }

      return toToolResult(validation.data);
    }),
  );
}
