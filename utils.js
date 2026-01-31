/**
 * Utility functions for caching and rate limiting
 */

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Cache manager for beer ratings
 */
class CacheManager {
  constructor() {
    this.storageKey = 'beerRatingsCache';
    this.statsKey = 'cacheStats';
  }

  /**
   * Generate cache key for a beer
   */
  generateKey(brewery, beerName) {
    const normalizedName = beerName.toLowerCase().trim().replace(/\s+/g, '_');
    const normalizedBrewery = brewery.toLowerCase().trim().replace(/\s+/g, '_');
    return `${normalizedBrewery}_${normalizedName}`;
  }

  /**
   * Get cached rating for a beer
   * @returns {Object|null} Cached rating data or null if not found/expired
   */
  async get(brewery, beerName) {
    try {
      const result = await chrome.storage.local.get([this.storageKey, this.statsKey]);
      const cache = result[this.storageKey] || {};
      const stats = result[this.statsKey] || { hits: 0, misses: 0 };

      const key = this.generateKey(brewery, beerName);
      const entry = cache[key];

      if (!entry) {
        stats.misses++;
        await chrome.storage.local.set({ [this.statsKey]: stats });
        return null;
      }

      // Check if expired
      if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        delete cache[key];
        await chrome.storage.local.set({ [this.storageKey]: cache });
        stats.misses++;
        await chrome.storage.local.set({ [this.statsKey]: stats });
        return null;
      }

      stats.hits++;
      await chrome.storage.local.set({ [this.statsKey]: stats });
      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Store rating in cache
   */
  async set(brewery, beerName, data) {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      const cache = result[this.storageKey] || {};

      const key = this.generateKey(brewery, beerName);
      cache[key] = {
        data,
        timestamp: Date.now()
      };

      await chrome.storage.local.set({ [this.storageKey]: cache });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Clear all cached ratings
   */
  async clear() {
    try {
      await chrome.storage.local.remove([this.storageKey, this.statsKey]);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const result = await chrome.storage.local.get([this.storageKey, this.statsKey]);
      const cache = result[this.storageKey] || {};
      const stats = result[this.statsKey] || { hits: 0, misses: 0 };

      return {
        cachedBeers: Object.keys(cache).length,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hits + stats.misses > 0
          ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100)
          : 0
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { cachedBeers: 0, hits: 0, misses: 0, hitRate: 0 };
    }
  }
}

/**
 * Rate limiter to prevent too many requests
 */
class RateLimiter {
  constructor(maxRequests = RATE_LIMIT_REQUESTS, windowMs = RATE_LIMIT_WINDOW_MS) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
    this.queue = [];
    this.processing = false;
  }

  /**
   * Check if we can make a request now
   */
  canRequest() {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length < this.maxRequests;
  }

  /**
   * Record a request
   */
  recordRequest() {
    this.requests.push(Date.now());
  }

  /**
   * Get time until next request is allowed (in ms)
   */
  getWaitTime() {
    if (this.canRequest()) return 0;

    const now = Date.now();
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, this.windowMs - (now - oldestRequest));
  }

  /**
   * Execute a function with rate limiting
   * Returns a promise that resolves when the function can be executed
   */
  async execute(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const waitTime = this.getWaitTime();

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const { fn, resolve, reject } = this.queue.shift();
      this.recordRequest();

      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }
}

/**
 * Simple fuzzy string matching for beer names
 * Returns a score between 0 and 1
 */
function fuzzyMatch(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 1;

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Calculate Levenshtein distance based similarity
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(s1, s2);
  return 1 - (distance / maxLen);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;

  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CacheManager, RateLimiter, fuzzyMatch };
}
