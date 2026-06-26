import { beforeEach, describe, expect, it, vi } from "vitest";

import * as friendsRoute from "@/app/api/friends/route";
import * as friendshipRoute from "@/app/api/friends/[friendshipId]/route";
import * as peopleSearchRoute from "@/app/api/people/search/route";
import * as profileRoute from "@/app/api/profile/route";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    friendship: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/api-user", () => ({
  getAuthenticatedUserId: vi.fn(async () => "user_1"),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mockPrisma,
}));

function createJsonRequest(url: string, method: string, payload?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

describe("social feature routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_JOB_SECRET = "secret";
  });

  it("updates a profile when username is available", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.update.mockResolvedValue({
      username: "demo-listener",
      name: "Demo Listener",
      bio: "bio",
      privacyDefault: "friends",
    });

    const response = await profileRoute.PATCH(
      createJsonRequest("http://localhost/api/profile", "PATCH", {
        username: "demo-listener",
        name: "Demo Listener",
        bio: "bio",
        privacyDefault: "friends",
      }),
    );
    const body = (await response.json()) as { ok: boolean; data?: { username: string } };

    expect(response.status).toBe(200);
    expect(body.data?.username).toBe("demo-listener");
  });

  it("creates a friend request for a valid username", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_2",
      username: "noa-parker",
      name: "Noa Parker",
      bio: null,
    });
    mockPrisma.friendship.findFirst.mockResolvedValue(null);
    mockPrisma.friendship.create.mockResolvedValue({
      id: "friendship_1",
      status: "PENDING",
      addressee: {
        id: "user_2",
        username: "noa-parker",
        name: "Noa Parker",
        bio: null,
      },
    });

    const response = await friendsRoute.POST(
      createJsonRequest("http://localhost/api/friends", "POST", { username: "noa-parker" }),
    );
    const body = (await response.json()) as { ok: boolean; data?: { status: string } };

    expect(response.status).toBe(200);
    expect(body.data?.status).toBe("PENDING");
  });

  it("accepts an incoming friend request", async () => {
    mockPrisma.friendship.findUnique.mockResolvedValue({
      id: "friendship_1",
      requesterId: "user_2",
      addresseeId: "user_1",
      status: "PENDING",
    });
    mockPrisma.friendship.update.mockResolvedValue({ id: "friendship_1", status: "ACCEPTED" });

    const response = await friendshipRoute.PATCH(
      createJsonRequest("http://localhost/api/friends/friendship_1", "PATCH", { action: "accept" }),
      { params: Promise.resolve({ friendshipId: "friendship_1" }) },
    );
    const body = (await response.json()) as { ok: boolean; data?: { status: string } };

    expect(response.status).toBe(200);
    expect(body.data?.status).toBe("ACCEPTED");
  });

  it("searches people and includes relationship state", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "user_2",
        username: "noa-parker",
        name: "Noa Parker",
        bio: "Test bio",
        avatarUrl: null,
        privacyDefault: "friends",
      },
    ]);
    mockPrisma.friendship.findMany.mockResolvedValue([
      {
        id: "friendship_1",
        requesterId: "user_1",
        addresseeId: "user_2",
        status: "PENDING",
      },
    ]);

    const response = await peopleSearchRoute.GET(new Request("http://localhost/api/people/search?q=noa"));
    const body = (await response.json()) as {
      ok: boolean;
      data?: { results: Array<{ username: string; relationship: string }> };
    };

    expect(response.status).toBe(200);
    expect(body.data?.results[0]).toEqual(
      expect.objectContaining({ username: "noa-parker", relationship: "outgoing" }),
    );
  });
});