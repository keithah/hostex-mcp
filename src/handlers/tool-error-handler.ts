import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { toSanitizedToolError } from "../lib/error-sanitize.js";
import { logger } from "../lib/logger.js";
import type { SanitizedToolError } from "../types/tool-contracts.js";
import { createRequestId } from "../utils/logger-utils.js";
import { toStructuredContent } from "../utils/validation-utils.js";

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

export function handleToolError(tool: string, error: unknown): CallToolResult {
  const sanitizedError: SanitizedToolError = toSanitizedToolError(tool, error);

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

export function withToolErrorHandling<TArgs>(
  tool: string,
  handler: (args: TArgs) => Promise<CallToolResult | unknown>,
): (args: TArgs) => Promise<CallToolResult> {
  return async (args: TArgs) => {
    const startTime = Date.now();
    const requestId = createRequestId();

    logger.info({ tool, requestId }, "Tool invoked");

    try {
      const result = await handler(args);
      const duration = Date.now() - startTime;

      if (typeof result === "object" && result !== null && "content" in result) {
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
      return toToolResult(result);
    } catch (error) {
      const duration = Date.now() - startTime;

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

      return handleToolError(tool, error);
    }
  };
}
