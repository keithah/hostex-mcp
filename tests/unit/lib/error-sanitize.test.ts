import { describe, expect, it } from "vitest";

import type { HostexResponseValidationError } from "../../../src/lib/response-validation.js";
import { toSanitizedToolError } from "../../../src/lib/error-sanitize.js";

describe("error-sanitize", () => {
  it("redacts sensitive runtime error fragments", () => {
    const error = new Error(
      "authorization: Bearer top-secret token=abcd1234 hostex-access-token:xyz cookie=session=abc raw_payload leaked",
    );
    error.stack = "Error: ignored\n at file.ts:1:1";

    const sanitized = toSanitizedToolError("hostex_list_properties", error);

    expect(sanitized).toMatchObject({
      type: "runtime_error",
      category: "runtime",
      tool: "hostex_list_properties",
    });
    expect(sanitized.message).toContain("[REDACTED]");
    expect(sanitized.message).not.toContain("top-secret");
    expect(sanitized.message).not.toContain("abcd1234");
    expect(sanitized.message).not.toContain("session=abc");
    expect(sanitized.message).not.toContain("raw_payload");
    expect(sanitized.issues).toEqual([]);
  });

  it("keeps validation metadata but sanitizes message and issues", () => {
    const validationError: HostexResponseValidationError = {
      type: "validation_error",
      tool: "hostex_list_properties",
      category: "data",
      message: "cookie=session_123 authorization=Bearer token_xyz",
      request_id: "req-123",
      issues: [
        {
          path: "payload.authorization",
          code: "invalid_type",
          message: "authorization: Bearer really-secret",
        },
        {
          path: "payload.cookie",
          code: "custom",
          message: "cookie=session-456",
        },
        {
          path: "payload.hostex-access-token",
          code: "custom",
          message: "hostex-access-token=abc",
        },
        {
          path: "payload.raw_payload",
          code: "custom",
          message: "raw_payload contains data",
        },
        {
          path: "payload.token",
          code: "custom",
          message: "https://api.hostex.io?token=value",
        },
        {
          path: "payload.extra",
          code: "custom",
          message: "should be dropped due to truncation",
        },
      ],
    };

    const sanitized = toSanitizedToolError("hostex_list_properties", validationError);

    expect(sanitized).toMatchObject({
      type: "validation_error",
      category: "validation",
      tool: "hostex_list_properties",
      request_id: "req-123",
    });
    expect(sanitized.message).toContain("[REDACTED]");
    expect(sanitized.message).not.toContain("session_123");
    expect(sanitized.issues).toHaveLength(5);
    expect(sanitized.issues[0]?.path).toContain("[REDACTED]");
    expect(sanitized.issues[0]?.message).toContain("[REDACTED]");
    expect(sanitized.issues[4]?.message).toContain("[REDACTED]");
  });
});
