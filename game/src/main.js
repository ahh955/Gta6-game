// Solmar City — boot: start the game once the page is ready.

(function () {
  function boot() {
    try {
      Game.init();
      window.__booted = true;
    } catch (e) {
      window.__bootError = String(e && e.message || e);
      const el = document.getElementById('fallback');
      if (el) el.textContent = 'Solmar City could not start: ' + window.__bootError;
      throw e;
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
