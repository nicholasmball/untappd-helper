/**
 * Content Script - DOM manipulation and rating injection
 * Runs on brewery websites to extract beer names and inject ratings
 */

(async function() {
  'use strict';

  // Check if extension is enabled
  const enabledResult = await chrome.runtime.sendMessage({ action: 'getExtensionEnabled' });
  if (!enabledResult.enabled) {
    console.log('Beer Rating Injector is disabled');
    return;
  }

  // Get brewery config for current site
  const config = window.getBreweryConfig();
  if (!config) {
    console.log('Beer Rating Injector: No config for this site');
    return;
  }

  console.log(`Beer Rating Injector: Running on ${config.name}`);

  // Track processed elements to avoid duplicates
  const processedElements = new WeakSet();

  /**
   * Create rating badge element
   */
  function createRatingBadge(ratingData) {
    const badge = document.createElement('div');
    badge.className = 'untappd-rating-badge';

    if (!ratingData.found) {
      badge.classList.add('untappd-rating-not-found');
      badge.innerHTML = `
        <span class="untappd-icon">🍺</span>
        <span class="untappd-text">No rating</span>
      `;
      return badge;
    }

    // Handle beers found on Untappd but with 0 ratings
    if (ratingData.unrated || ratingData.rating === null) {
      badge.classList.add('untappd-rating-unrated');
      const badgeLink = document.createElement('a');
      badgeLink.className = 'untappd-rating-link';
      badgeLink.href = ratingData.beerUrl || 'https://untappd.com';
      badgeLink.target = '_blank';
      badgeLink.rel = 'noopener noreferrer';
      badgeLink.innerHTML = `
        <span class="untappd-icon">🍺</span>
        <span class="untappd-text">Unrated</span>
        <span class="untappd-logo">Untappd</span>
      `;
      badge.appendChild(badgeLink);
      return badge;
    }

    const rating = ratingData.rating.toFixed(2);
    const isHighRated = ratingData.rating >= 4.0;

    if (isHighRated) {
      badge.classList.add('untappd-rating-high');
    }

    const ratingCountText = ratingData.ratingCount
      ? `(${ratingData.ratingCount.toLocaleString()})`
      : '';

    const badgeContent = document.createElement('a');
    badgeContent.className = 'untappd-rating-link';
    badgeContent.href = ratingData.beerUrl || 'https://untappd.com';
    badgeContent.target = '_blank';
    badgeContent.rel = 'noopener noreferrer';
    badgeContent.innerHTML = `
      <span class="untappd-icon">🍺</span>
      <span class="untappd-rating">${rating}</span>
      <span class="untappd-count">${ratingCountText}</span>
      <span class="untappd-logo">Untappd</span>
    `;

    badge.appendChild(badgeContent);
    return badge;
  }

  /**
   * Create loading indicator
   */
  function createLoadingIndicator() {
    const loader = document.createElement('div');
    loader.className = 'untappd-rating-badge untappd-rating-loading';
    loader.innerHTML = `
      <span class="untappd-icon">🍺</span>
      <span class="untappd-spinner"></span>
      <span class="untappd-text">Loading...</span>
    `;
    return loader;
  }

  /**
   * Find first matching element from comma-separated selectors
   */
  function queryFirst(parent, selectors) {
    for (const selector of selectors.split(',').map(s => s.trim())) {
      try {
        const el = parent.querySelector(selector);
        if (el) return el;
      } catch (e) {
        // Skip invalid selectors
      }
    }
    return null;
  }

  /**
   * Extract beer name from a card element
   */
  function extractBeerName(card) {
    const nameElement = queryFirst(card, config.beerNameSelector);
    if (!nameElement) {
      console.log('Beer Rating Injector: No name element found. Card HTML:', card.innerHTML.substring(0, 200));
      return null;
    }

    let beerName = nameElement.textContent.trim();

    // Apply transformation if configured
    if (config.transformBeerName) {
      beerName = config.transformBeerName(beerName);
    }

    return beerName;
  }

  /**
   * Inject rating into a beer card
   */
  async function injectRating(card) {
    if (processedElements.has(card)) return;
    processedElements.add(card);

    const beerName = extractBeerName(card);
    if (!beerName) {
      console.log('Beer Rating Injector: Could not extract beer name from card');
      return;
    }

    // Find injection target (try each selector)
    const target = queryFirst(card, config.injectionTarget);
    if (!target) {
      console.log('Beer Rating Injector: Could not find injection target in card');
      return;
    }

    // Add loading indicator
    const loader = createLoadingIndicator();
    target.insertAdjacentElement(config.injectionPosition, loader);

    try {
      // Request rating from background script
      const ratingData = await chrome.runtime.sendMessage({
        action: 'getBeerRating',
        beerName: beerName,
        brewery: config.breweryNameForSearch
      });

      // Replace loader with rating badge
      const badge = createRatingBadge(ratingData);
      loader.replaceWith(badge);

      console.log(`Beer Rating Injector: ${beerName} -> ${ratingData.found ? ratingData.rating : 'not found'}`);
    } catch (error) {
      console.error('Beer Rating Injector: Error fetching rating', error);
      loader.remove();
    }
  }

  /**
   * Process all beer cards on the page
   */
  function processAllCards() {
    const cards = document.querySelectorAll(config.beerCardSelector);
    console.log(`Beer Rating Injector: Found ${cards.length} beer cards`);

    cards.forEach(card => {
      if (!processedElements.has(card)) {
        injectRating(card);
      }
    });
  }

  /**
   * Set up mutation observer for dynamically loaded content
   */
  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node is a beer card or contains beer cards
              if (node.matches && node.matches(config.beerCardSelector)) {
                shouldProcess = true;
                break;
              }
              if (node.querySelector && node.querySelector(config.beerCardSelector)) {
                shouldProcess = true;
                break;
              }
            }
          }
        }
        if (shouldProcess) break;
      }

      if (shouldProcess) {
        // Debounce processing
        clearTimeout(observer.timeout);
        observer.timeout = setTimeout(processAllCards, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  // Initial processing
  processAllCards();

  // Watch for dynamic content
  setupObserver();

  // Also process on URL changes (SPA navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(processAllCards, 500);
    }
  }).observe(document, { subtree: true, childList: true });

})();
