import { LibraryTable } from "@/components/library-table";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function LibraryPage() {
  const user = await requireUser();
  const rankings = await prisma.userTrackScore.findMany({
    where: { userId: user.id },
    include: { track: { include: { artist: true } } },
    orderBy: { score: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Library & rankings</h1>
      <Card>
        <LibraryTable
          items={rankings.map((row) => ({
            trackId: row.trackId,
            score: row.score,
            tier: row.tier,
            lastInteractedAt: row.lastInteractedAt.toISOString(),
            track: row.track,
          }))}
        />
      </Card>
    </div>
  );
}
