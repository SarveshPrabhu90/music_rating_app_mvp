import type {
  DiaryCreateRequest,
  PairwiseCreateRequest,
  RecommendationPatchRequest,
} from "@/lib/api/contracts";
import { createMobileSdk, MobileSdkError } from "../../packages/mobile-sdk/src";

export { MobileSdkError as ApiClientError };

const sdk = createMobileSdk({ baseUrl: "" });

export const apiClient = {
  diaryCreate(payload: DiaryCreateRequest) {
    return sdk.createDiaryEntry(payload);
  },

  pairwiseCreate(payload: PairwiseCreateRequest) {
    return sdk.createPairwise(payload);
  },

  rankingsGet() {
    return sdk.rankings();
  },

  rankingsPatch(payload: { trackId: string; tier: DiaryCreateRequest["tier"] }) {
    return sdk.patchRanking(payload.trackId, payload.tier);
  },

  rankingsDelete(trackId: string) {
    return sdk.deleteRanking(trackId);
  },

  recommendationsGet() {
    return sdk.recommendations();
  },

  recommendationsPatch(payload: RecommendationPatchRequest) {
    return sdk.patchRecommendation(payload);
  },
};
