import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { toToolErrorResult, toToolResult, withErrorHandling } from "../lib/error-handler.js";
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

export function registerConversationTools(server: McpServer, hostexClient: HostexApiClient): void {
  server.registerTool(
    "hostex_list_conversations",
    {
      description:
        "List guest message threads and inquiries for inbox triage workflows. Supports pagination (offset/limit) and returns validated conversation summary records.",
      inputSchema: {
        ...paginationSchema,
      },
    },
    withErrorHandling("hostex_list_conversations", async (params: ListConversationsParams) => {
      const result: ListConversationsResponse = await hostexClient.listConversations(params);
      const validation = validateHostexResponse("hostex_list_conversations", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_list_conversations", validation.error);
      }

      return toToolResult(validation.data);
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
    withErrorHandling("hostex_get_conversation", async ({ conversation_id }: { conversation_id: GetConversationParams[0] }) => {
      const result: GetConversationResponse = await hostexClient.getConversation(conversation_id);
      const validation = validateHostexResponse("hostex_get_conversation", result);
      if (!validation.ok) {
        return toToolErrorResult("hostex_get_conversation", validation.error);
      }

      return toToolResult(validation.data);
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
    withErrorHandling(
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
        const result: SendMessageResponse = await hostexClient.sendMessage(conversation_id, {
          message,
          jpeg_base64,
        });
        const validation = validateHostexResponse("hostex_send_message", result);
        if (!validation.ok) {
          return toToolErrorResult("hostex_send_message", validation.error);
        }

        return toToolResult(validation.data);
      },
    ),
  );
}
