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
      // Collab format: "RIVINGTON COLAB - MIZZLE IPA - 6.5% - 440ML"
      const parts = name.split('-').map(p => p.trim());

      let beerName;
      // If first part contains COLAB/COLLAB, beer name is in second part
      if (parts[0] && /colab|collab/i.test(parts[0])) {
        beerName = parts[1] || parts[0];
      } else {
        beerName = parts[0];
      }

      // Remove style suffixes and ABV
      beerName = beerName
        .replace(/\s*\d+(\.\d+)?%.*$/i, '')   // Remove ABV if present
        .replace(/\s+(IPA|PALE|LAGER|STOUT|PORTER|PILSNER|SOUR|DIPA|TIPA|ALE)$/i, '') // Remove style
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
      // Keep year for versioned beers like "Burnthouse Coffee Porter 2025 x Origin"
      let beerName = name
        .replace(/\s*\d+(\.\d+)?%.*$/i, '')   // Remove ABV if present
        .replace(/\s*-\s*\d+ml$/i, '')        // Remove size
        .replace(/\s+x\s+.*/i, '')            // Remove collab suffix " x ..."
        .replace(/\s+(PORTER|IPA|PALE|LAGER|STOUT|PILSNER|SOUR|DIPA|TIPA|ALE|GOSE)\b/gi, '') // Remove style words
        .trim();

      return beerName;
    }
  },

  'trackbrewing.co': {
    name: 'Track',
    breweryNameForSearch: 'Track Brewing',

    // Selectors for Track Shopify theme (custom product-card element)
    beerCardSelector: 'product-card, .product-card',
    beerNameSelector: 'a.product-card-title, .product-card-title',
    priceSelector: '.price',
    cardTextSelector: '.product-card-info',

    // Inject after the title link
    injectionTarget: 'a.product-card-title, .product-card-title',
    injectionPosition: 'afterend',

    transformBeerName: (name) => {
      // Track format: "Made In The Shade | Porter | 5.6%"
      // Extract beer name before the first pipe
      let beerName = name
        .split('|')[0]                        // Take text before pipe
        .replace(/\s*\d+(\.\d+)?%.*$/i, '')   // Remove ABV if present
        .trim();

      return beerName;
    }
  },

  'overtonebrewing.com': {
    name: 'Overtone',
    breweryNameForSearch: 'Overtone',

    // Selectors for Overtone Shopify Dawn theme
    beerCardSelector: '.card-wrapper, li.grid__item',
    beerNameSelector: 'h3.card__heading a, .card__heading a',
    priceSelector: '.price',
    cardTextSelector: '.card__information',

    // Inject inside the card media area (for absolute positioning)
    injectionTarget: '.card__inner, .card',
    injectionPosition: 'afterbegin',

    transformBeerName: (name) => {
      // Overtone format: "LITTLE DREAMER 6 PACK" or "STOVIES IPA" or "BRASSNECK IMPERIAL STOUT"
      // Remove pack info, ABV, and beer style suffixes
      let beerName = name
        .replace(/\s*\d+\s*pack$/i, '')       // Remove "6 PACK" etc
        .replace(/\s*\d+(\.\d+)?%/i, '')      // Remove ABV anywhere (4.5%)
        .replace(/\s+(STRAWBERRY\s*&?\s*MANGO\s+)?(HONEY\s+)?(NE\s+)?(NITRO\s+)?(IMPERIAL\s+)?(IPA|PALE|LAGER|STOUT|PORTER|PILSNER|SOUR|DIPA|TIPA|ALE|GOSE|PALE\s+ALE|SESSION\s+IPA)$/i, '') // Remove style suffix
        .trim();

      return beerName;
    }
  },

  'gravitywellbrewing.co.uk': {
    name: 'Gravity Well',
    breweryNameForSearch: 'Gravity Well',

    // Selectors for Gravity Well Shopify District theme
    beerCardSelector: '.product-card, .grid__item, li.grid__item',
    beerNameSelector: '.product-card__title a, .product-card__title, h3 a, a[href*="/products/"]',
    priceSelector: '.price, .money',
    cardTextSelector: '.product-card__info',

    // Inject after the title
    injectionTarget: '.product-card__title, h3',
    injectionPosition: 'afterend',

    transformBeerName: (name) => {
      // Gravity Well format: "Hawking Radiation - Hazy Pale Ale (5%)"
      // Extract beer name before the dash and style
      let beerName = name
        .split('-')[0]                        // Take text before dash
        .replace(/\s*\([^)]*\)/g, '')         // Remove anything in parentheses
        .replace(/\s*\d+(\.\d+)?%/i, '')      // Remove ABV
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
