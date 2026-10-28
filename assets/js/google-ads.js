/* Google Ads tag for AW-18541109360.
   gtag.js is loaded by the async script in each page. This file queues the tag and
   sends one conversion per successful private inquiry. The transaction id is created
   once for that inquiry and reused if the same conversion is reported again
   (inline success and the thank-you redirect). */
(function () {
  'use strict';

  var TAG_ID = 'AW-18541109360';
  var SEND_TO = 'AW-18541109360/4mJICJuA_KsdEPDAi4lF';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', TAG_ID);

  function uniqueId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  window.sableTrackInquiry = function (transactionId) {
    if (!transactionId) return;
    var key = 'sable-conversion-' + transactionId;
    try {
      if (window.sessionStorage && sessionStorage.getItem(key)) return;
      if (window.sessionStorage) sessionStorage.setItem(key, '1');
    } catch (e) { /* storage unavailable; still send once from this call */ }
    window.gtag('event', 'conversion', {
      send_to: SEND_TO,
      value: 1.0,
      currency: 'USD',
      transaction_id: transactionId
    });
  };

  function thankYouConversion() {
    var path = String(location.pathname || '').replace(/\/+$/, '');
    if (!path.endsWith('/thank-you')) return;
    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { return; }
    var tx = params.get('transaction_id');
    var lead = params.get('lead') === '1';
    if (!tx && !lead) return;
    if (!tx) {
      try { tx = sessionStorage.getItem('sable-thankyou-transaction-id'); } catch (e) {}
      if (!tx) {
        tx = uniqueId();
        try { sessionStorage.setItem('sable-thankyou-transaction-id', tx); } catch (e2) {}
      }
    }
    window.sableTrackInquiry(tx);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', thankYouConversion);
  else thankYouConversion();

  window.sableNewTransactionId = uniqueId;
})();
