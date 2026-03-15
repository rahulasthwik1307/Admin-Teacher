import { useState, useEffect, useCallback, useRef } from "react"

interface CacheEntry<T> {
  data: T
  timestamp: number
}

// Global in-memory cache — lives as long as the tab is open
const cache = new Map<string, CacheEntry<unknown>>()

const CACHE_TTL_MS = 30_000 // 30 seconds

export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number; skip?: boolean }
) {
  const ttl = options?.ttl ?? CACHE_TTL_MS
  const skip = options?.skip ?? false

  const [data, setData] = useState<T | null>(() => {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T
    }
    return null
  })
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const cached = cache.get(key)
    return !cached || Date.now() - cached.timestamp >= ttl
  })
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(async (force = false) => {
    if (skip) return
    const cached = cache.get(key)
    const isFresh = cached && Date.now() - cached.timestamp < ttl

    if (!force && isFresh) {
      setData(cached.data as T)
      setIsLoading(false)
      return
    }

    // Show cached data immediately while refreshing in background
    if (cached) {
      setData(cached.data as T)
      setIsLoading(false)
    } else {
      setIsLoading(true)
    }

    try {
      const result = await fetcherRef.current()
      cache.set(key, { data: result, timestamp: Date.now() })
      setData(result)
      setError(null)
    } catch (err) {
      setError("Failed to load data")
      console.error(`useCachedFetch error for key "${key}":`, err)
    } finally {
      setIsLoading(false)
    }
  }, [key, ttl, skip])

  useEffect(() => {
    load()
  }, [load])

  const invalidate = useCallback(() => {
    cache.delete(key)
    load(true)
  }, [key, load])

  const invalidateAll = useCallback(() => {
    cache.clear()
    load(true)
  }, [load])

  return { data, isLoading, error, refetch: () => load(true), invalidate, invalidateAll }
}

// Standalone cache invalidation — call this after any mutation (add/edit/delete)
export function invalidateCache(key: string) {
  cache.delete(key)
}

export function invalidateAllCache() {
  cache.clear()
}
