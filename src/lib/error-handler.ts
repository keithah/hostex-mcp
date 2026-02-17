import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { toSanitizedToolError } from "./error-sanitize.js";
import { logger } from "./logger.js";

function toStructuredContent(value: unknown): Record<string, unknown> {
  if (value === undefined) {
    return {};
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return { result: value };
}

export function toToolResult(data: unknown): CallToolResult {
  const contentText = JSON.stringify(data === undefined ? null : data);

  return {
    content: [
      {
        type: "text",
        text: contentText,
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

export function withErrorHandling<TArgs>(
  tool: string,
  handler: (args: TArgs) => Promise<CallToolResult | unknown>,
): (args: TArgs) => Promise<CallToolResult> {
  return async (args: TArgs) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 9);

    logger.info({ tool, requestId }, "Tool invoked");

    try {
      const result = await handler(args);
      const duration = Date.now() - startTime;

      if (
        typeof result === "object"
        && result !== null
        && "content" in result
      ) {
        const callToolResult = result as CallToolResult;
        logger.info(
          {
            tool,
            requestId,
            duration,
            success: callToolResult.isError !== true,
          },
          "Tool completed",
        );
        return callToolResult;
      }

      logger.info({ tool, requestId, duration, success: true }, "Tool completed");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error
        ? `Failed to execute ${tool}: ${error.message}. Please check your parameters and try again.`
        : `Failed to execute ${tool}: unknown error. Please check your parameters and try again.`;

      logger.error(
        {
          tool,
          requestId,
          duration,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Tool failed",
      );

      return {
        content: [
          {
            type: "text",
            text: errorMessage,
          },
        ],
        isError: true,
      };
    }
  };
}
