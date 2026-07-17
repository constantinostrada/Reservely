/**
 * Core HTTP transport for the web UI. Every call to the backend goes through
 * `request()` — base URL, credentials, JSON handling, and error normalization
 * live here and nowhere else.
 */

export interface ApiErrorDetail {
  field: string;
  message: string;
}

interface ApiErrorBody {
  error?: string;
  message?: string;
  details?: ApiErrorDetail[];
}

/** Normalized error thrown for any non-2xx response. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ApiErrorDetail[] = []
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

// Empty by default: the API is served by the same Next.js app. Set
// NEXT_PUBLIC_API_BASE_URL to point the UI at a remote backend.
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export type QueryParams = Record<string, string | number | boolean | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: QueryParams;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, query } = options;

  const response = await fetch(buildUrl(path, query), {
    method,
    headers:
      body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    // Session lives in an httpOnly cookie; 'include' also covers a
    // cross-origin NEXT_PUBLIC_API_BASE_URL.
    credentials: 'include',
    cache: 'no-store',
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    const errorBody = (payload ?? {}) as ApiErrorBody;
    throw new ApiError(
      response.status,
      errorBody.error ?? 'Request failed',
      errorBody.message ??
        errorBody.details?.map((d) => `${d.field}: ${d.message}`).join('; ') ??
        errorBody.error ??
        `Request failed with status ${response.status}`,
      errorBody.details
    );
  }

  return payload as T;
}

function buildUrl(path: string, query?: QueryParams): string {
  let url = `${BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  return url;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
