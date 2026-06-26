import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { buildDashboardSummary } from "@/lib/dashboard/summary";

export default async function DashboardPage() {
  const user = await requireUser();
  const summary = await buildDashboardSummary(user.id);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-600">Welcome back, {user.name}.</p>
          <h1 className="text-3xl font-semibold">Today’s music diary</h1>
        </div>
        <Link href="/diary">
          <Button>Quick add entry</Button>
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="space-y-3">
          <h2 className="font-semibold">Recently logged songs</h2>
          {summary.recentEntries.length ? (
            summary.recentEntries.map((entry) => (
              <div key={entry.id} className="text-sm">
                <p className="font-medium">{entry.track.title}</p>
                <p className="text-zinc-500">
                  {entry.track.artistName} • {entry.tierLabel}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">No entries yet.</p>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">Current top-ranked songs</h2>
          {summary.topRankings.length ? (
            summary.topRankings.map((score) => (
              <div key={score.id} className="text-sm">
                <p className="font-medium">{score.track.title}</p>
                <p className="text-zinc-500">{Math.round(score.score)} points</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">No rankings yet.</p>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">Taste pulse</h2>
          <div className="flex flex-wrap gap-2">
            {summary.tastePulse.tags.length ? (
              summary.tastePulse.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)
            ) : (
              <p className="text-sm text-zinc-500">Log tags to reveal pulse.</p>
            )}
          </div>
          <h3 className="pt-2 text-sm font-medium">Recommendation</h3>
          {summary.tastePulse.recommendation ? (
            <p className="text-sm text-zinc-600">
              {summary.tastePulse.recommendation.track.title} — {summary.tastePulse.recommendation.track.artistName}
            </p>
          ) : (
            <p className="text-sm text-zinc-500">Your next pick appears here.</p>
          )}
          <div className="pt-1 text-xs text-zinc-600">
            Ranking confidence: {summary.tastePulse.rankingConfidencePercent}% • {summary.tastePulse.unstableCount} songs still movable
          </div>
        </Card>
      </section>
    </div>
  );
}
