import bcrypt from "bcrypt";
import { PrismaClient, Tier } from "@prisma/client";

const prisma = new PrismaClient();

const tierBase: Record<Tier, number> = {
  LIFE_SONG: 1000,
  ELITE: 850,
  HEAVY_ROTATION: 700,
  LIKED: 550,
  NOT_FOR_ME: 250,
};

const moodTags = [
  "late night",
  "gym",
  "driving",
  "nostalgia",
  "heartbreak",
  "confidence",
  "focus",
  "party",
  "peaceful",
  "summer",
  "winter",
  "discovery",
];

const artistSeeds = [
  { name: "Nova Arcade", era: "2020s", genre: "Synth Pop" },
  { name: "Velvet Motor", era: "2010s", genre: "Indie Rock" },
  { name: "Coastal Static", era: "2000s", genre: "Alt Pop" },
  { name: "Signal Bloom", era: "2020s", genre: "Dream Pop" },
  { name: "Neon Postcard", era: "1980s", genre: "Synthwave" },
  { name: "Marble Echo", era: "1990s", genre: "R&B" },
  { name: "Amber Transit", era: "1970s", genre: "Soul" },
  { name: "Orbit Fable", era: "2010s", genre: "Electronic" },
  { name: "Late Window", era: "2020s", genre: "Lo-fi" },
  { name: "Polar Avenue", era: "2000s", genre: "Alternative" },
  { name: "Glass River", era: "2010s", genre: "House" },
  { name: "Cinema Youth", era: "1990s", genre: "Britpop" },
  { name: "Rouge Satellite", era: "1980s", genre: "New Wave" },
  { name: "Paper Skyline", era: "2020s", genre: "Indie Folk" },
  { name: "Metro Saffron", era: "2000s", genre: "Hip Hop" },
];

const trackNouns = [
  "Midnight Sketch",
  "Stereo Bloom",
  "Painted Exit",
  "Afterglow Map",
  "Blue Cassettes",
  "Signal Fire",
  "Slow Orbit",
  "Static Hearts",
  "Velvet Drive",
  "Dusk Anthem",
  "Neon Window",
  "Summer Circuit",
  "Quiet Thunder",
  "Parallel Roads",
  "Golden Replies",
  "Lowlight Memory",
  "Magenta Rain",
  "Cloud Diary",
  "Carbon Echo",
  "Moonline",
];

function randomFrom<T>(items: T[], index: number) {
  return items[index % items.length];
}

async function main() {
  await prisma.entryTag.deleteMany();
  await prisma.diaryEntry.deleteMany();
  await prisma.rankingComparison.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.userTrackScore.deleteMany();
  await prisma.weeklyRecap.deleteMany();
  await prisma.track.deleteMany();
  await prisma.album.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.tasteTag.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const [demoUser, secondUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: "demo@musicdiary.app",
        name: "Demo Listener",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: "noa@musicdiary.app",
        name: "Noa Parker",
        passwordHash,
      },
    }),
  ]);

  const tags = await Promise.all(
    moodTags.map((name) => prisma.tasteTag.create({ data: { name } })),
  );

  const allTracks: { id: string; title: string; genre: string; era: string; artistId: string; albumId: string }[] = [];

  for (let i = 0; i < artistSeeds.length; i += 1) {
    const seed = artistSeeds[i];
    const artist = await prisma.artist.create({
      data: {
        name: seed.name,
        era: seed.era,
      },
    });

    const album = await prisma.album.create({
      data: {
        title: `${seed.name} Archives`,
        year: 1990 + i * 2,
        coverUrl: `https://placehold.co/600x600/111827/F3F4F6?text=${encodeURIComponent(seed.name)}`,
        artistId: artist.id,
      },
    });

    for (let j = 0; j < 4; j += 1) {
      const title = `${randomFrom(trackNouns, i * 3 + j)} ${j + 1}`;
      const track = await prisma.track.create({
        data: {
          title,
          genre: seed.genre,
          era: seed.era,
          year: album.year + j,
          albumArtUrl: album.coverUrl,
          artistId: artist.id,
          albumId: album.id,
        },
      });
      allTracks.push({
        id: track.id,
        title: track.title,
        genre: track.genre,
        era: track.era,
        artistId: artist.id,
        albumId: album.id,
      });
    }
  }

  const selected = allTracks.slice(0, 18);
  for (let i = 0; i < selected.length; i += 1) {
    const tier = [Tier.LIFE_SONG, Tier.ELITE, Tier.HEAVY_ROTATION, Tier.LIKED][i % 4];
    const entry = await prisma.diaryEntry.create({
      data: {
        userId: demoUser.id,
        trackId: selected[i].id,
        tier,
        note: i % 2 === 0 ? "Instant replay energy." : "Kept coming back to this.",
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.entryTag.createMany({
      data: [0, 1].map((offset) => ({
        entryId: entry.id,
        tagId: tags[(i + offset) % tags.length].id,
      })),
    });

    await prisma.userTrackScore.upsert({
      where: { userId_trackId: { userId: demoUser.id, trackId: selected[i].id } },
      update: {},
      create: {
        userId: demoUser.id,
        trackId: selected[i].id,
        tier,
        score: tierBase[tier] + Math.max(0, 40 - i * 2),
      },
    });
  }

  for (let i = 0; i < 8; i += 1) {
    const winner = selected[i];
    const loser = selected[i + 1];
    await prisma.rankingComparison.create({
      data: {
        userId: demoUser.id,
        leftTrackId: winner.id,
        rightTrackId: loser.id,
        winnerTrackId: winner.id,
        loserTrackId: loser.id,
        delta: 12 - i,
      },
    });
  }

  const recommendationCandidates = allTracks.slice(20, 28);
  for (let i = 0; i < recommendationCandidates.length; i += 1) {
    const track = recommendationCandidates[i];
    await prisma.recommendation.create({
      data: {
        userId: demoUser.id,
        trackId: track.id,
        score: 650 - i * 20,
        reason: `Because you ranked ${selected[0].title} as Elite and often tag songs as late night + nostalgia.`,
      },
    });
  }

  await prisma.weeklyRecap.create({
    data: {
      userId: demoUser.id,
      weekStart: new Date(new Date().setDate(new Date().getDate() - 6)),
      topSongId: selected[0].id,
      topMood: "nostalgia",
      topGenre: selected[0].genre,
      summary: "Your week sounded like neon memories and focused momentum.",
    },
  });

  await prisma.diaryEntry.create({
    data: {
      userId: secondUser.id,
      trackId: allTracks[30].id,
      tier: Tier.ELITE,
      note: "A clean reference track.",
    },
  });

  console.log(`Seeded ${allTracks.length} tracks for demo.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
