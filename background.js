/**
 * Background Service Worker
 * Handles Untappd data fetching to avoid CORS issues
 */

// Import utilities (service workers don't support ES modules in all contexts)
// These are inlined for compatibility

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

// Rate limiter state
let requestTimestamps = [];
let requestQueue = [];
let processingQueue = false;

/**
 * Check if we can make a request
 */
function canRequest() {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(time => now - time < RATE_LIMIT_WINDOW_MS);
  return requestTimestamps.length < RATE_LIMIT_REQUESTS;
}

/**
 * Get wait time until next request allowed
 */
function getWaitTime() {
  if (canRequest()) return 0;
  const now = Date.now();
  const oldestRequest = Math.min(...requestTimestamps);
  return Math.max(0, RATE_LIMIT_WINDOW_MS - (now - oldestRequest));
}

/**
 * Cache management
 */
async function getCachedRating(brewery, beerName) {
  const key = generateCacheKey(brewery, beerName);
  const result = await chrome.storage.local.get('beerRatingsCache');
  const cache = result.beerRatingsCache || {};

  const entry = cache[key];
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    delete cache[key];
    await chrome.storage.local.set({ beerRatingsCache: cache });
    return null;
  }

  return entry.data;
}

async function setCachedRating(brewery, beerName, data) {
  const key = generateCacheKey(brewery, beerName);
  const result = await chrome.storage.local.get('beerRatingsCache');
  const cache = result.beerRatingsCache || {};

  cache[key] = {
    data,
    timestamp: Date.now()
  };

  await chrome.storage.local.set({ beerRatingsCache: cache });
}

function generateCacheKey(brewery, beerName) {
  const normalizedName = beerName.toLowerCase().trim().replace(/\s+/g, '_');
  const normalizedBrewery = brewery.toLowerCase().trim().replace(/\s+/g, '_');
  return `${normalizedBrewery}_${normalizedName}`;
}

/**
 * Fetch beer rating from Untappd
 */
async function fetchBeerRating(beerName, brewery) {
  // Check cache first
  const cached = await getCachedRating(brewery, beerName);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  // Check API key
  const apiKeyResult = await chrome.storage.sync.get('untappdApiKey');
  const apiKey = apiKeyResult.untappdApiKey;

  let result;
  if (apiKey) {
    result = await fetchViaAPI(beerName, brewery, apiKey);
  } else {
    result = await fetchViaScrape(beerName, brewery);
  }

  // Cache the result
  if (result && !result.error) {
    await setCachedRating(brewery, beerName, result);
  }

  return result;
}

/**
 * Fetch via Untappd API
 */
async function fetchViaAPI(beerName, brewery, apiKey) {
  try {
    const query = encodeURIComponent(`${beerName} ${brewery}`);
    const url = `https://api.untappd.com/v4/search/beer?q=${query}&client_id=${apiKey.clientId}&client_secret=${apiKey.clientSecret}`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        await chrome.storage.sync.remove('untappdApiKey');
        return fetchViaScrape(beerName, brewery);
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.response?.beers?.items?.length > 0) {
      const beer = data.response.beers.items[0].beer;
      return {
        found: true,
        rating: beer.rating_score,
        ratingCount: beer.rating_count,
        beerName: beer.beer_name,
        beerUrl: `https://untappd.com/b/${beer.beer_slug}/${beer.bid}`,
        source: 'api'
      };
    }

    return { found: false, source: 'api' };
  } catch (error) {
    console.error('API fetch error:', error);
    return fetchViaScrape(beerName, brewery);
  }
}

/**
 * Fetch via scraping Untappd search
 */
async function fetchViaScrape(beerName, brewery) {
  try {
    const query = encodeURIComponent(`${beerName} ${brewery}`);
    const url = `https://untappd.com/search?q=${query}&type=beer`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!response.ok) {
      throw new Error(`Scrape error: ${response.status}`);
    }

    const html = await response.text();
    return parseSearchResults(html, beerName);
  } catch (error) {
    console.error('Scrape fetch error:', error);
    return { found: false, error: error.message, source: 'scrape' };
  }
}

/**
 * Parse Untappd search results HTML
 */
function parseSearchResults(html, originalBeerName) {
  try {
    // Look for rating patterns in the HTML
    // Untappd typically shows ratings like "4.12" or "(4.12)"

    // Try to find beer-item blocks first
    const beerItemMatch = html.match(/<div[^>]*class="[^"]*beer-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);

    if (beerItemMatch) {
      const itemHtml = beerItemMatch[1];

      // Extract rating (usually in format like "4.12" or in a span with class containing "rating")
      const ratingMatch = itemHtml.match(/class="[^"]*num[^"]*"[^>]*>([0-9.]+)/i) ||
                          itemHtml.match(/rating[^>]*>([0-9.]+)/i) ||
                          itemHtml.match(/>([0-4]\.\d{1,2})</);

      // Extract rating count (handle both comma and dot as thousands separators)
      const countMatch = itemHtml.match(/class="[^"]*raters[^"]*"[^>]*>\(?([\d.,]+)/i) ||
                         itemHtml.match(/\(([\d.,]+)\)/) ||
                         itemHtml.match(/([\d.,]+)\s*Ratings?/i);

      // Extract beer URL
      const urlMatch = itemHtml.match(/href="(\/b\/[^"]+)"/i);

      // Extract beer name
      const nameMatch = itemHtml.match(/class="[^"]*name[^"]*"[^>]*>([^<]+)/i) ||
                        itemHtml.match(/<a[^>]*href="\/b\/[^"]*"[^>]*>([^<]+)/i);

      // Parse rating count (remove both comma and dot thousands separators)
      const ratingCount = countMatch ? parseInt(countMatch[1].replace(/[.,]/g, ''), 10) : null;

      // Only treat as unrated if we explicitly found "(0)" - i.e., countMatch exists but parsed to 0
      if (countMatch && ratingCount === 0) {
        return {
          found: true,
          rating: null,
          ratingCount: 0,
          beerName: nameMatch ? nameMatch[1].trim() : originalBeerName,
          beerUrl: urlMatch ? `https://untappd.com${urlMatch[1]}` : null,
          source: 'scrape',
          unrated: true
        };
      }

      if (ratingMatch) {
        return {
          found: true,
          rating: parseFloat(ratingMatch[1]),
          ratingCount: ratingCount,
          beerName: nameMatch ? nameMatch[1].trim() : originalBeerName,
          beerUrl: urlMatch ? `https://untappd.com${urlMatch[1]}` : null,
          source: 'scrape'
        };
      }
    }

    // Fallback: search the full HTML for rating patterns
    // First check if this is an unrated beer - look for "(0)" pattern
    const fallbackCountMatch = html.match(/\((\d[\d.,]*)\)/);
    const fallbackCount = fallbackCountMatch ? parseInt(fallbackCountMatch[1].replace(/[.,]/g, ''), 10) : null;

    // Extract beer URL from full HTML
    const fallbackUrlMatch = html.match(/href="(\/b\/[^"]+)"/i);

    // If we found "(0)", it's unrated
    if (fallbackCount === 0) {
      return {
        found: true,
        rating: null,
        ratingCount: 0,
        beerName: originalBeerName,
        beerUrl: fallbackUrlMatch ? `https://untappd.com${fallbackUrlMatch[1]}` : null,
        source: 'scrape',
        unrated: true
      };
    }

    // Otherwise try to find a rating
    const fallbackRatingMatch = html.match(/class="[^"]*caps[^"]*"[^>]*[^>]*>.*?([0-4]\.\d{1,2})/is) ||
                                html.match(/rating_score[^>]*>([0-4]\.\d{1,2})/i);

    if (fallbackRatingMatch) {
      return {
        found: true,
        rating: parseFloat(fallbackRatingMatch[1]),
        ratingCount: fallbackCount,
        beerName: originalBeerName,
        beerUrl: fallbackUrlMatch ? `https://untappd.com${fallbackUrlMatch[1]}` : null,
        source: 'scrape'
      };
    }

    return { found: false, source: 'scrape' };
  } catch (error) {
    console.error('Parse error:', error);
    return { found: false, error: error.message, source: 'scrape' };
  }
}

/**
 * Process queued requests with rate limiting
 */
async function processQueue() {
  if (processingQueue || requestQueue.length === 0) return;

  processingQueue = true;

  while (requestQueue.length > 0) {
    const waitTime = getWaitTime();

    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const { beerName, brewery, sendResponse } = requestQueue.shift();
    requestTimestamps.push(Date.now());

    try {
      const result = await fetchBeerRating(beerName, brewery);
      sendResponse(result);
    } catch (error) {
      sendResponse({ found: false, error: error.message });
    }
  }

  processingQueue = false;
}

/**
 * Message handler for content script communication
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBeerRating') {
    // Add to queue with rate limiting
    requestQueue.push({
      beerName: request.beerName,
      brewery: request.brewery,
      sendResponse
    });
    processQueue();
    return true; // Keep message channel open for async response
  }

  if (request.action === 'clearCache') {
    chrome.storage.local.remove('beerRatingsCache').then(() => {
      chrome.storage.local.remove('cacheStats').then(() => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'getCacheStats') {
    chrome.storage.local.get(['beerRatingsCache', 'cacheStats']).then(result => {
      const cache = result.beerRatingsCache || {};
      const stats = result.cacheStats || { hits: 0, misses: 0 };
      sendResponse({
        cachedBeers: Object.keys(cache).length,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hits + stats.misses > 0
          ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100)
          : 0
      });
    });
    return true;
  }

  if (request.action === 'getDataSource') {
    chrome.storage.sync.get('untappdApiKey').then(result => {
      sendResponse({ source: result.untappdApiKey ? 'api' : 'scrape' });
    });
    return true;
  }

  if (request.action === 'getExtensionEnabled') {
    chrome.storage.sync.get('extensionEnabled').then(result => {
      sendResponse({ enabled: result.extensionEnabled !== false }); // Default to true
    });
    return true;
  }

  if (request.action === 'setExtensionEnabled') {
    chrome.storage.sync.set({ extensionEnabled: request.enabled }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'saveApiKey') {
    chrome.storage.sync.set({ untappdApiKey: request.apiKey }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'clearApiKey') {
    chrome.storage.sync.remove('untappdApiKey').then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Log when service worker starts
console.log('Beer Rating Injector background service worker started');
