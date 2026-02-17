import { afterEach, describe, expect, test } from "vitest";

import { createHostexEnvelope, createPropertyFixture } from "../fixtures/hostex-factories.js";
import {
  mockHostexClient,
  resetHostexClientMock,
} from "../helpers/hostex-client-mock.js";
import { createMcpTestServer, type McpTestHarness } from "../helpers/mcp-test-server.js";
import { HOSTEX_TOOL_IDS } from "../helpers/tool-ids.js";

let harness: McpTestHarness | null = null;

afterEach(async () => {
  resetHostexClientMock();
  if (harness) {
    await harness.close();
  }
  harness = null;
});

function markerForPropertyCall(id: number): string {
  return `marker-${id}`;
}

describe("concurrency isolation", () => {
  test.concurrent("isolates parallel hostex_list_properties responses by marker", async () => {
    mockHostexClient.listProperties.mockImplementation(async (params) => {
      const marker = markerForPropertyCall(params.id as number);

      return createHostexEnvelope({
        properties: [
          createPropertyFixture({
            id: params.id as number,
            title: marker,
          }),
        ],
        total: 1,
      });
    });

    harness = await createMcpTestServer();

    const [resultOne, resultTwo, resultThree] = await Promise.all([
      harness.callTool(HOSTEX_TOOL_IDS.listProperties, { id: 101, offset: 0, limit: 1 }),
      harness.callTool(HOSTEX_TOOL_IDS.listProperties, { id: 202, offset: 0, limit: 1 }),
      harness.callTool(HOSTEX_TOOL_IDS.listProperties, { id: 303, offset: 0, limit: 1 }),
    ]);

    const markers = [resultOne, resultTwo, resultThree].map((result) => {
      const payload = result.structuredContent as {
        properties: Array<{ title: string }>;
      };

      return payload.properties[0]?.title;
    });

    expect(markers).toEqual([
      markerForPropertyCall(101),
      markerForPropertyCall(202),
      markerForPropertyCall(303),
    ]);
  });

  test.concurrent("keeps parallel mixed tool calls isolated", async () => {
    mockHostexClient.listProperties.mockImplementation(async (params) =>
      createHostexEnvelope({
        properties: [
          createPropertyFixture({
            id: params.id as number,
            title: markerForPropertyCall(params.id as number),
          }),
        ],
        total: 1,
      }),
    );
    mockHostexClient.listRoomTypes.mockResolvedValue(
      createHostexEnvelope({
        room_types: [
          {
            id: 17,
            title: "roomtype-marker-17",
            properties: [createPropertyFixture()],
            channels: [],
          },
        ],
        total: 1,
      }),
    );

    harness = await createMcpTestServer();

    const [propertiesResult, roomTypesResult] = await Promise.all([
      harness.callTool(HOSTEX_TOOL_IDS.listProperties, { id: 444, offset: 0, limit: 1 }),
      harness.callTool(HOSTEX_TOOL_IDS.listRoomTypes, { offset: 0, limit: 1 }),
    ]);

    const propertiesPayload = propertiesResult.structuredContent as {
      properties: Array<{ title: string }>;
    };
    const roomTypesPayload = roomTypesResult.structuredContent as {
      room_types: Array<{ title: string }>;
    };

    expect(propertiesPayload.properties[0]?.title).toBe(markerForPropertyCall(444));
    expect(roomTypesPayload.room_types[0]?.title).toBe("roomtype-marker-17");
  });
});
