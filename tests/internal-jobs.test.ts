import { beforeEach, describe, expect, it, vi } from "vitest";

import * as pushDispatchJobRoute from "@/app/api/internal/jobs/push-dispatch/route";
import * as recommendationsJobRoute from "@/app/api/internal/jobs/recommendations/route";
import * as weeklyRecapJobRoute from "@/app/api/internal/jobs/weekly-recaps/route";

const { mockRefreshRecommendationsJob, mockGenerateWeeklyRecapsJob, mockDispatchPushNotificationsJob } = vi.hoisted(() => ({
  mockRefreshRecommendationsJob: vi.fn(),
  mockGenerateWeeklyRecapsJob: vi.fn(),
  mockDispatchPushNotificationsJob: vi.fn(),
}));

vi.mock("@/lib/jobs/recommendations", () => ({
  refreshRecommendationsJob: mockRefreshRecommendationsJob,
}));

vi.mock("@/lib/jobs/weekly-recaps", () => ({
  generateWeeklyRecapsJob: mockGenerateWeeklyRecapsJob,
  getWeekStart: (date: Date) => date,
}));

vi.mock("@/lib/jobs/push-dispatch", () => ({
  dispatchPushNotificationsJob: mockDispatchPushNotificationsJob,
}));

function createJobRequest(url: string, payload?: unknown, auth = "Bearer secret") {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: auth,
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

describe("internal job routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_JOB_SECRET = "secret";
  });

  it("rejects recommendation jobs without valid auth", async () => {
    const response = await recommendationsJobRoute.POST(
      createJobRequest("http://localhost/api/internal/jobs/recommendations", {}, "Bearer wrong"),
    );
    const body = (await response.json()) as { ok: boolean; error?: { code?: string } };

    expect(response.status).toBe(403);
    expect(body.error?.code).toBe("FORBIDDEN");
  });

  it("dispatches the recommendation refresh job", async () => {
    mockRefreshRecommendationsJob.mockResolvedValue([{ userId: "user_1", recommendationCount: 5 }]);

    const response = await recommendationsJobRoute.POST(
      createJobRequest("http://localhost/api/internal/jobs/recommendations", { limit: 1 }),
    );
    const body = (await response.json()) as {
      ok: boolean;
      data?: { processedUsers: number; results: Array<{ userId: string }> };
    };

    expect(response.status).toBe(200);
    expect(body.data?.processedUsers).toBe(1);
    expect(mockRefreshRecommendationsJob).toHaveBeenCalledWith({ limit: 1 });
  });

  it("dispatches the weekly recap job", async () => {
    mockGenerateWeeklyRecapsJob.mockResolvedValue([{ userId: "user_1", generated: true }]);

    const response = await weeklyRecapJobRoute.POST(
      createJobRequest("http://localhost/api/internal/jobs/weekly-recaps", { userIds: ["user_1"] }),
    );
    const body = (await response.json()) as {
      ok: boolean;
      data?: { processedUsers: number; results: Array<{ userId: string }> };
    };

    expect(response.status).toBe(200);
    expect(body.data?.processedUsers).toBe(1);
    expect(mockGenerateWeeklyRecapsJob).toHaveBeenCalledWith({ userIds: ["user_1"] });
  });

  it("rejects push dispatch jobs without valid auth", async () => {
    const response = await pushDispatchJobRoute.POST(
      createJobRequest("http://localhost/api/internal/jobs/push-dispatch", {}, "Bearer wrong"),
    );
    const body = (await response.json()) as { ok: boolean; error?: { code?: string } };

    expect(response.status).toBe(403);
    expect(body.error?.code).toBe("FORBIDDEN");
  });

  it("dispatches the push notification job", async () => {
    mockDispatchPushNotificationsJob.mockResolvedValue({
      campaign: "recommendations",
      sinceHours: 3,
      targetedUsers: 2,
      queuedTokens: 2,
      sentCount: 2,
      failedCount: 0,
      invalidatedTokens: 0,
      dryRun: false,
    });

    const response = await pushDispatchJobRoute.POST(
      createJobRequest("http://localhost/api/internal/jobs/push-dispatch", {
        campaign: "recommendations",
        sinceHours: 3,
        limit: 10,
      }),
    );
    const body = (await response.json()) as {
      ok: boolean;
      data?: { campaign: string; queuedTokens: number; sentCount: number };
    };

    expect(response.status).toBe(200);
    expect(body.data?.campaign).toBe("recommendations");
    expect(body.data?.sentCount).toBe(2);
    expect(mockDispatchPushNotificationsJob).toHaveBeenCalledWith({
      campaign: "recommendations",
      sinceHours: 3,
      limit: 10,
    });
  });
});