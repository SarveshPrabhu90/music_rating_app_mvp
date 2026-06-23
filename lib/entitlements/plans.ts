import { SubscriptionPlan } from "@prisma/client";

export type FeatureKey =
  | "priorityRecommendations"
  | "weeklyRecapArchive"
  | "advancedInsights"
  | "friendsMode";

const PLAN_FEATURES: Record<SubscriptionPlan, Record<FeatureKey, boolean>> = {
  FREE: {
    priorityRecommendations: false,
    weeklyRecapArchive: false,
    advancedInsights: false,
    friendsMode: false,
  },
  PLUS: {
    priorityRecommendations: true,
    weeklyRecapArchive: true,
    advancedInsights: false,
    friendsMode: false,
  },
  PRO: {
    priorityRecommendations: true,
    weeklyRecapArchive: true,
    advancedInsights: true,
    friendsMode: true,
  },
};

const RECOMMENDATION_LIMITS: Record<SubscriptionPlan, number> = {
  FREE: 5,
  PLUS: 8,
  PRO: 12,
};

export function normalizeSubscriptionPlan(plan?: SubscriptionPlan | null) {
  return plan ?? SubscriptionPlan.FREE;
}

export function hasFeatureAccess(plan: SubscriptionPlan | null | undefined, feature: FeatureKey) {
  return PLAN_FEATURES[normalizeSubscriptionPlan(plan)][feature];
}

export function getPlanRecommendationLimit(plan: SubscriptionPlan | null | undefined) {
  return RECOMMENDATION_LIMITS[normalizeSubscriptionPlan(plan)];
}

export function getPlanFeatures(plan: SubscriptionPlan | null | undefined) {
  return PLAN_FEATURES[normalizeSubscriptionPlan(plan)];
}