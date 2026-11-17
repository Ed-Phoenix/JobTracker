// Applies the saved theme before the app loads, so the first paint already has the right colors
// (no white flash in dark mode). It is a blocking script in <head>, and a separate file rather
// than inline code because the Content Security Policy only allows scripts from this origin.
// Keep in sync with src/lib/theme.ts.
;(function () {
  var preference = 'system'
  try {
    preference = localStorage.getItem('theme') || 'system'
  } catch {
    // Storage can be blocked (private mode, strict settings): fall back to the OS setting.
  }

  var dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
})()
