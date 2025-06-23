interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

class InMemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTLHours: number = 1) {
    this.defaultTTL = defaultTTLHours * 60 * 60 * 1000; // Convert hours to milliseconds
  }

  getFromCache<T>(key: string, checkExpiry: boolean = true): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired (unless explicitly told not to)
    if (checkExpiry && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  setToCache<T>(key: string, data: T, customTTLHours?: number): void {
    const ttl = customTTLHours ? customTTLHours * 60 * 60 * 1000 : this.defaultTTL;
    const expiresAt = Date.now() + ttl;
    
    this.cache.set(key, {
      data,
      expiresAt
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Clean up expired items
  cleanupExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache size
  size(): number {
    return this.cache.size;
  }
}

// Create and export a singleton instance
const cache = new InMemoryCache();

export const getFromCache = <T>(key: string, checkExpiry: boolean = true): T | null => 
  cache.getFromCache<T>(key, checkExpiry);
export const setToCache = <T>(key: string, data: T, customTTLHours?: number): void => 
  cache.setToCache<T>(key, data, customTTLHours);
export const clearCache = (): void => cache.clearCache();
export const cleanupExpired = (): void => cache.cleanupExpired();
export const getCacheSize = (): number => cache.size();

export default cache; 