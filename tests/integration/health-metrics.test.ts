import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it, vi } from "vitest";

import { registerHealthRoutes } from "../../src/index.js";
import { metricsRegistry } from "../../src/observability/metrics.js";
import type { HostexApiClient } from "../../src/types/hostex-client.js";

function createGatewayStub(overrides: Partial<HostexApiClient> = {}): HostexApiClient {
  return {
    listProperties: vi.fn(async () => ({ data: { properties: [], total: 0 } })),
    listRoomTypes: vi.fn(async () => ({})),
    listReservations: vi.fn(async () => ({})),
    createReservation: vi.fn(async () => ({})),
    cancelReservation: vi.fn(async () => ({})),
    updateLockCode: vi.fn(async () => ({})),
    getCustomFields: vi.fn(async () => ({})),
    updateCustomFields: vi.fn(async () => ({})),
    listAvailabilities: vi.fn(async () => ({})),
    updateAvailabilities: vi.fn(async () => ({})),
    getListingCalendar: vi.fn(async () => ({})),
    updateListingPrices: vi.fn(async () => ({})),
    listConversations: vi.fn(async () => ({})),
    getConversation: vi.fn(async () => ({})),
    sendMessage: vi.fn(async () => ({})),
    listReviews: vi.fn(async () => ({})),
    createReview: vi.fn(async () => ({})),
    listWebhooks: vi.fn(async () => ({})),
    createWebhook: vi.fn(async () => ({})),
    deleteWebhook: vi.fn(async () => ({})),
    listCustomChannels: vi.fn(async () => ({})),
    listIncomeMethods: vi.fn(async () => ({})),
    ...overrides,
  } as HostexApiClient;
}

function toPathname(req: IncomingMessage): string {
  const origin = req.headers.host ? `http://${req.headers.host}` : "http://127.0.0.1";
  return new URL(req.url ?? "/", origin).pathname;
}

async function startOperationalServer(gateway: HostexApiClient) {
  const routes = registerHealthRoutes({
    config: { accessToken: "test-access-token" },
    deploymentMode: "http",
    gateway,
  });

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const path = toPathname(req);
    const routeResult = await routes.handle(path);

    if (!routeResult) {
      res.statusCode = 404;
      res.end("not found");
      return;
    }

    res.statusCode = routeResult.status;
    for (const [header, value] of Object.entries(routeResult.headers ?? {})) {
      res.setHeader(header, value);
    }
    res.end(routeResult.body);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

let cleanup: (() => Promise<void>) | null = null;

afterEach(async () => {
  metricsRegistry.resetMetrics();
  if (cleanup) {
    await cleanup();
  }
  cleanup = null;
});

describe("health and metrics operational routes", () => {
  it("serves /healthz, /readyz, and /metrics with correct semantics", async () => {
    const server = await startOperationalServer(createGatewayStub());
    cleanup = server.close;

    const healthResponse = await fetch(`${server.baseUrl}/healthz`);
    const healthBody = (await healthResponse.json()) as { status: string };
    expect(healthResponse.status).toBe(200);
    expect(healthBody.status).toBe("ok");

    const readinessResponse = await fetch(`${server.baseUrl}/readyz`);
    const readinessBody = (await readinessResponse.json()) as { status: string };
    expect(readinessResponse.status).toBe(200);
    expect(readinessBody.status).toBe("ready");

    const metricsResponse = await fetch(`${server.baseUrl}/metrics`);
    const metricsText = await metricsResponse.text();
    expect(metricsResponse.status).toBe(200);
    expect(metricsResponse.headers.get("content-type")).toContain("text/plain");
    expect(metricsText).toContain("hostex_mcp_");
  });

  it("returns degraded readiness when gateway dependency check fails", async () => {
    const server = await startOperationalServer(
      createGatewayStub({
        listProperties: vi.fn(async () => {
          throw new Error("Hostex unavailable");
        }),
      }),
    );
    cleanup = server.close;

    const readinessResponse = await fetch(`${server.baseUrl}/readyz`);
    const readinessBody = (await readinessResponse.json()) as {
      status: string;
      dependency: { hostex: { status: string; reason: string } };
    };

    expect(readinessResponse.status).toBe(503);
    expect(readinessBody.status).toBe("degraded");
    expect(readinessBody.dependency.hostex.status).toBe("down");
    expect(readinessBody.dependency.hostex.reason).toContain("Hostex unavailable");
  });

  it("returns deterministic unavailable response for non-http metrics mode", async () => {
    const routes = registerHealthRoutes({
      config: { accessToken: "test-access-token" },
      deploymentMode: "smithery-managed",
      gateway: createGatewayStub(),
    });

    const metricsResult = await routes.metrics();
    const payload = JSON.parse(metricsResult.body) as {
      status: string;
      deploymentMode: string;
    };

    expect(metricsResult.status).toBe(404);
    expect(payload.status).toBe("unavailable");
    expect(payload.deploymentMode).toBe("smithery-managed");
  });
});
