import { unstable_cache } from "next/cache";
import type {
  ApiResponse,
  CacheConfig,
  MapData,
  Granularity,
  FilterOptions,
} from "@/lib/types";

// Base fetch utility with proper error handling
async function safeFetch<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const startTime = performance.now();

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
    const processingTime = Math.round(performance.now() - startTime);

    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    };
  } catch (error) {
    console.error("Fetch error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    };
  }
}

// Cached data fetching with automatic revalidation
export function createCachedFetcher<T>(
  fetchFn: () => Promise<T>,
  cacheConfig: CacheConfig
) {
  return unstable_cache(fetchFn, [cacheConfig.key || "default"], {
    tags: cacheConfig.tags,
    revalidate: cacheConfig.ttl,
  });
}

// Postal codes data fetching with caching
export const fetchPostalCodesData = createCachedFetcher(
  async (granularity: Granularity, options?: FilterOptions) => {
    const url = new URL("/api/postal-codes", window.location.origin);
    url.searchParams.set("granularity", granularity);

    if (options?.bounds) {
      url.searchParams.set("bounds", options.bounds.join(","));
    }

    if (options?.simplifyTolerance) {
      url.searchParams.set("tolerance", options.simplifyTolerance.toString());
    }

    return safeFetch<MapData>(url.toString());
  },
  {
    ttl: 3600, // 1 hour
    tags: ["postal-codes"],
    key: "postal-codes-data",
  }
);

// States data fetching with caching
export const fetchStatesData = createCachedFetcher(
  async () => {
    return safeFetch<MapData>("/api/states");
  },
  {
    ttl: 86400, // 24 hours
    tags: ["states"],
    key: "states-data",
  }
);

// Batch fetching utility
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

// Request deduplication utility
const requestCache = new Map<string, Promise<any>>();

export function dedupedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  if (requestCache.has(key)) {
    return requestCache.get(key)!;
  }

  const promise = fetchFn().finally(() => {
    // Clean up after request completes
    requestCache.delete(key);
  });

  requestCache.set(key, promise);
  return promise;
}

// Streaming data fetcher for large datasets
export async function* fetchStream<T>(
  url: string,
  options?: RequestInit & { chunkSize?: number }
): AsyncGenerator<T[], void, unknown> {
  const chunkSize = options?.chunkSize || 1000;
  let offset = 0;

  while (true) {
    const chunkUrl = new URL(url);
    chunkUrl.searchParams.set("offset", offset.toString());
    chunkUrl.searchParams.set("limit", chunkSize.toString());

    const response = await safeFetch<T[]>(chunkUrl.toString());

    if (!response.success || !response.data || response.data.length === 0) {
      break;
    }

    yield response.data;

    if (response.data.length < chunkSize) {
      break; // Last chunk
    }

    offset += chunkSize;
  }
}

// Retry utility with exponential backoff
export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
