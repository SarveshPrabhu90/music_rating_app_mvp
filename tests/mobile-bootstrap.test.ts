import { beforeEach, describe, expect, it, vi } from "vitest";

import * as bootstrapRoute from "@/app/api/mobile/bootstrap/route";

const { mockPrisma, mockGetPlanFeatures, mockReadBearerToken, mockGetUserIdFromMobileSessionToken } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
    },
    diaryEntry: { count: vi.fn() },
    userTrackScore: { count: vi.fn() },
    friendship: { count: vi.fn() },
    recommendation: { count: vi.fn() },
  },
  mockGetPlanFeatures: vi.fn(),
  mockReadBearerToken: vi.fn(),
  mockGetUserIdFromMobileSessionToken: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/entitlements/plans", () => ({ getPlanFeatures: mockGetPlanFeatures }));
vi.mock("@/lib/auth/mobile-session", () => ({
  readBearerToken: mockReadBearerToken,
  getUserIdFromMobileSessionToken: mockGetUserIdFromMobileSessionToken,
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => null) }));

describe("mobile bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns startup payload for a bearer-authenticated user", async () => {
    mockReadBearerToken.mockReturnValue("token_123");
    mockGetUserIdFromMobileSessionToken.mockResolvedValue("user_1");
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: "user_1",
      email: "demo@musicdiary.app",
      username: "demo-listener",
      name: "Demo Listener",
      bio: null,
      avatarUrl: null,
      privacyDefault: "friends",
      subscriptionPlan: "FREE",
    });
    mockPrisma.diaryEntry.count.mockResolvedValue(12);
    mockPrisma.userTrackScore.count.mockResolvedValue(8);
    mockPrisma.friendship.count.mockResolvedValue(3);
    mockPrisma.recommendation.count.mockResolvedValue(5);
    mockGetPlanFeatures.mockReturnValue({ priorityRecommendations: false, weeklyRecapArchive: false, advancedInsights: false, friendsMode: false });

    const response = await bootstrapRoute.GET(new Request("http://localhost/api/mobile/bootstrap", {
      headers: { authorization: "Bearer token_123" },
    }));
    const body = (await response.json()) as { ok: boolean; data?: { counts: { ratings: number; rankings: number; friends: number; recommendations: number } } };

    expect(response.status).toBe(200);
    expect(body.data?.counts).toEqual({ ratings: 12, rankings: 8, friends: 3, recommendations: 5 });
  });
});