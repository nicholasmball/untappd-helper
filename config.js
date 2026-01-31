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
  },

  'pipelinebrewing.co.uk': {
    name: 'Pipeline',
    breweryNameForSearch: 'Pipeline Brewing',

    // Selectors for Shopify Venue theme
    beerCardSelector: '.product-card',
    beerNameSelector: '.product-card__title, .product-card__title a, h2 a, a[href*="/products/"]',
    priceSelector: '.money, .product-card__price',
    cardTextSelector: '.product-card__info, .product-card',

    // Inject after the title
    injectionTarget: '.product-card__title, .product-card__info',
    injectionPosition: 'afterend',

    transformBeerName: (name) => {
      // Pipeline format: "Wolf Moon - DIPA - 8.4% - 440ml"
      // Extract just the beer name (first part before style/ABV)
      let beerName = name
        .split('-')[0]                        // Take text before first dash
        .replace(/\s*\d+(\.\d+)?%.*$/i, '')   // Remove ABV if present
        .trim();

      return beerName;
    }
  },

  'beakbrewery.com': {
    name: 'Beak',
    breweryNameForSearch: 'Beak Brewery',

    // Selectors for Beak's custom Shopify theme
    beerCardSelector: '.product_thumb',
    beerNameSelector: 'p.title, .title',
    priceSelector: 'p.price, .price',
    cardTextSelector: '.product_thumb',

    // Inject after the title
    injectionTarget: 'p.title, .title',
    injectionPosition: 'afterend',

    transformBeerName: (name) => {
      // Beak format: "HUM 4.8% PALE" or "LEAP 4.5% SESSION IPA"
      // Collab format: "FLIGHT MECHANICS - BEAK X EQUILIBRIUM - 8.2% DIPA"
      let beerName = name
        .replace(/\s*\d+(\.\d+)?%.*$/i, '')   // Remove ABV and everything after
        .replace(/\s*-\s*beak\s*x\s*.*/i, '') // Remove collab suffix "- BEAK X ..."
        .replace(/\s*-\s*[^-]+\s*x\s*.*/i, '') // Remove other collab patterns
        .trim();

      return beerName;
    }
  },

  'deyabrewing.com': {
    name: 'Deya',
    breweryNameForSearch: 'Deya',

    // Selectors for Deya's custom Shopify theme
    beerCardSelector: '.indiv-product-wrapper',
    beerNameSelector: '.indiv-product-vendor-text strong, .hp-title strong',
    priceSelector: '.money, .price',
    cardTextSelector: '.indiv-product-vendor-text, .hp-title',

    // Inject after the title area
    injectionTarget: '.indiv-product-vendor-text, .hp-title',
    injectionPosition: 'afterend',

    transformBeerName: (name) => {
      // Deya format: "PLENTY SATURATED MOTUEKA, NELSON SAUVIN, NECTARON"
      // Beer names are usually already clean, just trim
      let beerName = name.trim();

      return beerName;
    }
  },

  'pollys.co': {
    name: 'Pollys',
    breweryNameForSearch: 'Pollys Brew Co',

    // Selectors for WooCommerce with Elementor loop
    beerCardSelector: '[data-elementor-type="loop-item"], .e-loop-item',
    beerNameSelector: '.elementor-widget-woocommerce-product-title h2, .elementor-widget-woocommerce-product-title',
    priceSelector: '.elementor-widget-woocommerce-product-price, .price',
    cardTextSelector: '.e-con-inner',

    // Inject after the title widget
    injectionTarget: '.elementor-widget-woocommerce-product-title',
    injectionPosition: 'afterend',

    transformBeerName: (name) => {
      // Polly's format: "Rosebud – IPA 5.6%" or "Pilsner – Lager Beer 4.7%"
      // Extract beer name before em-dash
      let beerName = name
        .split('–')[0]                        // Take text before em-dash
        .split('-')[0]                        // Also handle regular dash
        .replace(/\s*\d+(\.\d+)?%.*$/i, '')   // Remove ABV if present
        .trim();

      return beerName;
    }
  },

  'verdantbrewing.co': {
    name: 'Verdant',
    breweryNameForSearch: 'Verdant',

    // Selectors for Verdant Shopify theme (Tailwind CSS)
    beerCardSelector: '.product-card',
    beerNameSelector: 'h2.product__title, .product__title',
    priceSelector: '.price, .money',
    cardTextSelector: '.product-card',

    // Inject after the title
    injectionTarget: 'h2.product__title, .product__title',
    injectionPosition: 'afterend',

    transformBeerName: (name) => {
      // Verdant names - handle collabs like "Disco Italiano x Birificio Italiano"
      let beerName = name
        .replace(/\s*\d+(\.\d+)?%.*$/i, '')   // Remove ABV if present
        .replace(/\s*-\s*\d+ml$/i, '')        // Remove size
        .replace(/\s+x\s+.*/i, '')            // Remove collab suffix " x ..."
        .replace(/\s+\d{4}\s*$/i, '')         // Remove year like "2025"
        .trim();

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
