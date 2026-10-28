/* Inquiry conversion measurement.
   Google Ads stays off until both values below are filled in.
   Paste the Google tag ID (AW-…) and the conversion label from
   Google Ads > Goals > Conversions > Sable Circuit Inquiry Form Submit > Tag setup.
   send_to is AW_CONVERSION_ID + "/" + AW_CONVERSION_LABEL.
   The same id is the Google transaction_id and the OpenAI event_id. */
(function (w, d) {
  'use strict';

  var AW_CONVERSION_ID = '';
  var AW_CONVERSION_LABEL = '';
  var OAI_PIXEL_ID = 'DwnbT2kvDPPGfaAL5TMMJH';

  function googleConfigured() {
    return !!(AW_CONVERSION_ID && AW_CONVERSION_LABEL);
  }

  function uniqueId() {
    if (w.crypto && typeof w.crypto.randomUUID === 'function') return w.crypto.randomUUID();
    return 'inq_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  if (googleConfigured()) {
    var gtagScript = d.createElement('script');
    gtagScript.async = true;
    gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + AW_CONVERSION_ID;
    d.head.appendChild(gtagScript);
    w.dataLayer = w.dataLayer || [];
    w.gtag = function () { w.dataLayer.push(arguments); };
    w.gtag('js', new Date());
    w.gtag('config', AW_CONVERSION_ID);
  }

  (function (win, doc, tag, src) {
    if (win.oaiq) return;
    var queue = function () { queue.q.push(arguments); };
    queue.q = [];
    win.oaiq = queue;
    var js = doc.createElement(tag);
    js.async = true;
    js.src = src;
    var first = doc.getElementsByTagName(tag)[0];
    first.parentNode.insertBefore(js, first);
  })(w, d, 'script', 'https://bzrcdn.openai.com/sdk/oaiq.min.js');
  w.oaiq('init', { pixelId: OAI_PIXEL_ID });

  w.sableNewTransactionId = uniqueId;

  /* One call per inquiry. A repeat of the same id is ignored. */
  w.sableTrackInquiry = function (eventId) {
    if (!eventId) eventId = uniqueId();
    var seenKey = 'sable-conversion-' + eventId;
    try {
      if (w.sessionStorage && sessionStorage.getItem(seenKey)) return;
      if (w.sessionStorage) sessionStorage.setItem(seenKey, '1');
    } catch (e) { /* still send this call once */ }
    if (googleConfigured() && w.gtag) {
      try {
        w.gtag('event', 'conversion', {
          send_to: AW_CONVERSION_ID + '/' + AW_CONVERSION_LABEL,
          value: 1.0,
          currency: 'USD',
          transaction_id: eventId
        });
      } catch (e) {}
    }
    try {
      w.oaiq('measure', 'lead_created', { type: 'customer_action' }, { event_id: eventId });
    } catch (e2) {}
  };

  /* No-JS submit and the fetch-failure fallback land on /thank-you/?form=inquiry.
     Strip that query immediately so a reload does not count again. */
  function thankYouConversion() {
    var path = String(w.location.pathname || '').replace(/\/+$/, '');
    if (!path.endsWith('/thank-you')) return;
    var params;
    try { params = new URLSearchParams(w.location.search); } catch (e) { return; }
    if (params.get('form') !== 'inquiry') return;
    var eventId = params.get('transaction_id') || uniqueId();
    if (w.history && w.history.replaceState) {
      try { w.history.replaceState(null, '', w.location.pathname); } catch (e) {}
    }
    w.sableTrackInquiry(eventId);
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', thankYouConversion);
  else thankYouConversion();
})(window, document);
