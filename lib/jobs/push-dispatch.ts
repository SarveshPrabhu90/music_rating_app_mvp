import { prisma } from "@/lib/db/prisma";
import { sendExpoPushNotifications } from "@/lib/notifications/expo";

export type PushCampaign = "recommendations" | "weekly_recap";

type DispatchOptions = {
  campaign?: PushCampaign;
  limit?: number;
  sinceHours?: number;
  dryRun?: boolean;
};

function getCampaignDefaults(campaign: PushCampaign) {
  if (campaign === "weekly_recap") {
    return {
      sinceHours: 24 * 8,
      title: "Your weekly recap is ready",
      body: "Open Basso to see your top songs, moods, and trends from this week.",
      type: "weekly_recap",
    } as const;
  }

  return {
    sinceHours: 4,
    title: "Fresh recommendations are waiting",
    body: "Open Basso to review new picks matched to your taste.",
    type: "recommendations",
  } as const;
}

async function getTargetUserIds(campaign: PushCampaign, since: Date, limit?: number) {
  const users = await prisma.user.findMany({
    where: {
      devicePushTokens: { some: {} },
      ...(campaign === "weekly_recap"
        ? { weeklyRecaps: { some: { createdAt: { gte: since } } } }
        : { recommendations: { some: { createdAt: { gte: since } } } }),
    },
    select: { id: true },
    take: limit,
  });

  return users.map((user) => user.id);
}

export async function dispatchPushNotificationsJob(options: DispatchOptions = {}) {
  const campaign = options.campaign ?? "recommendations";
  const defaults = getCampaignDefaults(campaign);
  const sinceHours = options.sinceHours ?? defaults.sinceHours;
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  const userIds = await getTargetUserIds(campaign, since, options.limit);
  if (!userIds.length) {
    return {
      campaign,
      sinceHours,
      targetedUsers: 0,
      queuedTokens: 0,
      sentCount: 0,
      failedCount: 0,
      invalidatedTokens: 0,
      dryRun: Boolean(options.dryRun),
    };
  }

  const tokens = await prisma.devicePushToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true, userId: true, platform: true },
  });

  if (!tokens.length || options.dryRun) {
    return {
      campaign,
      sinceHours,
      targetedUsers: userIds.length,
      queuedTokens: tokens.length,
      sentCount: 0,
      failedCount: 0,
      invalidatedTokens: 0,
      dryRun: Boolean(options.dryRun),
    };
  }

  const { results, invalidTokens } = await sendExpoPushNotifications(
    tokens.map((token) => ({
      to: token.token,
      title: defaults.title,
      body: defaults.body,
      sound: "default",
      data: {
        campaign: defaults.type,
        userId: token.userId,
        platform: token.platform,
      },
    })),
  );

  if (invalidTokens.length) {
    await prisma.devicePushToken.deleteMany({ where: { token: { in: invalidTokens } } });
  }

  const sentCount = results.filter((result) => result.ok).length;
  const failedCount = results.length - sentCount;

  return {
    campaign,
    sinceHours,
    targetedUsers: userIds.length,
    queuedTokens: tokens.length,
    sentCount,
    failedCount,
    invalidatedTokens: invalidTokens.length,
    dryRun: false,
  };
}
