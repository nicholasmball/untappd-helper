# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**untappd-helper** - A Chrome extension that automatically fetches Untappd ratings for beers and injects them directly into brewery websites' DOM.

### Supported Breweries
- cloudwaterbrew.co (Shopify)
- azvexbrewing.com (WooCommerce/Themify)
- pipelinebrewing.co.uk (Shopify Venue)
- beakbrewery.com (Custom Shopify)
- deyabrewing.com (Shopify)
- pollys.co (WooCommerce/Elementor)
- verdantbrewing.co (Shopify)
- trackbrewing.co (Shopify)
- overtonebrewing.com (Shopify Dawn)
- gravitywellbrewing.co.uk (Shopify)
- pomonaislandbrew.co.uk (Wix)
- missinglinkbrewing.com (Shopify)

## Tech Stack

- Chrome Extension (Manifest V3)
- Vanilla JavaScript (ES6+)
- Chrome Storage API (local + sync)
- Content Scripts for DOM manipulation
- Service Worker for background data fetching

## Project Structure

```
untappd-helper/
├── manifest.json          # Extension manifest (V3)
├── background.js          # Service worker, message handling, Untappd fetching
├── content-script.js      # DOM manipulation, rating injection
├── config.js              # Brewery-specific DOM selectors
├── utils.js               # Caching, rate limiting helpers
├── popup/
│   ├── popup.html         # Settings UI
│   ├── popup.js           # Settings logic
│   └── popup.css          # Popup styling
├── styles.css             # Injected rating badge styling
└── icons/                 # Extension icons
```

## Development Commands

```bash
# Load extension in Chrome
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select this directory

# After making changes:
# 1. Go to chrome://extensions
# 2. Click refresh icon on the extension (or Remove + Load unpacked for manifest changes)

# No build step required - vanilla JS
```

## Adding a New Brewery

### 1. Update manifest.json
Add both host_permissions and content_scripts matches:
```json
"host_permissions": [
  "https://newbrewery.com/*",
  "https://*.newbrewery.com/*"
]
```
**Important**: `*.domain.com` only matches subdomains (www.domain.com), NOT the bare domain. Add both patterns.

### 2. Add config to config.js
```javascript
'newbrewery.com': {
  name: 'New Brewery',
  breweryNameForSearch: 'New Brewery',  // Name to append to Untappd search

  // DOM Selectors - inspect the site to find these
  beerCardSelector: '.product-card',           // Container for each beer
  beerNameSelector: '.product-title, h3 a',    // Element containing beer name
  priceSelector: '.price, .money',             // Price element
  cardTextSelector: '.product-info',           // Text container area

  // Where to inject the rating badge
  injectionTarget: '.product-title',           // Element to inject near
  injectionPosition: 'afterend',               // 'beforeend', 'afterbegin', 'beforebegin', 'afterend'

  // Transform beer name for better Untappd matching
  transformBeerName: (name) => {
    let beerName = name
      .split('–')[0]                        // Remove text after em-dash
      .replace(/\s*\d+(\.\d+)?%.*$/i, '')   // Remove ABV and everything after
      .replace(/\s*-\s*\d+ml$/i, '')        // Remove size
      .trim();
    return beerName;
  }
}
```

### 3. Debugging New Sites

Open DevTools Console on the brewery site and look for:
- `"Beer Rating Injector: Running on [name]"` - Config found
- `"Beer Rating Injector: Found X beer cards"` - Cards found
- `"Beer Rating Injector: No name element found"` - Wrong beerNameSelector
- `"Beer Rating Injector: Could not find injection target"` - Wrong injectionTarget

Useful console commands for debugging:
```javascript
// Check if config is loaded
window.getBreweryConfig()

// Test card selector
document.querySelectorAll('.your-selector').length

// Find what class a beer name element has
document.querySelector('h2')?.closest('div')?.className
```

### Common Issues

1. **"Found 0 beer cards"** - Wrong beerCardSelector. Inspect the page to find the correct container class.

2. **"No name element found"** - Wrong beerNameSelector. The name element must be INSIDE the card container.

3. **Badge shows multiple times** - Card selector is matching nested elements. Use a more specific selector (e.g., `.product-card` instead of `[class*="product"]`).

4. **"No rating" for beers that exist** - Check transformBeerName. The search query might include too much text (ABV, style, collab info).

5. **Extension not loading on site** - Check manifest.json has both bare domain AND wildcard patterns.

## Architecture

### Message Flow
1. Content script detects beer cards on brewery website
2. Sends `getBeerRating` message to background service worker
3. Background script checks cache first (7-day TTL)
4. If not cached, fetches from Untappd (scraping or API)
5. Rate limiting applied (10 requests/minute max)
6. Result cached and returned to content script
7. Content script injects styled badge into DOM

### Caching Strategy
- Storage: `chrome.storage.local`
- TTL: 7 days
- Key format: `${brewery}_${beerName}` (normalized)

## Code Style

- ES6+ JavaScript (async/await, classes, arrow functions)
- No external dependencies/frameworks
- Descriptive variable and function names
- Error handling with graceful fallbacks

## Important Notes

- **Rate Limiting**: Max 10 requests/minute to avoid Untappd blocks
- **CORS**: All Untappd fetching must go through background service worker
- **Collaboration Beers**: Often listed under a different brewery on Untappd - may show "No rating"
- **Graceful Degradation**: Show "No rating" when beer not found, "Unrated" when found but has 0 ratings
- **Privacy**: API keys stored in chrome.storage.sync

## Platform-Specific Notes

### Shopify Sites
- Common selectors: `.product-card`, `.grid__item`, `.card`
- Title usually in `h2`, `h3`, or `.product-card__title`
- Many theme variations - always inspect the actual DOM

### WooCommerce Sites
- Common selectors: `.product`, `li.product`, `.woocommerce-loop-product`
- Title usually in `.woocommerce-loop-product__title` or `h2`
- Themify/Elementor add extra wrapper classes

### Elementor (WordPress)
- Uses `[data-elementor-type="loop-item"]` for product loops
- Widget classes like `.elementor-widget-woocommerce-product-title`
