/**
 * Popup Script - Settings management for Beer Rating Injector
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const extensionToggle = document.getElementById('extension-toggle');
  const dataSourceEl = document.getElementById('data-source');
  const clientIdInput = document.getElementById('api-client-id');
  const clientSecretInput = document.getElementById('api-client-secret');
  const saveApiKeyBtn = document.getElementById('save-api-key');
  const clearApiKeyBtn = document.getElementById('clear-api-key');
  const apiStatus = document.getElementById('api-status');
  const cachedBeersEl = document.getElementById('cached-beers');
  const hitRateEl = document.getElementById('hit-rate');
  const clearCacheBtn = document.getElementById('clear-cache');
  const cacheStatus = document.getElementById('cache-status');

  // Load initial state
  await loadState();

  // Event listeners
  extensionToggle.addEventListener('change', async () => {
    await chrome.runtime.sendMessage({
      action: 'setExtensionEnabled',
      enabled: extensionToggle.checked
    });
    showStatus(apiStatus, extensionToggle.checked ? 'Extension enabled' : 'Extension disabled', 'success');
  });

  saveApiKeyBtn.addEventListener('click', async () => {
    const clientId = clientIdInput.value.trim();
    const clientSecret = clientSecretInput.value.trim();

    if (!clientId || !clientSecret) {
      showStatus(apiStatus, 'Please enter both Client ID and Client Secret', 'error');
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        action: 'saveApiKey',
        apiKey: { clientId, clientSecret }
      });
      showStatus(apiStatus, 'API key saved successfully', 'success');
      updateDataSource('api');

      // Clear inputs for security
      clientIdInput.value = '';
      clientSecretInput.value = '';
    } catch (error) {
      showStatus(apiStatus, 'Failed to save API key', 'error');
    }
  });

  clearApiKeyBtn.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'clearApiKey' });
      showStatus(apiStatus, 'API key cleared', 'success');
      updateDataSource('scrape');
      clientIdInput.value = '';
      clientSecretInput.value = '';
    } catch (error) {
      showStatus(apiStatus, 'Failed to clear API key', 'error');
    }
  });

  clearCacheBtn.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'clearCache' });
      showStatus(cacheStatus, 'Cache cleared successfully', 'success');
      cachedBeersEl.textContent = '0';
      hitRateEl.textContent = '0%';
    } catch (error) {
      showStatus(cacheStatus, 'Failed to clear cache', 'error');
    }
  });

  /**
   * Load current state from storage
   */
  async function loadState() {
    try {
      // Extension enabled state
      const enabledResult = await chrome.runtime.sendMessage({ action: 'getExtensionEnabled' });
      extensionToggle.checked = enabledResult.enabled;

      // Data source
      const sourceResult = await chrome.runtime.sendMessage({ action: 'getDataSource' });
      updateDataSource(sourceResult.source);

      // Cache stats
      const statsResult = await chrome.runtime.sendMessage({ action: 'getCacheStats' });
      cachedBeersEl.textContent = statsResult.cachedBeers;
      hitRateEl.textContent = `${statsResult.hitRate}%`;
    } catch (error) {
      console.error('Error loading state:', error);
    }
  }

  /**
   * Update data source display
   */
  function updateDataSource(source) {
    const sourceTextEl = dataSourceEl.querySelector('.source-text');
    const sourceIconEl = dataSourceEl.querySelector('.source-icon');

    if (source === 'api') {
      sourceTextEl.textContent = 'API';
      sourceIconEl.textContent = '🔑';
      dataSourceEl.classList.add('api-mode');
      dataSourceEl.classList.remove('scrape-mode');
    } else {
      sourceTextEl.textContent = 'Scraping';
      sourceIconEl.textContent = '🌐';
      dataSourceEl.classList.add('scrape-mode');
      dataSourceEl.classList.remove('api-mode');
    }
  }

  /**
   * Show status message
   */
  function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status-message ${type}`;
    element.style.display = 'block';

    setTimeout(() => {
      element.style.display = 'none';
    }, 3000);
  }
});
