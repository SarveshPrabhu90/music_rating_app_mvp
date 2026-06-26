import { beforeEach, describe, expect, it, vi } from "vitest";

import { dispatchPushNotificationsJob } from "@/lib/jobs/push-dispatch";

const { mockPrisma, mockSendExpoPushNotifications } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findMany: vi.fn(),
    },
    devicePushToken: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  mockSendExpoPushNotifications: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/notifications/expo", () => ({
  sendExpoPushNotifications: mockSendExpoPushNotifications,
}));

describe("push dispatch job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty metrics when no users match campaign criteria", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);

    const result = await dispatchPushNotificationsJob({ campaign: "recommendations", sinceHours: 2 });

    expect(result.targetedUsers).toBe(0);
    expect(result.queuedTokens).toBe(0);
    expect(result.sentCount).toBe(0);
    expect(mockSendExpoPushNotifications).not.toHaveBeenCalled();
  });

  it("sends push notifications and removes invalid tokens", async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ id: "user_1" }]);
    mockPrisma.devicePushToken.findMany.mockResolvedValue([
      { token: "ExponentPushToken[ok]", userId: "user_1", platform: "ios" },
      { token: "ExponentPushToken[bad]", userId: "user_1", platform: "ios" },
    ]);
    mockSendExpoPushNotifications.mockResolvedValue({
      results: [
        { token: "ExponentPushToken[ok]", ok: true },
        { token: "ExponentPushToken[bad]", ok: false, details: "DeviceNotRegistered" },
      ],
      invalidTokens: ["ExponentPushToken[bad]"],
    });

    const result = await dispatchPushNotificationsJob({ campaign: "recommendations", sinceHours: 2 });

    expect(mockSendExpoPushNotifications).toHaveBeenCalledTimes(1);
    expect(mockPrisma.devicePushToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ["ExponentPushToken[bad]"] } },
    });
    expect(result.sentCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.invalidatedTokens).toBe(1);
  });

  it("supports dry-run mode without contacting Expo", async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ id: "user_1" }]);
    mockPrisma.devicePushToken.findMany.mockResolvedValue([
      { token: "ExponentPushToken[dry]", userId: "user_1", platform: "android" },
    ]);

    const result = await dispatchPushNotificationsJob({ campaign: "weekly_recap", dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.queuedTokens).toBe(1);
    expect(result.sentCount).toBe(0);
    expect(mockSendExpoPushNotifications).not.toHaveBeenCalled();
  });
});
