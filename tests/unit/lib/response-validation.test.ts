import { describe, expect, it } from "vitest";

import { validateHostexResponse } from "../../../src/lib/response-validation.js";

describe("response-validation", () => {
  it("returns envelope validation errors for malformed top-level payloads", () => {
    const result = validateHostexResponse("hostex_list_properties", {
      error_code: 0,
      error_msg: "ok",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected envelope validation to fail");
    }

    expect(result.error).toMatchObject({
      type: "validation_error",
      tool: "hostex_list_properties",
      category: "envelope",
    });
    expect(result.error.issues.length).toBeGreaterThan(0);
    expect(result.error.request_id).toBeUndefined();
  });

  it("returns data validation errors with request context", () => {
    const result = validateHostexResponse("hostex_list_properties", {
      request_id: "req-1",
      error_code: 0,
      error_msg: "ok",
      data: {
        properties: "not-an-array",
        total: 1,
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected data validation to fail");
    }

    expect(result.error).toMatchObject({
      type: "validation_error",
      tool: "hostex_list_properties",
      category: "data",
      request_id: "req-1",
    });
    expect(result.error.issues.some((issue) => issue.path === "properties")).toBe(true);
  });

  it("returns typed success for valid list_properties payloads", () => {
    const result = validateHostexResponse("hostex_list_properties", {
      request_id: "req-2",
      error_code: 0,
      error_msg: "ok",
      data: {
        properties: [
          {
            id: 10,
            title: "Unit 10",
            latitude: 37.332,
            longitude: "-122.031",
            channels: [
              {
                channel_type: "airbnb",
                listing_id: "listing-10",
                external_data: "kept",
              },
            ],
            extra_field: "allowed",
          },
        ],
        total: 1,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected data validation to succeed");
    }

    expect(result.tool).toBe("hostex_list_properties");
    expect(result.envelope.request_id).toBe("req-2");
    expect(result.data.total).toBe(1);
    expect(result.data.properties[0]?.id).toBe(10);
  });
});
