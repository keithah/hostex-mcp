import { describe, expect, it } from "vitest";

import { toolSchemaMap } from "../../../src/validation/hostex-data-schemas.js";

describe("hostex-data-schemas", () => {
  it("accepts known list_properties shape variance", () => {
    const result = toolSchemaMap.hostex_list_properties.safeParse({
      properties: [
        {
          id: 1,
          title: "Main Unit",
          longitude: -122.1,
          latitude: "37.3",
          channels: [
            {
              channel_type: "airbnb",
              listing_id: "abc",
              external_field: "allowed",
            },
          ],
          extra_property_field: true,
        },
      ],
      total: 1,
    });

    expect(result.success).toBe(true);
  });

  it("fails closed for invalid list_properties payloads", () => {
    const missingRequired = toolSchemaMap.hostex_list_properties.safeParse({
      properties: [
        {
          id: 1,
          channels: [],
        },
      ],
      total: -1,
    });

    expect(missingRequired.success).toBe(false);
  });

  it("allows only defined empty-data shapes for mutation tools", () => {
    const undef = toolSchemaMap.hostex_cancel_reservation.safeParse(undefined);
    const nul = toolSchemaMap.hostex_cancel_reservation.safeParse(null);
    const emptyObject = toolSchemaMap.hostex_cancel_reservation.safeParse({});
    const nonEmptyObject = toolSchemaMap.hostex_cancel_reservation.safeParse({ ok: true });

    expect(undef.success).toBe(true);
    expect(nul.success).toBe(true);
    expect(emptyObject.success).toBe(true);
    expect(nonEmptyObject.success).toBe(false);
  });

  it("rejects unknown reservation status values", () => {
    const result = toolSchemaMap.hostex_list_reservations.safeParse({
      reservations: [
        {
          reservation_code: "res-1",
          stay_code: "stay-1",
          property_id: 1,
          channel_type: "airbnb",
          status: "pending",
          check_in_date: "2026-01-01",
          check_out_date: "2026-01-02",
        },
      ],
      total: 1,
    });

    expect(result.success).toBe(false);
  });

  it("accepts live update_custom_fields success payload shape", () => {
    const result = toolSchemaMap.hostex_update_custom_fields.safeParse({
      custom_fields: {
        mcp_e2e_cleanup: "set-123456",
      },
      updated_at: "2026-02-17T00:00:00Z",
    });
    const clearResult = toolSchemaMap.hostex_update_custom_fields.safeParse({
      custom_fields: [],
    });

    expect(result.success).toBe(true);
    expect(clearResult.success).toBe(true);
  });

  it("fails closed for malformed update_custom_fields payloads", () => {
    const missingCustomFields = toolSchemaMap.hostex_update_custom_fields.safeParse({
      updated_at: "2026-02-17T00:00:00Z",
    });
    const invalidCustomFieldsType = toolSchemaMap.hostex_update_custom_fields.safeParse({
      custom_fields: ["not", "an", "object"],
    });
    const numericCustomFields = toolSchemaMap.hostex_update_custom_fields.safeParse({
      custom_fields: 123,
    });

    expect(missingCustomFields.success).toBe(false);
    expect(invalidCustomFieldsType.success).toBe(false);
    expect(numericCustomFields.success).toBe(false);
  });
});
