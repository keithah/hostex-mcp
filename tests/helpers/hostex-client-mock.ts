import { vi } from "vitest";

type HostexClientMethod =
  | "listProperties"
  | "listRoomTypes"
  | "listReservations"
  | "createReservation"
  | "cancelReservation"
  | "updateLockCode"
  | "getCustomFields"
  | "updateCustomFields"
  | "listAvailabilities"
  | "updateAvailabilities"
  | "listConversations"
  | "getConversation"
  | "sendMessage"
  | "listReviews"
  | "createReview"
  | "listWebhooks"
  | "createWebhook"
  | "deleteWebhook"
  | "getListingCalendar"
  | "updateListingPrices"
  | "listCustomChannels"
  | "listIncomeMethods";

type HostexClientMock = Record<HostexClientMethod, ReturnType<typeof vi.fn>>;
type HostexClientSeeds = Partial<Record<HostexClientMethod, unknown>>;

const hoisted = vi.hoisted(() => {
  const mockHostexClient: HostexClientMock = {
    listProperties: vi.fn(),
    listRoomTypes: vi.fn(),
    listReservations: vi.fn(),
    createReservation: vi.fn(),
    cancelReservation: vi.fn(),
    updateLockCode: vi.fn(),
    getCustomFields: vi.fn(),
    updateCustomFields: vi.fn(),
    listAvailabilities: vi.fn(),
    updateAvailabilities: vi.fn(),
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    sendMessage: vi.fn(),
    listReviews: vi.fn(),
    createReview: vi.fn(),
    listWebhooks: vi.fn(),
    createWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    getListingCalendar: vi.fn(),
    updateListingPrices: vi.fn(),
    listCustomChannels: vi.fn(),
    listIncomeMethods: vi.fn(),
  };

  const MockedHostexClient = vi.fn(() => mockHostexClient);

  return {
    mockHostexClient,
    MockedHostexClient,
  };
});

export const mockHostexClient = hoisted.mockHostexClient;
export const MockedHostexClient = hoisted.MockedHostexClient;

vi.mock("hostex-ts", async () => {
  const actual = await vi.importActual<typeof import("hostex-ts")>("hostex-ts");

  return {
    ...actual,
    HostexClient: MockedHostexClient,
  };
});

export function resetHostexClientMock() {
  MockedHostexClient.mockClear();
  for (const fn of Object.values(mockHostexClient)) {
    fn.mockReset();
  }
}

export function seedHostexClientMock(seeds: HostexClientSeeds) {
  for (const [method, response] of Object.entries(seeds)) {
    mockHostexClient[method as HostexClientMethod].mockResolvedValue(response);
  }
}

export function seedHostexClientMockErrors(errors: HostexClientSeeds) {
  for (const [method, error] of Object.entries(errors)) {
    mockHostexClient[method as HostexClientMethod].mockRejectedValue(error);
  }
}

export function getHostexClientConstructorMock() {
  return MockedHostexClient;
}
