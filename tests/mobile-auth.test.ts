import { beforeEach, describe, expect, it, vi } from "vitest";

import * as catalogSearchRoute from "@/app/api/catalog/search/route";
import * as mobileSessionRoute from "@/app/api/mobile/session/route";

const {
  mockPrisma,
  mockAuthorizeCredentials,
  mockCreateMobileSession,
  mockReadBearerToken,
  mockGetUserIdFromMobileSessionToken,
  mockRevokeMobileSessionToken,
} = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
    },
    track: {
      findMany: vi.fn(),
    },
  },
  mockAuthorizeCredentials: vi.fn(),
  mockCreateMobileSession: vi.fn(),
  mockReadBearerToken: vi.fn(),
  mockGetUserIdFromMobileSessionToken: vi.fn(),
  mockRevokeMobileSessionToken: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/auth/credentials", () => ({
  authorizeCredentials: mockAuthorizeCredentials,
}));

vi.mock("@/lib/auth/mobile-session", () => ({
  createMobileSession: mockCreateMobileSession,
  readBearerToken: mockReadBearerToken,
  getUserIdFromMobileSessionToken: mockGetUserIdFromMobileSessionToken,
  revokeMobileSessionToken: mockRevokeMobileSessionToken,
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => null),
}));

describe("mobile auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a mobile session from valid credentials", async () => {
    mockAuthorizeCredentials.mockResolvedValue({
      id: "user_1",
      email: "demo@musicdiary.app",
      name: "Demo Listener",
      subscriptionPlan: "FREE",
    });
    mockCreateMobileSession.mockResolvedValue({
      token: "token_123",
      expiresAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    const response = await mobileSessionRoute.POST(
      new Request("http://localhost/api/mobile/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "demo@musicdiary.app",
          password: "password123",
          deviceName: "Pixel 10",
        }),
      }),
    );
    const body = (await response.json()) as { ok: boolean; data?: { token: string } };

    expect(response.status).toBe(200);
    expect(body.data?.token).toBe("token_123");
  });

  it("allows bearer auth on an existing client route", async () => {
    mockReadBearerToken.mockReturnValue("token_123");
    mockGetUserIdFromMobileSessionToken.mockResolvedValue("user_1");
    mockPrisma.track.findMany.mockResolvedValue([]);

    const response = await catalogSearchRoute.GET(
      new Request("http://localhost/api/catalog/search?q=hello", {
        headers: { authorization: "Bearer token_123" },
      }),
    );
    const body = (await response.json()) as { ok: boolean; data?: { tracks: unknown[] } };

    expect(response.status).toBe(200);
    expect(body.data?.tracks).toEqual([]);
  });
});