import { beforeEach, describe, expect, it, vi } from "vitest";

import * as dashboardRoute from "@/app/api/mobile/dashboard/route";

const {
  mockPrisma,
  mockBuildDashboardSummary,
  mockBuildFriendActivityFeed,
  mockReadBearerToken,
  mockGetUserIdFromMobileSessionToken,
} = vi.hoisted(() => ({
  mockPrisma: {
    diaryEntry: { count: vi.fn() },
    userTrackScore: { count: vi.fn() },
    friendship: { count: vi.fn() },
  },
  mockBuildDashboardSummary: vi.fn(),
  mockBuildFriendActivityFeed: vi.fn(),
  mockReadBearerToken: vi.fn(),
  mockGetUserIdFromMobileSessionToken: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/dashboard/summary", () => ({ buildDashboardSummary: mockBuildDashboardSummary }));
vi.mock("@/lib/social/feed", () => ({ buildFriendActivityFeed: mockBuildFriendActivityFeed }));
vi.mock("@/lib/auth/mobile-session", () => ({
  readBearerToken: mockReadBearerToken,
  getUserIdFromMobileSessionToken: mockGetUserIdFromMobileSessionToken,
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => null) }));

describe("mobile dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mobile dashboard payload", async () => {
    mockReadBearerToken.mockReturnValue("token_123");
    mockGetUserIdFromMobileSessionToken.mockResolvedValue("user_1");
    mockBuildDashboardSummary.mockResolvedValue({ recentEntries: [], topRankings: [], tastePulse: { tags: [], recommendation: null, rankingConfidencePercent: 0, unstableCount: 0 } });
    mockBuildFriendActivityFeed.mockResolvedValue([{ id: "feed_1", type: "rating", createdAt: "2026-06-26T00:00:00.000Z", user: { id: "user_2", name: "Noa", username: "noa", avatarUrl: null }, text: "Noa rated a song", meta: "Elite", track: { id: "track_1", title: "Song", artistName: "Artist" } }]);
    mockPrisma.diaryEntry.count.mockResolvedValue(4);
    mockPrisma.userTrackScore.count.mockResolvedValue(5);
    mockPrisma.friendship.count.mockResolvedValue(2);

    const response = await dashboardRoute.GET(new Request("http://localhost/api/mobile/dashboard", {
      headers: { authorization: "Bearer token_123" },
    }));
    const body = (await response.json()) as { ok: boolean; data?: { counts: { ratings: number; rankings: number; friends: number }; feedPreview: Array<{ id: string }> } };

    expect(response.status).toBe(200);
    expect(body.data?.counts).toEqual({ ratings: 4, rankings: 5, friends: 2 });
    expect(body.data?.feedPreview[0]?.id).toBe("feed_1");
  });
});