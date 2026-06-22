import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  const tracks = await prisma.track.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q } },
            { genre: { contains: q } },
            { artist: { name: { contains: q } } },
            { album: { title: { contains: q } } },
          ],
        }
      : undefined,
    include: { artist: true, album: true },
    take: 20,
  });

  return NextResponse.json({ tracks });
}
