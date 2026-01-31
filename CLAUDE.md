# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**untappd-helper** - A Chrome extension that automatically fetches Untappd ratings for beers and injects them directly into brewery websites' DOM.

### Current Scope
- **Primary target**: cloudwaterbrew.co
- **Architecture**: Modular design to easily add other brewery websites

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
├── untappdService.js      # Abstraction layer for scraping/API
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

# No build step required - vanilla JS
```

## Architecture

### Service Abstraction Pattern
The `UntappdService` class provides a clean interface that can swap between scraping and API:
- `getBeerRating(beerName, brewery)` - Main entry point
- `fetchViaScrape()` - Initial implementation using Untappd search scraping
- `fetchViaAPI()` - Future implementation when API key is available

### Brewery Adapter Pattern
Each brewery has a config in `config.js`:
```javascript
{
  name: 'Cloudwater',
  beerNameSelector: '...',
  beerCardSelector: '...',
  injectionPoint: '...',
  breweryNameForSearch: 'Cloudwater'
}
```

### Caching Strategy
- Storage: `chrome.storage.local`
- TTL: 7 days
- Key format: `${brewery}_${beerName}_${timestamp}`

## Code Style

- ES6+ JavaScript (async/await, classes, arrow functions)
- No external dependencies/frameworks
- Descriptive variable and function names
- JSDoc comments for public methods
- Error handling with graceful fallbacks

## Important Notes

- **Rate Limiting**: Max 10 requests/minute to avoid Untappd blocks
- **CORS**: All Untappd fetching must go through background service worker
- **Fuzzy Matching**: Beer names may not exactly match Untappd entries
- **Graceful Degradation**: Show "(No rating)" when beer not found
- **Privacy**: API keys stored in chrome.storage.sync (encrypted)

## Key Challenges

1. Accurately extracting beer names from brewery DOM
2. Matching beer names to Untappd search results (fuzzy matching)
3. Avoiding CORS issues (use background script for fetching)
4. Making injected ratings look native to each site
5. Rate limiting scraping to avoid blocks
6. Clean abstraction layer for scraping → API swap
