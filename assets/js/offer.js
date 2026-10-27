/* Sable Circuit — grand opening offer strip. The strip ships with the `hidden` attribute and is only
   revealed while the offer is live, so an expired (or no-JS) visitor never sees it. It also hides itself
   if the page stays open past the deadline. Deadline: 2026-10-28 23:59 UAE time (UTC+4). */
(function () {
  'use strict';
  var strip = document.getElementById('offer-strip');
  if (!strip) return;
  var deadline = Date.parse(strip.getAttribute('data-expires') || '2026-10-28T23:59:00+04:00');
  if (isNaN(deadline)) deadline = Date.UTC(2026, 9, 28, 19, 59, 0); // same instant in UTC
  function expired() { return Date.now() >= deadline; }
  if (expired()) { strip.remove(); return; }
  strip.hidden = false;
  var left = deadline - Date.now();
  if (left < 2147483647) setTimeout(function () { strip.remove(); }, left);
})();
