// Client-side data fetching utilities (NO caching, NO unstable_cache)
import type {
  ApiResponse,
  MapData,
  Granularity,
  FilterOptions,
} from "@/lib/types";

// Base fetch utility for client side ONLY
async function safeFetch<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    };
  } catch (error) {
    console.error("Client fetch error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    };
  }
}

// CLIENT SIDE postal codes data fetching (no caching)
export async function fetchPostalCodesDataClient(
  granularity: Granularity,
  options?: FilterOptions
): Promise<ApiResponse<MapData>> {
  const url = new URL("/api/postal-codes", window.location.origin);
  url.searchParams.set("granularity", granularity);

  if (options?.bounds) {
    url.searchParams.set("bounds", options.bounds.join(","));
  }

  if (options?.simplifyTolerance) {
    url.searchParams.set("tolerance", options.simplifyTolerance.toString());
  }

  return safeFetch<MapData>(url.toString());
}

// CLIENT SIDE states data fetching (no caching)
export async function fetchStatesDataClient(): Promise<ApiResponse<MapData>> {
  return safeFetch<MapData>("/api/states");
}

// Request deduplication utility for client side
const requestCache = new Map<string, Promise<unknown>>();

export function dedupedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  if (requestCache.has(key)) {
    return requestCache.get(key)! as Promise<T>;
  }

  const promise = fetchFn().finally(() => {
    requestCache.delete(key);
  });

  requestCache.set(key, promise);
  return promise;
}

// Batch fetching utility for client side
export async function fetchBatch<T>(
  requests: Array<() => Promise<ApiResponse<T>>>
): Promise<ApiResponse<T[]>> {
  try {
    const results = await Promise.allSettled(requests.map((req) => req()));

    const fulfilled = results
      .filter(
        (result): result is PromiseFulfilledResult<ApiResponse<T>> =>
          result.status === "fulfilled" && result.value.success
      )
      .map((result) => result.value.data!);

    const errors = results
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected"
      )
      .map((result) => result.reason?.message || "Unknown error");

    if (errors.length > 0) {
      console.warn("Some requests failed:", errors);
    }

    return {
      success: fulfilled.length > 0,
      data: fulfilled,
      error:
        errors.length === results.length ? "All requests failed" : undefined,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Batch request failed",
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    };
  }
}
