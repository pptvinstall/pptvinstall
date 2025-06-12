import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors except 408 (timeout)
        if (error instanceof Error && error.message.includes('4')) {
          const statusCode = parseInt(error.message.split(':')[0]);
          if (statusCode >= 400 && statusCode < 500 && statusCode !== 408) {
            return false;
          }
        }
        return failureCount < 2; // Max 2 retries
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: (failureCount, error: unknown) => {
        // Only retry mutations on network errors or 5xx errors
        if (error instanceof Error) {
          const isNetworkError = error.message.includes('Failed to fetch') || 
                                error.message.includes('NetworkError');
          const is5xxError = error.message.match(/^5\d\d:/) !== null;
          return (isNetworkError || is5xxError) && failureCount < 1;
        }
        return false;
      },
    },
  },
});
