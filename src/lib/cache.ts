interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

export const cache = new MemCache();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== null) return hit;
  const value = await fetcher();
  cache.set(key, value, ttlMs);
  return value;
}
