import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { toSanitizedToolError } from "./error-sanitize.js";

function toStructuredContent(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return { result: value };
}

export function toToolResult(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data),
      },
    ],
    structuredContent: toStructuredContent(data),
  };
}

export function toToolErrorResult(tool: string, error: unknown): CallToolResult {
  const sanitizedError = toSanitizedToolError(tool, error);

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

export function withErrorHandling<TArgs extends unknown[]>(
  tool: string,
  handler: (...args: TArgs) => Promise<CallToolResult>,
): (...args: TArgs) => Promise<CallToolResult> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
      return toToolErrorResult(tool, error);
    }
  };
}
