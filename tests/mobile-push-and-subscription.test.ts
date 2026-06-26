import { beforeEach, describe, expect, it, vi } from "vitest";

import * as pushTokensRoute from "@/app/api/mobile/push-tokens/route";
import * as subscriptionWebhookRoute from "@/app/api/mobile/subscription/webhook/route";

const { mockPrisma, mockReadBearerToken, mockGetUserIdFromMobileSessionToken } = vi.hoisted(() => ({
  mockPrisma: {
    devicePushToken: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      updateMany: vi.fn(),
    },
  },
  mockReadBearerToken: vi.fn(),
  mockGetUserIdFromMobileSessionToken: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth/mobile-session", () => ({
  readBearerToken: mockReadBearerToken,
  getUserIdFromMobileSessionToken: mockGetUserIdFromMobileSessionToken,
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => null) }));

describe("mobile push tokens and subscription sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MOBILE_SUBSCRIPTION_WEBHOOK_SECRET = "secret";
  });

  it("registers a push token with bearer auth", async () => {
    mockReadBearerToken.mockReturnValue("token_123");
    mockGetUserIdFromMobileSessionToken.mockResolvedValue("user_1");
    mockPrisma.devicePushToken.upsert.mockResolvedValue({ id: "push_1" });

    const response = await pushTokensRoute.POST(
      new Request("http://localhost/api/mobile/push-tokens", {
        method: "POST",
        headers: {
          authorization: "Bearer token_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: "expo_token", platform: "ios" }),
      }),
    );
    expect(response.status).toBe(200);
  });

  it("syncs a subscription plan from the webhook", async () => {
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

    const response = await subscriptionWebhookRoute.POST(
      new Request("http://localhost/api/mobile/subscription/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mobile-subscription-secret": "secret",
        },
        body: JSON.stringify({ appUserId: "user_1", plan: "PRO", source: "revenuecat" }),
      }),
    );

    expect(response.status).toBe(200);
  });
});