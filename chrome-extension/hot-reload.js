
// Hot reload utility for Chrome extension development
// This will automatically reload the extension when files change

(function() {
  'use strict';
  
  const RELOAD_CHECK_INTERVAL = 1000; // Check every second
  let lastModified = 0;
  
  function checkForReload() {
    fetch(chrome.runtime.getURL('manifest.json'))
      .then(response => {
        const currentModified = new Date(response.headers.get('last-modified')).getTime();
        if (lastModified && currentModified > lastModified) {
          console.log('Extension files changed, reloading...');
          chrome.runtime.reload();
        }
        lastModified = currentModified;
      })
      .catch(error => {
        // Silently handle errors during development
      });
  }
  
  // Only run in development mode
  if (chrome.runtime.getManifest().version.includes('dev') || 
      chrome.runtime.getManifest().name.includes('dev')) {
    setInterval(checkForReload, RELOAD_CHECK_INTERVAL);
  }
})();
