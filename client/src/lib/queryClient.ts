import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        const payload = (await res.json()) as {
          message?: string;
          error?: {
            message?: string;
          };
        };
        const message = payload.error?.message || payload.message || res.statusText;
        throw new Error(`${res.status}: ${message}`);
      } catch (jsonError) {
        if (jsonError instanceof Error && /^\d+: /.test(jsonError.message)) {
          throw jsonError;
        }
      }
    }

    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // If it's a GET request and data is provided, append it as query parameters instead of body
  let finalUrl = url;
  const headers: Record<string, string> = {};
  let body: string | undefined = undefined;
  
  if (method === 'GET' || method === 'HEAD') {
    // For GET/HEAD requests, convert data to query parameters
    if (data) {
      const params = new URLSearchParams();
      Object.entries(data as Record<string, any>).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        finalUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
      }
    }
  } else {
    // For other requests, send data as JSON in body
    if (data) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }
  }

  const res = await fetch(finalUrl, {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Parse the HTTP status code from error messages formatted as "STATUS: message"
// by throwIfResNotOk. Returns null if the error is not an HTTP error.
function parseHttpStatus(error: unknown): number | null {
  if (!(error instanceof Error)) return null;
  const match = error.message.match(/^(\d{3}):/);
  if (!match) return null;
  const code = parseInt(match[1], 10);
  return Number.isInteger(code) ? code : null;
}

// Status codes that should never be retried — the server gave a definitive answer
const NO_RETRY_CODES = new Set([400, 401, 403, 404, 405, 409, 410, 422, 429]);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: unknown) => {
        const status = parseHttpStatus(error);
        // Known client error — never retry
        if (status !== null && NO_RETRY_CODES.has(status)) return false;
        // 408 Request Timeout and 5xx are retriable
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: (failureCount, error: unknown) => {
        if (!(error instanceof Error)) return false;
        const status = parseHttpStatus(error);
        // Retry on network errors (no status) or 5xx server errors only
        const isNetworkError =
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError');
        const is5xx = status !== null && status >= 500;
        return (isNetworkError || is5xx) && failureCount < 1;
      },
    },
  },
});
