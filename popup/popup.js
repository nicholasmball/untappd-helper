/**
 * Popup Script - Settings management for Beer Rating Injector
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const extensionToggle = document.getElementById('extension-toggle');
  const toggleStatus = document.getElementById('toggle-status');
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
    showStatus(toggleStatus, extensionToggle.checked ? 'Extension enabled' : 'Extension disabled', 'success');
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

      // Cache stats
      const statsResult = await chrome.runtime.sendMessage({ action: 'getCacheStats' });
      cachedBeersEl.textContent = statsResult.cachedBeers;
      hitRateEl.textContent = `${statsResult.hitRate}%`;
    } catch (error) {
      console.error('Error loading state:', error);
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
