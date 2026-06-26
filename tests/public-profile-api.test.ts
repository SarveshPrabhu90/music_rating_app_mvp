import { beforeEach, describe, expect, it, vi } from "vitest";

import * as publicProfileRoute from "@/app/api/profile/[username]/route";

const { mockBuildPublicProfileByUsername, mockReadBearerToken, mockGetUserIdFromMobileSessionToken } = vi.hoisted(() => ({
  mockBuildPublicProfileByUsername: vi.fn(),
  mockReadBearerToken: vi.fn(),
  mockGetUserIdFromMobileSessionToken: vi.fn(),
}));

vi.mock("@/lib/social/profile", () => ({ buildPublicProfileByUsername: mockBuildPublicProfileByUsername }));
vi.mock("@/lib/auth/mobile-session", () => ({
  readBearerToken: mockReadBearerToken,
  getUserIdFromMobileSessionToken: mockGetUserIdFromMobileSessionToken,
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => null) }));

describe("public profile api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a friend-visible profile payload", async () => {
    mockReadBearerToken.mockReturnValue("token_123");
    mockGetUserIdFromMobileSessionToken.mockResolvedValue("user_1");
    mockBuildPublicProfileByUsername.mockResolvedValue({
      id: "user_2",
      name: "Noa Parker",
      username: "noa-parker",
      bio: "Test",
      avatarUrl: null,
      privacyDefault: "friends",
      createdAt: "2026-06-26T00:00:00.000Z",
      friendship: { isFriend: true },
      topRankings: [],
      recentRatings: [],
    });

    const response = await publicProfileRoute.GET(
      new Request("http://localhost/api/profile/noa-parker", {
        headers: { authorization: "Bearer token_123" },
      }),
      { params: Promise.resolve({ username: "noa-parker" }) },
    );
    const body = (await response.json()) as { ok: boolean; data?: { username: string; friendship: { isFriend: boolean } } };

    expect(response.status).toBe(200);
    expect(body.data?.username).toBe("noa-parker");
    expect(body.data?.friendship.isFriend).toBe(true);
  });
});