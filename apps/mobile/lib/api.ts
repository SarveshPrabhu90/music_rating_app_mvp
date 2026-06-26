import { API_BASE_URL } from "@/lib/config";
import { clearToken, getToken, setToken } from "@/lib/storage";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
  };
};

async function request<T>(path: string, init?: RequestInit, withAuth = true): Promise<T> {
  const token = withAuth ? await getToken() : null;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as Envelope<T>;
  if (!response.ok || !body.ok) {
    throw new Error(body.error?.message ?? `HTTP ${response.status}`);
  }
  return body.data as T;
}

export const mobileApi = {
  async signIn(email: string, password: string, deviceName = "Expo App") {
    const data = await request<{ token: string; expiresAt: string; user: { id: string; name: string } }>(
      "/api/mobile/session",
      {
        method: "POST",
        body: JSON.stringify({ email, password, deviceName }),
      },
      false,
    );
    await setToken(data.token);
    return data;
  },
  async signOut() {
    try {
      await request("/api/mobile/session", { method: "DELETE" });
    } finally {
      await clearToken();
    }
  },
  getBootstrap() {
    return request<{
      user: { id: string; name: string; username: string; subscriptionPlan: string };
      features: Record<string, boolean>;
      counts: { ratings: number; rankings: number; friends: number; recommendations: number };
    }>("/api/mobile/bootstrap");
  },
  getDashboard() {
    return request<{
      summary: {
        recentEntries: Array<{ id: string; tierLabel: string; track: { title: string; artistName: string } }>;
        topRankings: Array<{ id: string; score: number; track: { title: string; artistName: string } }>;
        tastePulse: {
          tags: string[];
          recommendation: null | { track: { title: string; artistName: string } };
          rankingConfidencePercent: number;
          unstableCount: number;
        };
      };
      feedPreview: Array<{ id: string; type: string; text: string; user: { name: string; username: string } }>;
      counts: { ratings: number; rankings: number; friends: number };
    }>("/api/mobile/dashboard");
  },
  getFeed() {
    return request<{ items: Array<{ id: string; type: string; text: string; meta: string; user: { name: string; username: string } }> }>("/api/feed");
  },
  getFriends() {
    return request<{
      accepted: Array<{ id: string; user: { id: string; name: string; username: string } }>;
      incoming: Array<{ id: string; user: { id: string; name: string; username: string } }>;
      outgoing: Array<{ id: string; user: { id: string; name: string; username: string } }>;
    }>("/api/friends");
  },
  searchPeople(query: string) {
    return request<{ results: Array<{ id: string; name: string; username: string; relationship: string; bio: string | null }> }>(
      `/api/people/search?q=${encodeURIComponent(query)}`,
    );
  },
};