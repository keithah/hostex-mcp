import { describe, expect, it } from "vitest";

import {
  toToolErrorResult,
  toToolResult,
  withErrorHandling,
} from "../../../src/lib/error-handler.js";

function getFirstTextContent(result: { content?: Array<{ type: string; text?: string }> }) {
  const content = result.content?.find((entry) => entry.type === "text");
  return content?.text;
}

describe("error-handler", () => {
  it("returns structured object results unchanged", () => {
    const payload = { ok: true, total: 3 };

    const result = toToolResult(payload);

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual(payload);
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify(payload),
      },
    ]);
  });

  it("wraps primitive results into structured result object", () => {
    const result = toToolResult("done");

    expect(result.structuredContent).toEqual({ result: "done" });
  });

  it("returns MCP-safe text for undefined payloads", () => {
    const result = toToolResult(undefined);

    expect(result.structuredContent).toEqual({});
    expect(result.content).toEqual([
      {
        type: "text",
        text: "null",
      },
    ]);
  });

  it("returns sanitized tool errors with structured content", () => {
    const result = toToolErrorResult(
      "hostex_list_properties",
      new Error("authorization: Bearer super-secret-token"),
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      type: "runtime_error",
      tool: "hostex_list_properties",
      category: "runtime",
    });
    const content = getFirstTextContent(result);

    expect(content).toContain("[REDACTED]");
    expect(content).not.toContain("super-secret-token");
  });

  it("wraps thrown handler errors into MCP-compatible tool errors", async () => {
    const wrapped = withErrorHandling("hostex_list_properties", async () => {
      throw new Error("cookie=sessionid-123");
    });

    const result = await wrapped();

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      type: "runtime_error",
      tool: "hostex_list_properties",
    });
    expect(getFirstTextContent(result)).not.toContain("sessionid-123");
  });
});
