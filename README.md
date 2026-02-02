# Untappd Helper

A Chrome extension that automatically fetches Untappd ratings and injects them directly into brewery websites.

## Features

- Automatically displays Untappd ratings on supported brewery websites
- Ratings appear as badges next to beer names
- Click a badge to view the beer on Untappd
- Caches ratings for 7 days to minimize requests
- Rate-limited to avoid overwhelming Untappd
- Works with dynamically loaded content (SPAs)

## Supported Breweries

| Brewery | Website | Platform |
|---------|---------|----------|
| Cloudwater | cloudwaterbrew.co | Shopify |
| Azvex | azvexbrewing.com | WooCommerce/Themify |
| Pipeline | pipelinebrewing.co.uk | Shopify |
| Beak | beakbrewery.com | Shopify |
| Deya | deyabrewing.com | Shopify |
| Polly's | pollys.co | WooCommerce/Elementor |
| Verdant | verdantbrewing.co | Shopify |
| Track | trackbrewing.co | Shopify |
| Overtone | overtonebrewing.com | Shopify |
| Gravity Well | gravitywellbrewing.co.uk | Shopify |
| Pomona Island | pomonaislandbrew.co.uk | Wix |
| Missing Link | missinglinkbrewing.com | Shopify |

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `untappd-helper` folder

## Usage

Once installed, simply visit any supported brewery website. Untappd ratings will automatically appear next to beer names.

### Rating Badges

- **Yellow badge** - Standard rating
- **Green badge** - Highly rated (4.0+)
- **Grey badge** - Beer not found on Untappd
- **Orange badge** - Beer found but has no ratings yet

### Extension Popup

Click the extension icon to:
- Enable/disable the extension
- View cache statistics
- Clear the cache

## How It Works

1. Content script detects beer cards on brewery websites
2. Extracts and cleans beer names (removes ABV, size, style info)
3. Sends request to background service worker
4. Background script checks cache, then fetches from Untappd if needed
5. Rating badge is injected into the page

## Technical Details

- **Manifest V3** Chrome Extension
- **No external dependencies** - vanilla JavaScript
- **Rate limiting** - Max 10 requests/minute to Untappd
- **Caching** - 7-day TTL using Chrome Storage API
- **CORS** - All Untappd requests go through background service worker

## Adding New Breweries

See [CLAUDE.md](CLAUDE.md) for detailed instructions on adding support for new brewery websites.

## Privacy

- No personal data is collected
- Beer ratings are fetched directly from Untappd's public search
- Cached data is stored locally in your browser

## License

MIT

## Contributing

Pull requests welcome! Please ensure any new brewery configs follow the existing patterns in `config.js`.
