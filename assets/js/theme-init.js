// Runs before first paint so dark-mode visitors never see a white flash. Kept tiny on purpose.
(function () {
  var theme = null;
  try { theme = localStorage.getItem('theme'); } catch (e) { /* private mode */ }
  if (theme === 'dark' || (!theme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
