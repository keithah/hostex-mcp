import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HostexClient } from "hostex-ts";
import { z } from "zod";

import { toToolErrorResult, toToolResult, withErrorHandling } from "../lib/error-handler.js";
import { validateHostexResponse } from "../lib/response-validation.js";
import { paginationSchema } from "../lib/validation.js";
import type {
  GetConversationParams,
  GetConversationResponse,
  ListConversationsParams,
  ListConversationsResponse,
  SendMessageParams,
  SendMessageResponse,
} from "../types/hostex-client.js";

export function registerConversationTools(server: McpServer, hostexClient: HostexClient): void {
  server.registerTool(
    "hostex_list_conversations",
    {
      description: "List guest conversations and inquiries",
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
      description: "Get conversation details including all messages",
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
      description: "Send a text or image message to a guest",
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
