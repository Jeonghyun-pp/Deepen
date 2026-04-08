// ── 인메모리 TTL 캐시 (MVP용) ──
// DB 도입 전까지 사용하는 간단한 Map 기반 캐시

/** 캐시 엔트리 */
export interface CacheEntry<T> {
  data: T;
  createdAt: number;
  ttl: number;
}

export interface Cache<T> {
  get(key: string): T | null;
  set(key: string, data: T): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  size(): number;
}

export function createCache<T>(ttlMs: number): Cache<T> {
  const store = new Map<string, CacheEntry<T>>();

  function isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.createdAt > entry.ttl;
  }

  // 주기적 정리 — 100개 초과 시 만료 항목 제거
  function evictIfNeeded(): void {
    if (store.size <= 100) return;
    for (const [key, entry] of store) {
      if (isExpired(entry)) {
        store.delete(key);
      }
    }
  }

  return {
    get(key: string): T | null {
      const entry = store.get(key);
      if (!entry) return null;
      if (isExpired(entry)) {
        store.delete(key);
        return null;
      }
      return entry.data;
    },

    set(key: string, data: T): void {
      evictIfNeeded();
      store.set(key, { data, createdAt: Date.now(), ttl: ttlMs });
    },

    has(key: string): boolean {
      return this.get(key) !== null;
    },

    delete(key: string): void {
      store.delete(key);
    },

    clear(): void {
      store.clear();
    },

    size(): number {
      return store.size;
    },
  };
}

// 범용 캐시 인스턴스: 30일 TTL
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
export const defaultCache = createCache<unknown>(THIRTY_DAYS_MS);
