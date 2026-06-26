import { beforeEach, describe, expect, it, vi } from "vitest";

import * as dashboardRoute from "@/app/api/dashboard/route";

const { mockBuildDashboardSummary } = vi.hoisted(() => ({
  mockBuildDashboardSummary: vi.fn(),
}));

vi.mock("@/lib/auth/api-user", () => ({
  getAuthenticatedUserId: vi.fn(async () => "user_1"),
}));

vi.mock("@/lib/dashboard/summary", () => ({
  buildDashboardSummary: mockBuildDashboardSummary,
}));

describe("dashboard api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the dashboard summary envelope", async () => {
    mockBuildDashboardSummary.mockResolvedValue({
      recentEntries: [{ id: "entry_1" }],
      topRankings: [{ id: "score_1" }],
      tastePulse: {
        tags: ["late night"],
        recommendation: null,
        rankingConfidencePercent: 84,
        unstableCount: 1,
      },
    });

    const response = await dashboardRoute.GET(new Request("http://localhost/api/dashboard"));
    const body = (await response.json()) as {
      ok: boolean;
      data?: { recentEntries: Array<{ id: string }>; topRankings: Array<{ id: string }> };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.recentEntries[0]?.id).toBe("entry_1");
    expect(body.data?.topRankings[0]?.id).toBe("score_1");
  });
});