import type {
  DiaryCreateRequest,
  DiaryCreateResponse,
  PairwiseCreateRequest,
  PairwiseCreateResponse,
  RecommendationPatchRequest,
  RecommendationPatchResponse,
  RecommendationsGetResponse,
  RankingsDeleteResponse,
  RankingsGetResponse,
  RankingsPatchRequest,
  RankingsPatchResponse,
} from "@/lib/api/contracts";
import type { ApiEnvelope } from "@/lib/api/response";

export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: unknown;
  requestId?: string;

  constructor({
    code,
    status,
    message,
    details,
    requestId,
  }: {
    code: string;
    status: number;
    message: string;
    details?: unknown;
    requestId?: string;
  }) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

async function parseEnvelope<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiEnvelope<T>;
  const requestId = response.headers.get("x-request-id") ?? body.meta?.requestId;

  if (!response.ok || !body.ok) {
    throw new ApiClientError({
      code: body.ok ? "HTTP_ERROR" : body.error.code,
      status: response.status,
      message: body.ok ? `HTTP ${response.status}` : body.error.message,
      details: body.ok ? undefined : body.error.details,
      requestId,
    });
  }

  return body.data;
}

async function request<TResponse, TBody = undefined>(
  input: string,
  init?: {
    method?: string;
    headers?: HeadersInit;
    body?: TBody;
  },
): Promise<TResponse> {
  const response = await fetch(input, {
    method: init?.method,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });

  return parseEnvelope<TResponse>(response);
}

export const apiClient = {
  diaryCreate(payload: DiaryCreateRequest) {
    return request<DiaryCreateResponse, DiaryCreateRequest>("/api/diary", {
      method: "POST",
      body: payload,
    });
  },

  pairwiseCreate(payload: PairwiseCreateRequest) {
    return request<PairwiseCreateResponse, PairwiseCreateRequest>("/api/pairwise", {
      method: "POST",
      body: payload,
    });
  },

  rankingsGet() {
    return request<RankingsGetResponse>("/api/rankings", {
      method: "GET",
    });
  },

  rankingsPatch(payload: RankingsPatchRequest) {
    return request<RankingsPatchResponse, RankingsPatchRequest>("/api/rankings", {
      method: "PATCH",
      body: payload,
    });
  },

  rankingsDelete(trackId: string) {
    return request<RankingsDeleteResponse>(`/api/rankings?trackId=${encodeURIComponent(trackId)}`, {
      method: "DELETE",
    });
  },

  recommendationsGet() {
    return request<RecommendationsGetResponse>("/api/recommendations", {
      method: "GET",
    });
  },

  recommendationsPatch(payload: RecommendationPatchRequest) {
    return request<RecommendationPatchResponse, RecommendationPatchRequest>("/api/recommendations", {
      method: "PATCH",
      body: payload,
    });
  },
};
