/**
 * Untappd Service - Abstraction layer for fetching beer ratings
 * Supports both scraping (default) and API (when key available)
 */

class UntappdService {
  constructor() {
    this.baseUrl = 'https://untappd.com';
    this.searchUrl = 'https://untappd.com/search';
    this.apiBaseUrl = 'https://api.untappd.com/v4';
  }

  /**
   * Get beer rating - main entry point
   * @param {string} beerName - Name of the beer
   * @param {string} brewery - Brewery name for search refinement
   * @returns {Promise<Object>} Rating data
   */
  async getBeerRating(beerName, brewery) {
    const apiKey = await this.getApiKey();

    if (apiKey) {
      return this.fetchViaAPI(beerName, brewery, apiKey);
    } else {
      return this.fetchViaScrape(beerName, brewery);
    }
  }

  /**
   * Fetch rating via Untappd API (for future use)
   * @param {string} beerName
   * @param {string} brewery
   * @param {string} apiKey
   * @returns {Promise<Object>}
   */
  async fetchViaAPI(beerName, brewery, apiKey) {
    try {
      const query = encodeURIComponent(`${beerName} ${brewery}`);
      const url = `${this.apiBaseUrl}/search/beer?q=${query}&client_id=${apiKey.clientId}&client_secret=${apiKey.clientSecret}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          // Invalid API key - clear it and fall back to scraping
          await this.clearApiKey();
          return this.fetchViaScrape(beerName, brewery);
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.response && data.response.beers && data.response.beers.items.length > 0) {
        const beer = data.response.beers.items[0].beer;
        return {
          found: true,
          rating: beer.rating_score,
          ratingCount: beer.rating_count,
          beerName: beer.beer_name,
          beerUrl: `${this.baseUrl}/b/${beer.beer_slug}/${beer.bid}`,
          source: 'api'
        };
      }

      return { found: false, source: 'api' };
    } catch (error) {
      console.error('API fetch error:', error);
      // Fall back to scraping on API error
      return this.fetchViaScrape(beerName, brewery);
    }
  }

  /**
   * Fetch rating via scraping Untappd search results
   * @param {string} beerName
   * @param {string} brewery
   * @returns {Promise<Object>}
   */
  async fetchViaScrape(beerName, brewery) {
    try {
      const query = encodeURIComponent(`${beerName} ${brewery}`);
      const url = `${this.searchUrl}?q=${query}&type=beer`;

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
      return this.parseSearchResults(html, beerName, brewery);
    } catch (error) {
      console.error('Scrape fetch error:', error);
      return { found: false, error: error.message, source: 'scrape' };
    }
  }

  /**
   * Parse Untappd search results HTML
   * @param {string} html
   * @param {string} originalBeerName
   * @param {string} brewery
   * @returns {Object}
   */
  parseSearchResults(html, originalBeerName, brewery) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Look for beer items in search results
      const beerItems = doc.querySelectorAll('.beer-item, .results-container .beer-result, [class*="beer-item"]');

      if (beerItems.length === 0) {
        // Try alternative selectors
        const altItems = doc.querySelectorAll('.results-list-container .beer-details, .result-item');
        if (altItems.length === 0) {
          return { found: false, source: 'scrape' };
        }
      }

      // Get first result (most relevant)
      const firstResult = beerItems[0] || doc.querySelector('.beer-details, .result-item');

      if (!firstResult) {
        return { found: false, source: 'scrape' };
      }

      // Extract rating
      const ratingEl = firstResult.querySelector('.rating, .num, [class*="rating"], .caps');
      const ratingCountEl = firstResult.querySelector('.raters, .count, [class*="count"]');
      const nameEl = firstResult.querySelector('.name, .beer-name, h1, h2, a[href*="/b/"]');
      const linkEl = firstResult.querySelector('a[href*="/b/"]');

      let rating = null;
      let ratingCount = null;
      let beerUrl = null;
      let foundBeerName = null;

      if (ratingEl) {
        const ratingText = ratingEl.textContent.trim();
        const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
        if (ratingMatch) {
          rating = parseFloat(ratingMatch[1]);
        }
      }

      if (ratingCountEl) {
        const countText = ratingCountEl.textContent.trim();
        const countMatch = countText.match(/(\d[\d,]*)/);
        if (countMatch) {
          ratingCount = parseInt(countMatch[1].replace(/,/g, ''), 10);
        }
      }

      if (linkEl) {
        beerUrl = linkEl.href.startsWith('http') ? linkEl.href : `${this.baseUrl}${linkEl.getAttribute('href')}`;
      }

      if (nameEl) {
        foundBeerName = nameEl.textContent.trim();
      }

      if (rating !== null) {
        return {
          found: true,
          rating,
          ratingCount,
          beerName: foundBeerName || originalBeerName,
          beerUrl,
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
   * Get stored API key from chrome.storage.sync
   * @returns {Promise<Object|null>}
   */
  async getApiKey() {
    try {
      const result = await chrome.storage.sync.get('untappdApiKey');
      return result.untappdApiKey || null;
    } catch (error) {
      console.error('Error getting API key:', error);
      return null;
    }
  }

  /**
   * Save API key to chrome.storage.sync
   * @param {Object} apiKey - { clientId, clientSecret }
   */
  async saveApiKey(apiKey) {
    try {
      await chrome.storage.sync.set({ untappdApiKey: apiKey });
    } catch (error) {
      console.error('Error saving API key:', error);
      throw error;
    }
  }

  /**
   * Clear stored API key
   */
  async clearApiKey() {
    try {
      await chrome.storage.sync.remove('untappdApiKey');
    } catch (error) {
      console.error('Error clearing API key:', error);
    }
  }

  /**
   * Check current data source mode
   * @returns {Promise<string>} 'api' or 'scrape'
   */
  async getDataSource() {
    const apiKey = await this.getApiKey();
    return apiKey ? 'api' : 'scrape';
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UntappdService };
}
