import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { handleToolError, toToolResult, withToolErrorHandling } from "../handlers/tool-error-handler.js";
import { validateHostexResponse } from "../lib/response-validation.js";
import { paginationSchema } from "../lib/validation.js";
import type {
  HostexApiClient,
  GetConversationParams,
  GetConversationResponse,
  ListConversationsParams,
  ListConversationsResponse,
  SendMessageParams,
  SendMessageResponse,
} from "../types/hostex-client.js";
import { sanitizedToolErrorSchema, type SanitizedToolError } from "../types/tool-contracts.js";
import { validate } from "../utils/validation-utils.js";
import type { SharedToolRegistrationDeps } from "./register-all.js";

function resolveSharedDeps(sharedDeps?: SharedToolRegistrationDeps): SharedToolRegistrationDeps {
  return {
    handleToolError: sharedDeps?.handleToolError ?? handleToolError,
    toolErrorSchema: sharedDeps?.toolErrorSchema ?? sanitizedToolErrorSchema,
    validateSchema: sharedDeps?.validateSchema ?? validate,
  };
}

function toValidationErrorResult(error: unknown, sharedDeps: SharedToolRegistrationDeps): CallToolResult {
  const sanitizedError = sharedDeps.validateSchema(sharedDeps.toolErrorSchema, error) as SanitizedToolError;

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

export function registerConversationTools(
  server: McpServer,
  hostexClient: HostexApiClient,
  sharedDeps?: SharedToolRegistrationDeps,
): void {
  const resolvedDeps = resolveSharedDeps(sharedDeps);

  server.registerTool(
    "hostex_list_conversations",
    {
      description:
        "List guest message threads and inquiries for inbox triage workflows. Supports pagination (offset/limit) and returns validated conversation summary records.",
      inputSchema: {
        ...paginationSchema,
      },
    },
    withToolErrorHandling("hostex_list_conversations", async (params: ListConversationsParams) => {
      try {
        const result: ListConversationsResponse = await hostexClient.listConversations(params);
        const validation = validateHostexResponse("hostex_list_conversations", result);
        if (!validation.ok) {
          return toValidationErrorResult(validation.error, resolvedDeps);
        }

        return toToolResult(validation.data);
      } catch (error) {
        return resolvedDeps.handleToolError("hostex_list_conversations", error);
      }
    }),
  );

  server.registerTool(
    "hostex_get_conversation",
    {
      description:
        "Load one full conversation by conversation_id, including message history and participants as provided by Hostex. Use after listing conversations when detailed context is needed before replying.",
      inputSchema: {
        conversation_id: z.string().min(1).describe("Conversation ID"),
      },
    },
    withToolErrorHandling("hostex_get_conversation", async ({ conversation_id }: { conversation_id: GetConversationParams[0] }) => {
      try {
        const result: GetConversationResponse = await hostexClient.getConversation(conversation_id);
        const validation = validateHostexResponse("hostex_get_conversation", result);
        if (!validation.ok) {
          return toValidationErrorResult(validation.error, resolvedDeps);
        }

        return toToolResult(validation.data);
      } catch (error) {
        return resolvedDeps.handleToolError("hostex_get_conversation", error);
      }
    }),
  );

  server.registerTool(
    "hostex_send_message",
    {
      description:
        "Send a guest message to an existing conversation_id. Provide either message text, jpeg_base64 image data, or both; returns validated Hostex send result and should be used only with known active conversation IDs.",
      inputSchema: {
        conversation_id: z.string().min(1).describe("Conversation ID"),
        message: z.string().min(1).optional().describe("Text message content; provide message or jpeg_base64"),
        jpeg_base64: z.string().min(1).optional().describe("Base64 encoded JPEG image; provide message or jpeg_base64"),
      },
    },
    withToolErrorHandling(
      "hostex_send_message",
      async ({
        conversation_id,
        message,
        jpeg_base64,
      }: {
        conversation_id: SendMessageParams[0];
        message?: SendMessageParams[1]["message"];
        jpeg_base64?: SendMessageParams[1]["jpeg_base64"];
      }) => {
        try {
          const result: SendMessageResponse = await hostexClient.sendMessage(conversation_id, {
            message,
            jpeg_base64,
          });
          const validation = validateHostexResponse("hostex_send_message", result);
          if (!validation.ok) {
            return toValidationErrorResult(validation.error, resolvedDeps);
          }

          return toToolResult(validation.data);
        } catch (error) {
          return resolvedDeps.handleToolError("hostex_send_message", error);
        }
      },
    ),
  );
}
