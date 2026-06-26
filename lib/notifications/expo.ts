type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
};

type ExpoPushResult = {
  token: string;
  ok: boolean;
  details?: string;
};

type ExpoPushResponse = {
  data?: Array<{
    status: "ok" | "error";
    details?: { error?: string };
    message?: string;
  }>;
};

export async function sendExpoPushNotifications(
  messages: ExpoPushMessage[],
  fetchImpl: typeof fetch = fetch,
): Promise<{ results: ExpoPushResult[]; invalidTokens: string[] }> {
  if (!messages.length) {
    return { results: [], invalidTokens: [] };
  }

  const endpoint = process.env.EXPO_PUSH_API_URL ?? "https://exp.host/--/api/v2/push/send";
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(messages),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Expo push request failed: ${response.status} ${text}`);
  }

  const payload = (text ? JSON.parse(text) : {}) as ExpoPushResponse;
  const rawResults = payload.data ?? [];

  const results = messages.map((message, index) => {
    const result = rawResults[index];
    if (!result) {
      return {
        token: message.to,
        ok: false,
        details: "Missing Expo response item.",
      };
    }

    if (result.status === "ok") {
      return {
        token: message.to,
        ok: true,
      };
    }

    return {
      token: message.to,
      ok: false,
      details: result.details?.error ?? result.message ?? "Unknown Expo push error.",
    };
  });

  const invalidTokens = results
    .filter((result) => result.details === "DeviceNotRegistered")
    .map((result) => result.token);

  return { results, invalidTokens };
}
