/* Sable Circuit — inquiry / privacy-request forms: validation + progressive-enhancement submit to Web3Forms.
   Without JavaScript the form posts normally to https://api.web3forms.com/submit, which then redirects to
   the "redirect" field (SITE_URL/thank-you/). With JavaScript we send JSON and show an inline success state. */
(function () {
  'use strict';

  // Close the mobile menu after a link is chosen.
  var mnav = document.querySelector('.mnav');
  if (mnav) {
    mnav.addEventListener('click', function (e) {
      if (e.target.closest('a')) mnav.removeAttribute('open');
    });
  }

  var form = document.getElementById('leadform');
  if (!form) return;
  var wrap = document.getElementById('form-wrap');
  var status = document.getElementById('status');
  var submit = document.getElementById('submit');
  var success = document.getElementById('success');

  // Pre-select a service / role when a CTA with data attributes is used.
  document.querySelectorAll('a[data-service], a[data-role]').forEach(function (a) {
    a.addEventListener('click', function () {
      var s = a.getAttribute('data-service');
      if (s && form.service) form.service.value = s;
      if (a.getAttribute('data-role') === 'trade') {
        if (form.service) form.service.value = 'Trade partnership';
        if (form.project) form.project.value = 'Design / installation partnership';
      }
    });
  });

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function fieldOk(el) {
    var v = (el.value || '').trim();
    if (el.type === 'checkbox') return el.checked;
    if (el.required && !v) return false;
    if (el.type === 'email' && v && !EMAIL_RE.test(v)) return false;
    if (el.minLength > 0 && v && v.length < el.minLength) return false;
    return true;
  }

  function mark(el) {
    var ok = fieldOk(el);
    var box = el.type === 'checkbox' ? el.closest('.consent') : el.closest('.field');
    if (box) box.classList.toggle('invalid', !ok);
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }

  var controls = Array.prototype.slice.call(form.querySelectorAll('input:not([type=hidden]):not([name=botcheck]), select, textarea'));
  controls.forEach(function (el) {
    el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'blur', function () { mark(el); });
    el.addEventListener('input', function () {
      var box = el.type === 'checkbox' ? el.closest('.consent') : el.closest('.field');
      if (box && box.classList.contains('invalid')) mark(el);
    });
  });

  var PLACEHOLDER = 'WEB3FORMS_' + 'ACCESS_KEY';
  var keyField = form.querySelector('input[name=access_key]');
  var subjectField = form.querySelector('input[name=subject]');
  var redirectField = form.querySelector('input[name=redirect]');
  var baseSubject = subjectField ? subjectField.value : '[Sable Circuit Lead]';

  // Point the no-JS redirect at this site's own thank-you page (https://sable-circuit.com/thank-you/).
  // Inquiry submissions carry lead=1 so the thank-you page can record the conversion.
  var home = document.querySelector('a.mark');
  var isInquiry = form.getAttribute('name') === 'inquiry';
  if (redirectField && home && window.URL) {
    try {
      var dest = new URL('thank-you/', home.href);
      if (isInquiry) dest.searchParams.set('lead', '1');
      redirectField.value = dest.href;
    } catch (e) { /* keep static value */ }
  }

  // One id per inquiry, shared by the success event and a later thank-you redirect.
  function transactionId() {
    var tx = (window.sableNewTransactionId && window.sableNewTransactionId()) ||
      (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12));
    form.setAttribute('data-transaction-id', tx);
    if (redirectField && window.URL) {
      try {
        var next = new URL(redirectField.value, window.location.href);
        next.searchParams.set('lead', '1');
        next.searchParams.set('transaction_id', tx);
        redirectField.value = next.href;
      } catch (e) { /* keep the current redirect */ }
    }
    return tx;
  }

  function val(name) {
    var el = form.elements[name];
    return el && el.value ? String(el.value).trim() : '';
  }

  // Every notification subject starts with "[Sable Circuit Lead]"; add a few details after it.
  function buildSubject() {
    var bits = [val('location'), val('project'), val('request'), val('name')].filter(Boolean);
    return (baseSubject + (bits.length ? ' — ' + bits.join(' · ') : '')).slice(0, 180);
  }

  function fail(msg) {
    status.textContent = msg;
    status.className = 'status error';
    submit.disabled = false;
    submit.textContent = submitLabel;
  }

  var submitLabel = submit ? submit.textContent : 'Send';

  form.addEventListener('submit', function (event) {
    status.textContent = '';
    status.className = 'status';
    var firstBad = null;
    controls.forEach(function (el) { if (!mark(el) && !firstBad) firstBad = el; });
    if (firstBad) {
      event.preventDefault();
      status.textContent = 'Please complete the highlighted fields.';
      status.className = 'status error';
      firstBad.focus();
      return;
    }
    if (keyField && keyField.value === PLACEHOLDER) {
      event.preventDefault();
      fail('This form is not connected yet. Please try again soon.');
      return;
    }
    if (subjectField) subjectField.value = buildSubject();
    var tx = isInquiry ? transactionId() : '';
    if (!window.fetch || !window.FormData) return; // fall back to a normal POST

    event.preventDefault();
    submit.disabled = true;
    submit.textContent = 'Sending…';
    var data = {};
    new FormData(form).forEach(function (value, key) { data[key] = value; });
    delete data.redirect; // JSON submissions get a JSON reply instead of a redirect

    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (res) {
      return res.json().catch(function () { return { success: res.ok }; }).then(function (json) {
        if (res.ok && json && json.success) {
          if (tx && window.sableTrackInquiry) window.sableTrackInquiry(tx);
          wrap.classList.add('sent');
          form.reset();
          if (success) success.focus();
        } else {
          fail('Sorry, your message could not be sent. Please check the form and try again in a few minutes.');
        }
      });
    }).catch(function () {
      // Network problem (or fetch blocked): fall back to a regular POST so the lead is not lost.
      HTMLFormElement.prototype.submit.call(form);
    });
  });
})();
