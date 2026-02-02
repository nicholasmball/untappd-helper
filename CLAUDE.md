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
├── background.js          # Service worker, message handling, Untappd scraping
├── content-script.js      # DOM manipulation, rating injection
├── config.js              # Brewery-specific DOM selectors and transforms
├── popup/
│   ├── popup.html         # Settings UI
│   ├── popup.js           # Settings logic
│   └── popup.css          # Popup styling
├── styles.css             # Injected rating badge styling
├── icons/                 # Extension icons
├── README.md              # User documentation
└── CLAUDE.md              # Developer guidance (this file)
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
# 2. Click refresh icon on the extension
# 3. Refresh the brewery website page

# For manifest.json changes: Remove and re-add the extension

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
  priceSelector: '.price, .money',             // Price element (optional)
  cardTextSelector: '.product-info',           // Text container area

  // Where to inject the rating badge
  injectionTarget: '.product-title',           // Element to inject near
  injectionPosition: 'afterend',               // 'beforeend', 'afterbegin', 'beforebegin', 'afterend'

  // Optional: For Wix sites that aggressively re-render
  // skipLoader: true,

  // Transform beer name for better Untappd matching
  transformBeerName: (name) => {
    let beerName = name
      .split('|')[0]                        // Remove text after pipe
      .replace(/\s*\d+ml\b/gi, '')          // Remove size (440ml, 330ml)
      .replace(/\s*\d+(\.\d+)?%.*$/i, '')   // Remove ABV and everything after
      .replace(/\s+(IPA|Pale|Stout|...)$/i, '') // Remove style suffix
      .trim();
    return beerName;
  }
}
```

### 3. Common Transform Patterns

**Size removal:**
```javascript
.replace(/\s*\d+ml\b/gi, '')  // Removes "440ml", "330ml", etc.
```

**ABV removal:**
```javascript
.replace(/\s*\d+(\.\d+)?%.*$/i, '')  // Removes "5.5%" and everything after
```

**Style suffixes** (remove at end of name):
```javascript
.replace(/\s+(IPA|NEIPA|NEPA|Pale|Lager|Stout|Porter|Pilsner|Sour|DIPA|TIPA|Ale|Gose|Saison|Graf)$/i, '')
```

**Flavor/descriptor words** (remove from first occurrence onwards):
```javascript
.replace(/\s+(Raspberry|Blackberry|Mango|Coffee|Vanilla|Chocolate|Hazy|Imperial|Session|West|Traditional|Barrel|Aged).*/i, '')
```

**Collab handling** (for "BREWERY COLAB - BEER NAME" format):
```javascript
const parts = name.split('-').map(p => p.trim());
if (parts[0] && /colab|collab/i.test(parts[0])) {
  beerName = parts[1] || parts[0];  // Take second part
}
```

**Pipe separator** (for "Beer Name | Variant" format):
```javascript
.split('|')[0]  // Take text before pipe
```

**Barrel Aged beers:**
```javascript
.replace(/\s+BA\s+.*/i, '')  // Remove "BA Imperial Stout | Ledaig 2025"
```

### 4. Debugging New Sites

Open DevTools Console on the brewery site and look for:
- `"Beer Rating Injector: Running on [name]"` - Config found
- `"Beer Rating Injector: Found X beer cards"` - Cards found
- `"Beer Rating Injector: [beer name] -> [rating]"` - Individual beer results
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

// Test what a beer name transforms to
window.getBreweryConfig().transformBeerName("BEER NAME IPA 5.5%")
```

### 5. Common Issues

1. **"Found 0 beer cards"** - Wrong beerCardSelector. Inspect the page to find the correct container class.

2. **"No name element found"** - Wrong beerNameSelector. The name element must be INSIDE the card container.

3. **Badge shows multiple times** - Card selector is matching nested elements. Use a more specific selector (e.g., `.product-card` instead of `[class*="product"]`).

4. **"No rating" for beers that exist** - Check transformBeerName. The search query might include too much text (ABV, style, collab info). Test the transform in console.

5. **Extension not loading on site** - Check manifest.json has both bare domain AND wildcard patterns.

6. **Badges disappear after appearing (Wix)** - Wix aggressively re-renders. Add `skipLoader: true` to config.

7. **Badges overlap content** - Add site-specific CSS in styles.css (see Platform-Specific Notes).

## Architecture

### Message Flow
1. Content script detects beer cards on brewery website
2. Sends `getBeerRating` message to background service worker
3. Background script checks cache first (7-day TTL)
4. If not cached, scrapes Untappd search results
5. Rate limiting applied (10 requests/minute max)
6. Result cached and returned to content script
7. Content script injects styled badge into DOM

### Caching Strategy
- Storage: `chrome.storage.local`
- TTL: 7 days
- Key format: `${brewery}_${beerName}` (normalized, lowercase, underscores)

### Rate Limiting
- Max 10 requests per minute to Untappd
- Requests queued and processed sequentially
- Prevents IP blocks from Untappd

## Code Style

- ES6+ JavaScript (async/await, arrow functions)
- No external dependencies/frameworks
- Descriptive variable and function names
- Error handling with graceful fallbacks
- Comments for non-obvious logic

## Important Notes

- **Rate Limiting**: Max 10 requests/minute to avoid Untappd blocks
- **CORS**: All Untappd fetching must go through background service worker
- **Collaboration Beers**: Often need special transform handling - may be listed under different brewery on Untappd
- **Graceful Degradation**: Show "No rating" when beer not found, "Unrated" when found but has 0 ratings
- **First Load**: May be slow due to fetching all ratings - subsequent loads use cache

## Platform-Specific Notes

### Shopify Sites
- Common selectors: `.product-card`, `.grid__item`, `.card`, `.card-wrapper`
- Title usually in `h2`, `h3`, `.product-card__title`, or `.card__heading`
- Many theme variations (Dawn, Venue, District, etc.) - always inspect the actual DOM
- Usually straightforward - standard injection works

### WooCommerce Sites
- Common selectors: `.product`, `li.product`, `.woocommerce-loop-product`
- Title usually in `.woocommerce-loop-product__title` or `h2`
- Themify adds `.tmb-woocommerce` wrapper classes
- Elementor adds `[data-elementor-type="loop-item"]` for loops

### Wix Sites
- Uses `data-hook` attributes: `[data-hook="product-list-grid-item"]`
- **Aggressively re-renders DOM** - can cause badges to disappear
- Use `skipLoader: true` in config to avoid flicker
- Often needs CSS with `!important` to force visibility
- Example CSS fix:
```css
[data-hook="product-list-grid-item"] .untappd-rating-badge {
  display: inline-flex !important;
  visibility: visible !important;
  position: absolute !important;
  top: 8px !important;
  left: 8px !important;
  z-index: 100 !important;
}
```

### Sites with CSS Visibility Issues
Some sites hide injected content. Use absolute positioning:
```css
.site-specific-card .untappd-rating-badge {
  position: absolute !important;
  top: 8px !important;
  left: 8px !important;
  z-index: 100 !important;
}
```
Remember to set `position: relative` on the parent card if needed.
