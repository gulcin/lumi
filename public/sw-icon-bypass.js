/**
 * iOS fetches the home-screen icon on its own, often as apple-touch-icon.png.
 * This worker must not answer that request. A precache miss or the navigation
 * fallback would send index.html, and iOS draws a letter instead of the fox.
 * Stopping the event lets the network return the PNG.
 */
self.addEventListener("fetch", (event) => {
  let path = "";
  try {
    path = new URL(event.request.url).pathname;
  } catch {
    return;
  }
  const icon =
    path.includes("apple-touch-icon") ||
    path.includes("/icons/") ||
    /\/favicon\.(?:png|svg|ico)$/.test(path);
  if (!icon) return;
  event.stopImmediatePropagation();
});
