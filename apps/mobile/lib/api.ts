import { API_BASE_URL } from "@/lib/config";
import { clearToken, getToken, setToken } from "@/lib/storage";
import { createMobileSdk } from "../../../packages/mobile-sdk/src";

const sdk = createMobileSdk({ baseUrl: API_BASE_URL, getToken });

export const mobileApi = {
  async signIn(email: string, password: string, deviceName = "Expo App") {
    const data = await sdk.login({ email, password, deviceName });
    await setToken(data.token);
    return data;
  },
  async signOut() {
    try {
      await sdk.logout();
    } finally {
      await clearToken();
    }
  },
  getBootstrap() {
    return sdk.bootstrap();
  },
  getDashboard() {
    return sdk.dashboard();
  },
  getFeed() {
    return sdk.feed();
  },
  getFriends() {
    return sdk.friends();
  },
  searchPeople(query: string) {
    return sdk.searchPeople(query);
  },
  searchCatalog(query: string) {
    return sdk.searchCatalog(query);
  },
  createDiaryEntry(payload: { trackId: string; tier: "LIFE_SONG" | "ELITE" | "HEAVY_ROTATION" | "LIKED" | "NOT_FOR_ME"; note?: string; tags: string[] }) {
    return sdk.createDiaryEntry(payload);
  },
  getRankings() {
    return sdk.rankings();
  },
  patchRanking(trackId: string, tier: "LIFE_SONG" | "ELITE" | "HEAVY_ROTATION" | "LIKED" | "NOT_FOR_ME") {
    return sdk.patchRanking(trackId, tier);
  },
  deleteRanking(trackId: string) {
    return sdk.deleteRanking(trackId);
  },
  createPairwise(payload: { leftTrackId: string; rightTrackId: string; winnerTrackId: string }) {
    return sdk.createPairwise(payload);
  },
  getRecommendations() {
    return sdk.recommendations();
  },
  patchRecommendation(payload: { trackId: string; action: "save" | "dismiss" }) {
    return sdk.patchRecommendation(payload);
  },
  registerPushToken(payload: { token: string; platform: "ios" | "android" }) {
    return sdk.registerPushToken(payload);
  },
};

export const sharedSdk = sdk;