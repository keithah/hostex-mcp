import { describe, expect, it } from "vitest";

import { parseHostexEnvelope } from "../../../src/validation/hostex-envelope.js";

describe("hostex-envelope schema", () => {
  it("parses valid envelope payloads", () => {
    const result = parseHostexEnvelope({
      request_id: "req-100",
      error_code: 0,
      error_msg: "ok",
      data: { value: 1 },
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected schema parse success");
    }

    expect(result.data.request_id).toBe("req-100");
  });

  it("rejects unknown top-level envelope keys", () => {
    const result = parseHostexEnvelope({
      request_id: "req-101",
      error_code: 0,
      error_msg: "ok",
      data: {},
      leaked: true,
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid required field types", () => {
    const result = parseHostexEnvelope({
      request_id: 123,
      error_code: "0",
      error_msg: null,
    });

    expect(result.success).toBe(false);
  });
});
