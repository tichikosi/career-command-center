// Career Command Center — pre-hydration theme initialization.
// Runs before React hydration to prevent theme flash.
// Must remain a static, fully self-contained file with no user-controlled interpolation.
(function () {
  try {
    var raw = localStorage.getItem('ccc_settings_v1');
    var parsed = raw ? JSON.parse(raw) : null;
    var validModes = ['light', 'dark', 'system'];
    var mode =
      parsed && validModes.indexOf(parsed.themeMode) !== -1
        ? parsed.themeMode
        : 'system';
    var isDark =
      mode === 'dark' ||
      (mode === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.dataset.theme = 'light';
      document.documentElement.style.colorScheme = 'light';
    }
  } catch {
    // Tolerate missing / malformed storage; default is already no .dark class
  }
})();
