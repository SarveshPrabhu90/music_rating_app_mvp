import Link from "next/link";

import { AvatarChip } from "@/components/avatar-chip";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { buildFriendActivityFeed } from "@/lib/social/feed";

export default async function FeedPage() {
  const user = await requireUser();
  const items = await buildFriendActivityFeed(user.id, 30);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">Activity feed</h1>
        <p className="text-sm text-zinc-600">Follow your friends’ latest ratings and ranking moves.</p>
      </div>
      <Card className="space-y-4">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AvatarChip name={item.user.name} username={item.user.username} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/people/${item.user.username}`} className="font-medium hover:underline">
                        {item.user.name}
                      </Link>
                      <Badge>{item.type === "rating" ? "Rating" : "Ranking move"}</Badge>
                      <Badge>{item.meta}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-700">{item.text}</p>
                    <p className="mt-2 text-sm font-medium text-zinc-900">
                      {item.track.title} • {item.track.artistName}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">No friend activity yet. Add friends to start seeing ratings and ranking moves.</p>
        )}
      </Card>
    </div>
  );
}