/* Sable Circuit — inquiry / privacy-request forms: validation + progressive-enhancement submit to Web3Forms.
   Without JavaScript the form posts normally to https://api.web3forms.com/submit, which then redirects to
   the "redirect" field (SITE_URL/thank-you/). The browser then enforces required name and email.
   With JavaScript we validate first (including programmatic form.submit()), send JSON, and show an
   inline success state. Conversion tracking runs only after Web3Forms accepts the inquiry. */
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
  // Look up the button inside the form. An id of "submit" would replace form.submit.
  var submit = form.querySelector('button[type="submit"]');
  var success = document.getElementById('success');

  // The HTML leaves native constraint validation on for no-JS posts. With this script running,
  // inline field errors replace the browser tooltip.
  form.noValidate = true;

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

  function namedControl(name) {
    var el = form.elements[name];
    if (!el) return null;
    // A radio/checkbox group is a collection, not a single control.
    if (typeof el.length === 'number' && !el.tagName) return el[0] || null;
    return el;
  }

  function fieldOk(el) {
    if (!el || el.name === 'botcheck') return true;
    var v = String(el.value || '').trim();
    if (el.type === 'checkbox') return el.required ? el.checked : true;
    // Name and email are mandatory even if the required attribute is removed.
    if (el.name === 'name') return v.length > 0;
    if (el.name === 'email' || el.type === 'email') return EMAIL_RE.test(v);
    if (el.required && !v) return false;
    if (el.minLength > 0 && v && v.length < el.minLength) return false;
    return true;
  }

  // Hard gate: a submission with no name or no valid email never leaves the browser.
  function identityGate() {
    var nameEl = namedControl('name');
    var emailEl = namedControl('email');
    var nameOk = !!(nameEl && fieldOk(nameEl));
    var emailOk = !!(emailEl && fieldOk(emailEl));
    if (nameEl) mark(nameEl);
    if (emailEl) mark(emailEl);
    return {
      ok: nameOk && emailOk,
      focus: !nameOk ? nameEl : (emailOk ? null : emailEl)
    };
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
  // Only the inquiry form adds form=inquiry, so a privacy request does not count as a conversion.
  var home = document.querySelector('a.mark');
  var isInquiry = form.getAttribute('name') === 'inquiry';
  if (redirectField && home && window.URL) {
    try {
      var dest = new URL('thank-you/', home.href);
      if (isInquiry) dest.searchParams.set('form', 'inquiry');
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
        next.searchParams.set('form', 'inquiry');
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

  function setStatus(msg, isError) {
    if (!status) return;
    status.textContent = msg;
    status.className = isError ? 'status error' : 'status';
  }

  function fail(msg) {
    setStatus(msg, true);
    if (submit) {
      submit.disabled = false;
      submit.textContent = submitLabel;
    }
  }

  var submitLabel = submit ? submit.textContent : 'Send';
  var nativeSubmit = HTMLFormElement.prototype.submit;

  form.addEventListener('submit', function (event) {
    var passed = false;
    try {
      setStatus('', false);
      var identity = identityGate();
      var firstBad = identity.ok ? null : (identity.focus || namedControl('name') || namedControl('email'));
      controls.forEach(function (el) { if (!mark(el) && !firstBad) firstBad = el; });
      if (!identity.ok || firstBad) {
        event.preventDefault();
        setStatus('Please complete the highlighted fields.', true);
        if (firstBad && firstBad.focus) firstBad.focus();
        return;
      }
      passed = true;
      if (keyField && keyField.value === PLACEHOLDER) {
        event.preventDefault();
        fail('This form is not connected yet. Please try again soon.');
        return;
      }
      if (subjectField) subjectField.value = buildSubject();
      var tx = isInquiry ? transactionId() : '';
      if (!window.fetch || !window.FormData) return; // fall back to a normal POST

      event.preventDefault();
      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Sending…';
      }
      var data = {};
      new FormData(form).forEach(function (value, key) { data[key] = value; });
      delete data.redirect; // JSON submissions get a JSON reply instead of a redirect
      // Unchecked honeypot stays out of the payload. A checked box is "on", which Web3Forms rejects.

      fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        return res.json().catch(function () { return { success: res.ok }; }).then(function (json) {
          if (res.ok && json && json.success) {
            if (tx && window.sableTrackInquiry) window.sableTrackInquiry(tx);
            if (wrap) wrap.classList.add('sent');
            form.reset();
            if (success) success.focus();
          } else {
            fail('Sorry, your message could not be sent. Please check the form and try again in a few minutes.');
          }
        });
      }).catch(function () {
        // Network problem (or fetch blocked): fall back to a regular POST so the lead is not lost.
        // Validation has already passed. Call the prototype so this does not re-enter the handler.
        nativeSubmit.call(form);
      });
    } catch (err) {
      // A throw before the gate passed must not fall through to a native blank post.
      if (!passed) event.preventDefault();
    }
  });

  // form.submit() and HTMLFormElement.prototype.submit.call(form) skip the submit event
  // and HTML constraint validation. Route them through requestSubmit so a blank call
  // still hits the handler. The network fallback keeps the original method.
  HTMLFormElement.prototype.submit = function () {
    if (this === form && typeof this.requestSubmit === 'function') {
      this.requestSubmit();
      return;
    }
    return nativeSubmit.call(this);
  };
})();
