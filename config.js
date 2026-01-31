/**
 * Brewery-specific configurations for DOM selectors and search parameters.
 * Add new breweries here to extend the extension.
 */
const BREWERY_CONFIGS = {
  'cloudwaterbrew.co': {
    name: 'Cloudwater',
    breweryNameForSearch: 'Cloudwater',

    // DOM Selectors (multiple fallbacks for theme variations)
    beerCardSelector: 'card-product, .product-item, .product-card, .grid__item:has(a[href*="/products/"])',
    beerNameSelector: '.card-information__text a, .product-item__title, .card__heading a, h3 a, .product-title',
    priceSelector: '.price, .product-price, .card-information .price',
    cardTextSelector: '.card-information, .card__text, .product-item__info',

    // Where to inject the rating (relative to card)
    injectionTarget: '.card-information, .card__text, .product-item__info',
    injectionPosition: 'afterbegin', // 'beforeend', 'afterbegin', 'beforebegin', 'afterend'

    // Optional: transform beer name before searching
    transformBeerName: (name) => {
      // Extract beer name before the pipe (style descriptor)
      // e.g., "SOCAL | BRIGHT PALE" -> "SoCal"
      // e.g., "PICCADILLY PILSNER | LAGER" -> "Piccadilly Pilsner"
      let beerName = name.split('|')[0].trim();

      // Remove common suffixes/prefixes that might interfere with search
      beerName = beerName
        .replace(/\s*\([^)]*x[^)]*\)/gi, '') // Remove bracketed collaborations (e.g., "(Collab x Brewery)")
        .replace(/\s+x\s+/gi, ' ')            // Remove collaboration "x" (e.g., "Beer x Brewery" -> "Beer Brewery")
        .replace(/\s*-\s*\d+ml$/i, '')        // Remove size indicators
        .replace(/\s*\(\d+ pack\)$/i, '')     // Remove pack info
        .trim();

      return beerName;
    }
  },

  'azvexbrewing.com': {
    name: 'Azvex',
    breweryNameForSearch: 'Azvex',

    // Selectors for Azvex custom WooCommerce theme (Themify Builder)
    beerCardSelector: '.tmb-woocommerce, .tmb.tmb-woocommerce-variable-product',
    beerNameSelector: '.t-entry-title a, .product-title a, h3 a, a[href*="/shop/"]',
    priceSelector: '.price',
    cardTextSelector: '.t-entry-text-tc, .tmb-content-under',

    // Inject after the title area
    injectionTarget: '.t-entry-title, .product-title, .t-entry-text-tc',
    injectionPosition: 'afterend',

    transformBeerName: (name) => {
      // Azvex format: "BROWNIAN MOTION – 6.5% IPA – 440ML CAN"
      // Extract just the beer name before the first em-dash with ABV
      let beerName = name
        .split('–')[0]                        // Take text before first em-dash
        .split('-')[0]                        // Also handle regular dashes
        .replace(/\s*\d+(\.\d+)?%.*$/i, '')   // Remove ABV and everything after
        .trim();

      // Convert from ALL CAPS to Title Case for better Untappd matching
      beerName = beerName.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

      return beerName;
    }
  }
};

/**
 * Get config for current hostname
 * @returns {Object|null} Brewery config or null if not supported
 */
function getBreweryConfig() {
  const hostname = window.location.hostname.replace(/^www\./, '');
  return BREWERY_CONFIGS[hostname] || null;
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.BREWERY_CONFIGS = BREWERY_CONFIGS;
  window.getBreweryConfig = getBreweryConfig;
}
