import { PairwiseCalibrator } from "@/components/pairwise-calibrator";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function PairwisePage() {
  const user = await requireUser();

  const tracks = await prisma.userTrackScore.findMany({
    where: { userId: user.id },
    include: { track: { include: { artist: true } } },
    take: 30,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Pairwise ranking</h1>
      <Card>
        <PairwiseCalibrator
          options={tracks.map((item) => ({
            trackId: item.trackId,
            title: item.track.title,
            artistName: item.track.artist.name,
          }))}
        />
      </Card>
    </div>
  );
}
