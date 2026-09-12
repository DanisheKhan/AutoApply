/**
 * Platform Adapters & Universal DOM Dispatcher for AutoApply Pro
 * Provides enterprise-grade form filling for Google Forms, TCS/Infosys Enterprise,
 * LinkedIn Easy Apply, Workday, Greenhouse, Lever, Ashby, and Modern React/Vue/Angular ATS.
 */

let _heuristics = {};
if (typeof require !== 'undefined') {
  try {
    _heuristics = require('./heuristics.js');
  } catch (e) {}
}

// 1. Synthetic React 16/17/18/19 & Vue Event Dispatcher
function setNativeValue(element, value) {
  if (!element || value === undefined || value === null) return false;

  // If contenteditable div
  if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
    element.focus();
    element.textContent = value;
    element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: value }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    highlightFilledElement(element);
    return true;
  }

  const tag = element.tagName.toLowerCase();
  const prototype = tag === 'input' 
    ? window.HTMLInputElement.prototype 
    : tag === 'textarea' 
      ? window.HTMLTextAreaElement.prototype 
      : window.HTMLSelectElement.prototype;

  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

  element.focus();

  // Reset React 16+ _valueTracker so React's synthetic event system detects change
  const tracker = element._valueTracker;
  if (tracker) {
    tracker.setValue(element.value === value ? '' : element.value);
  }

  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }

  // Dispatch full event sequence to satisfy React, Vue, Angular, Svelte, and vanilla listeners
  element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: String(value) }));
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));

  highlightFilledElement(element);
  return true;
}

// 2. Native & Custom Checkbox / Radio Setter
function setNativeCheckboxOrRadio(element, shouldCheck = true) {
  if (!element) return false;

  element.focus();

  // If already in target state, just ensure events
  if (element.checked !== shouldCheck) {
    const tracker = element._valueTracker;
    if (tracker) {
      tracker.setValue(!shouldCheck);
    }
    element.checked = shouldCheck;
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  }

  element.setAttribute('aria-checked', shouldCheck ? 'true' : 'false');
  if (shouldCheck) {
    element.classList.add('selected', 'checked', 'active');
  } else {
    element.classList.remove('selected', 'checked', 'active');
  }

  highlightFilledElement(element);
  return true;
}

// 3. Native Radio Group Matcher
function fillNativeRadioGroup(radioInput, targetValue) {
  if (!radioInput || !radioInput.name || !targetValue) return false;
  const form = radioInput.form || document;
  let group;
  try {
    group = form.querySelectorAll(`input[type="radio"][name="${CSS.escape(radioInput.name)}"]`);
  } catch (e) {
    group = form.querySelectorAll(`input[type="radio"]`);
  }
  
  const tLower = targetValue.toString().toLowerCase();
  const isTargetNegative = /^(0|no|false|none|nil|zero)$/i.test(tLower);
  const isTargetPositive = /^(1|yes|true|authorized|eligible|agree)$/i.test(tLower);

  for (const r of group) {
    const rLabel = (r.getAttribute('aria-label') || r.value || getElementLabel(r) || '').toLowerCase();
    const isRadioNegative = /\b(no|not|false|none|zero|0|nil)\b/i.test(rLabel);
    const isRadioPositive = /\b(yes|authorized|eligible|true|agree)\b/i.test(rLabel);

    let isMatch = rLabel.includes(tLower) || tLower.includes(rLabel);
    if (isTargetPositive && isRadioPositive) isMatch = true;
    if (isTargetNegative && isRadioNegative) isMatch = true;
    if (tLower === 'male' && /\b(male|man)\b/i.test(rLabel)) isMatch = true;
    if (tLower === 'female' && /\b(female|woman)\b/i.test(rLabel)) isMatch = true;

    if (isMatch) {
      return setNativeCheckboxOrRadio(r, true);
    }
  }
  return false;
}

function highlightFilledElement(element) {
  if (!element) return;
  const originalTransition = element.style.transition;
  const originalOutline = element.style.outline;
  const originalBoxShadow = element.style.boxShadow;

  element.style.transition = 'all 0.2s ease';
  element.style.outline = '2px solid #a8c7fa';
  element.style.boxShadow = '0 0 10px rgba(168, 199, 250, 0.4)';

  setTimeout(() => {
    element.style.outline = originalOutline;
    element.style.boxShadow = originalBoxShadow;
    element.style.transition = originalTransition;
  }, 1200);
}

function highlightElementThinking(element) {
  if (!element) return;
  element.style.transition = 'all 0.3s ease';
  element.style.outline = '2px solid #F59E0B';
  element.style.boxShadow = '0 0 12px rgba(245, 158, 11, 0.45)';
}

// 3. Platform Detection
function detectCurrentPlatform() {
  // 1. Inside test harness simulator
  if (typeof document !== 'undefined') {
    if (document.getElementById('google-form-mock') && document.getElementById('tab-google')?.classList.contains('active')) {
      return 'Google Forms';
    }
    if (document.getElementById('enterprise-form-mock') && document.getElementById('tab-enterprise')?.classList.contains('active')) {
      return 'TCS / Infosys Enterprise';
    }
    if (document.getElementById('modern-ats-mock') && document.getElementById('tab-modern')?.classList.contains('active')) {
      return 'Modern Tech ATS';
    }
    if (document.getElementById('edgecases-form-mock') && document.getElementById('tab-edgecases')?.classList.contains('active')) {
      return 'Form Sandbox & Edge Cases';
    }
  }

  // 2. Intelligent Job Form Detection via JobDetector
  const jd = typeof JobDetector !== 'undefined' ? JobDetector : (typeof window !== 'undefined' ? window.JobDetector : null);
  if (jd && jd.analyzePage && typeof document !== 'undefined') {
    const analysis = jd.analyzePage(document, typeof window !== 'undefined' ? window.location : null);
    if (analysis && analysis.platform && analysis.platform !== 'Non-Job Page' && analysis.platform !== 'Standby') {
      return analysis.platform;
    }
  }

  const host = (typeof window !== 'undefined' && window.location ? window.location.hostname : '').toLowerCase();
  const path = (typeof window !== 'undefined' && window.location ? window.location.pathname : '').toLowerCase();

  if (host.includes('docs.google.com') && path.includes('/forms/')) {
    return 'Google Forms';
  }
  if (host.includes('tcs') || host.includes('ion') || host.includes('nextstep') || host.includes('infosys') || host.includes('wipro') || host.includes('capgemini')) {
    return 'TCS / Infosys Enterprise';
  }
  if (host.includes('linkedin.com') && (typeof document !== 'undefined' && document.querySelector('.jobs-easy-apply-modal, [data-test-modal]'))) {
    return 'LinkedIn Easy Apply';
  }
  if (host.includes('naukri.com') || host.includes('foundit.in') || host.includes('hirist.com')) {
    return 'Naukri / Indian Job Board';
  }
  if (host.includes('boards.greenhouse.io') || (typeof document !== 'undefined' && document.querySelector('#job_application, #application_form'))) {
    return 'Greenhouse';
  }
  if (host.includes('jobs.lever.co') || (typeof document !== 'undefined' && document.querySelector('.application-form, form#apply'))) {
    return 'Lever';
  }
  if (host.includes('myworkdayjobs.com') || host.includes('workday.com') || (typeof document !== 'undefined' && document.querySelector('[data-automation-id]'))) {
    return 'Workday';
  }
  if (host.includes('ashbyhq.com') || host.includes('smartrecruiters.com') || host.includes('wellfound.com') || host.includes('unstop.com') || host.includes('internshala.com')) {
    return 'Modern Tech ATS';
  }

  return 'Generic Web Page';
}

// 4. Section & Accordion Auto-Expander (Supports Multi-Step & Collapsible ATS Portals)
function expandAllCollapsedSections() {
  let expandedCount = 0;

  // 1. Explicit "Expand all sections" buttons or links
  const expandAllBtns = document.querySelectorAll('button, a, div[role="button"], span');
  for (const btn of expandAllBtns) {
    const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
    if (text.includes('expand all') || text === '+ expand all sections' || text === 'expand all sections') {
      try {
        btn.click();
        expandedCount++;
      } catch (e) {}
    }
  }

  // 2. Collapsed accordion headers / sections with aria-expanded="false" or class "collapsed"
  const collapsedHeaders = document.querySelectorAll(
    '[aria-expanded="false"], .collapsed, [data-toggle="collapse"].collapsed, .accordion-header, summary, div[role="tab"][aria-selected="false"], .panel-heading'
  );
  for (const header of collapsedHeaders) {
    // Strictly skip form dropdowns, listboxes, comboboxes, and Google Forms menus
    const tag = header.tagName.toLowerCase();
    const role = (header.getAttribute('role') || '').toLowerCase();
    const ariaHasPopup = (header.getAttribute('aria-haspopup') || '').toLowerCase();
    if (tag === 'select' || role === 'combobox' || role === 'listbox' || role === 'option' || role === 'menu' || ariaHasPopup === 'listbox') continue;
    if (header.classList.contains('ry3kXd') || header.classList.contains('quantumWizMenuPaperselectEl') || header.classList.contains('gf-custom-select')) continue;
    if (header.closest('.Qr7Oae, .geS5n, .vQx30e, .gf-select-container')) continue;

    if (header.getAttribute('aria-expanded') === 'false' || header.classList.contains('collapsed')) {
      try {
        header.click();
        expandedCount++;
      } catch (e) {}
    }
  }

  // 3. Look for section headers with chevron or arrow (e.g. "> My Documents", "> Profile Information")
  const headersWithChevrons = document.querySelectorAll('.card-header, .accordion-title, .section-header, h2, h3, h4');
  for (const h of headersWithChevrons) {
    const text = (h.innerText || '').trim();
    if (text.startsWith('>') || text.startsWith('▶') || text.startsWith('+')) {
      try {
        h.click();
        expandedCount++;
      } catch (e) {}
    }
  }

  return expandedCount;
}

// 5. Helper: Check if an input or select is already filled by candidate
function isElementAlreadyFilled(element) {
  if (!element) return false;
  if (element.type === 'radio' || element.type === 'checkbox') return false;

  const tag = element.tagName.toLowerCase();

  // Native <select> element
  if (tag === 'select') {
    if (element.selectedIndex < 0) return false;
    const selectedOpt = element.options[element.selectedIndex];
    if (!selectedOpt) return false;
    const val = (selectedOpt.value || '').trim().toLowerCase();
    const text = (selectedOpt.text || '').trim().toLowerCase();

    // Check if current selection is a placeholder like "No Selection", "- Select -", "Choose", "None", empty, 0, etc.
    const isPlaceholderVal = !val || val === '0' || val === '-1' || val === 'none' || val === 'select' || val === 'no_selection' || /^(-|--|select|choose|none|default|please|no\s*selection|--select--|- select -|\+?\s*select)/i.test(val);
    const isPlaceholderText = !text || /^(-|--|select|choose|none|default|please|no\s*selection|--select--|- select -|\+?\s*select)/i.test(text);

    return !(isPlaceholderVal || isPlaceholderText);
  }

  // ContentEditable div
  if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
    const text = (element.textContent || '').trim();
    return text.length > 0;
  }

  // Standard text/email/tel/number/url input or textarea
  const val = (element.value || '').trim();
  if (!val) return false;
  if (/^(-|--|select|choose|none|no\s*selection|--select--|- select -)$/i.test(val)) return false;

  return true;
}

// 6. Helper: Extract meaningful descriptive label for an element
function getElementLabel(element) {
  if (!element) return '';
  const labels = [];

  // 1. Associated <label for="id">
  if (element.id) {
    try {
      const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (label && label.innerText) labels.push(label.innerText.trim());
    } catch (e) {}
  }

  // 2. Parent <label>
  const parentLabel = element.closest('label');
  if (parentLabel && parentLabel.innerText) {
    labels.push(parentLabel.innerText.replace(element.value || '', '').trim());
  }

  // 3. ARIA attributes & placeholder
  if (element.getAttribute('aria-label')) labels.push(element.getAttribute('aria-label'));
  if (element.getAttribute('aria-labelledby')) {
    const ids = element.getAttribute('aria-labelledby').split(/\s+/);
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.innerText) labels.push(el.innerText.trim());
    }
  }
  if (element.placeholder) labels.push(element.placeholder);
  if (element.name) labels.push(element.name);
  if (element.id) labels.push(element.id);
  if (element.getAttribute('data-automation-id')) labels.push(element.getAttribute('data-automation-id'));
  if (element.getAttribute('data-qa')) labels.push(element.getAttribute('data-qa'));
  if (element.getAttribute('data-testid')) labels.push(element.getAttribute('data-testid'));

  // 4. Preceding sibling label or span
  const prevSibling = element.previousElementSibling;
  if (prevSibling && prevSibling.innerText && prevSibling.innerText.length < 120) {
    labels.push(prevSibling.innerText.trim());
  }

  // 5. Parent container heading / question block (Google Forms, Greenhouse, Lever, ATS)
  const container = element.closest('.form-group, .field, .input-group, .form-row, div[role="listitem"], .application-question, .form-item, tr');
  if (container) {
    const heading = container.querySelector('h1, h2, h3, h4, h5, h6, .label, .title, legend, .dir-ltr, .M7eMe, [role="heading"], td:first-child, th:first-child');
    if (heading && heading !== element && heading.innerText) {
      labels.push(heading.innerText.trim());
    }
  }

  return labels.join(' ').replace(/\s+/g, ' ').trim();
}

// 7. Match value from profile using Heuristics
function matchValueFromProfile(element, profile) {
  const labelText = getElementLabel(element);
  if (!labelText) return null;

  for (const pattern of FIELD_PATTERNS) {
    if (pattern.regex.test(labelText)) {
      if (pattern.exclude && pattern.exclude.test(labelText)) {
        continue;
      }
      try {
        const val = pattern.getValue(profile, element);
        if (val !== undefined && val !== null && val !== '') {
          return val;
        }
      } catch (e) {
        // Skip subfield errors
      }
    }
  }

  // Direct fallback for HTML password inputs
  if (element && element.type === 'password') {
    return profile.credentials?.defaultPassword || profile.personal?.password || "Danishe@1257";
  }

  // Dynamic skill years experience matcher
  if (profile.skillYears && typeof profile.skillYears === 'object') {
    const lLower = labelText.toLowerCase();
    for (const [skillName, years] of Object.entries(profile.skillYears)) {
      const skillRegex = new RegExp(`\\b${skillName.replace(/[.+]/g, '\\$&')}\\b`, 'i');
      if (skillRegex.test(lLower)) {
        return String(years);
      }
    }
  }

  return null;
}

// 8. Universal Custom Dropdown / Combobox Resolver
function fillCustomComboboxOrSelect(selectOrCombobox, targetValue) {
  if (!selectOrCombobox || !targetValue) return false;
  const valStr = targetValue.toString().trim().toLowerCase();

  // Helper: Detect placeholder options
  function isPlaceholder(text, val) {
    const t = (text || '').trim().toLowerCase();
    const v = (val || '').trim().toLowerCase();
    if (!t && !v) return true;
    if (v === '0' || v === '-1' || v === 'none' || v === 'select' || v === 'no_selection') return true;
    if (/^(-|--|select|choose|none|default|please|no\s*selection|--select--|- select -|\+?\s*select)/i.test(t)) return true;
    if (/^(-|--|select|choose|none|default|please|no\s*selection|--select--|- select -|\+?\s*select)/i.test(v)) return true;
    return false;
  }

  // Case A: Native HTML <select>
  if (selectOrCombobox.tagName.toLowerCase() === 'select') {
    const options = Array.from(selectOrCombobox.options);
    let matchedOpt = null;

    // 1. Phone Country Code special handling (+91 / India / IN / 91)
    if (valStr === '+91' || valStr === '91' || valStr.includes('91') || valStr.includes('india')) {
      matchedOpt = options.find(o => {
        if (o.disabled) return false;
        const oText = (o.text || '').toLowerCase().trim();
        const oVal = (o.value || '').toLowerCase().trim();
        if (isPlaceholder(oText, oVal) && !oText.includes('+91') && !oText.includes('91')) return false;
        return oText.includes('+91') || oText.includes('(91)') || oText.includes('91') || oText.includes('india') || oVal === '+91' || oVal === '91' || oVal === 'in' || oVal === 'ind' || oVal === 'india';
      });
    }

    // 2. Country of Residence special handling (India / IN / IND)
    if (!matchedOpt && (valStr === 'india' || valStr.includes('india'))) {
      matchedOpt = options.find(o => {
        if (o.disabled) return false;
        const oText = (o.text || '').trim().toLowerCase();
        const oVal = (o.value || '').trim().toLowerCase();
        if (isPlaceholder(oText, oVal) && !oText.includes('india')) return false;
        return oText === 'india' || oText.includes('india') || oVal === 'in' || oVal === 'ind' || oVal === 'india' || oVal === '356';
      });
    }

    // 3. Prefix / Salutation special handling (Mr. / Mr / Male)
    if (!matchedOpt && (valStr === 'mr.' || valStr === 'mr')) {
      matchedOpt = options.find(o => {
        if (o.disabled) return false;
        const oText = (o.text || '').trim().toLowerCase();
        const oVal = (o.value || '').trim().toLowerCase();
        if (isPlaceholder(oText, oVal)) return false;
        return oText === 'mr.' || oText === 'mr' || oText.startsWith('mr.') || oText.startsWith('mr ') || oVal === 'mr' || oVal === 'mr.';
      });
    }

    // 4. Marital Status special handling (Single / Unmarried)
    if (!matchedOpt && (valStr.includes('single') || valStr.includes('unmarried'))) {
      matchedOpt = options.find(o => {
        if (o.disabled) return false;
        const oText = (o.text || '').trim().toLowerCase();
        const oVal = (o.value || '').trim().toLowerCase();
        if (isPlaceholder(oText, oVal)) return false;
        return oText.includes('single') || oText.includes('unmarried') || oVal.includes('single') || oVal.includes('unmarried');
      });
    }

    // 5. Highest Education / Degree special handling (B.Tech / Bachelor)
    if (!matchedOpt && (valStr.includes('b.tech') || valStr.includes('btech') || valStr.includes('bachelor'))) {
      matchedOpt = options.find(o => {
        if (o.disabled) return false;
        const oText = (o.text || '').trim().toLowerCase();
        const oVal = (o.value || '').trim().toLowerCase();
        if (isPlaceholder(oText, oVal)) return false;
        return oText.includes('b.tech') || oText.includes('btech') || oText.includes('bachelor') || oText.includes('undergraduate') || oText.includes('graduate') || oVal.includes('btech') || oVal.includes('b.tech');
      });
    }

    // 6. Nationality / Citizenship special handling (Indian / Citizen)
    if (!matchedOpt && (valStr.includes('indian') || valStr.includes('citizen'))) {
      matchedOpt = options.find(o => {
        if (o.disabled) return false;
        const oText = (o.text || '').trim().toLowerCase();
        const oVal = (o.value || '').trim().toLowerCase();
        if (isPlaceholder(oText, oVal)) return false;
        return oText.includes('indian') || oText.includes('citizen') || oText.includes('india') || oVal === 'in' || oVal === 'ind';
      });
    }

    // 7. Exact match by text or value
    if (!matchedOpt) {
      matchedOpt = options.find(o => {
        if (o.disabled) return false;
        const oText = o.text.trim().toLowerCase();
        const oVal = o.value.trim().toLowerCase();
        if (isPlaceholder(oText, oVal)) return false;
        return oText === valStr || oVal === valStr;
      });
    }

    // 8. Substring inclusion
    if (!matchedOpt) {
      matchedOpt = options.find(o => {
        if (o.disabled) return false;
        const oText = o.text.toLowerCase();
        const oVal = o.value.toLowerCase();
        if (isPlaceholder(oText, oVal)) return false;
        return oText.includes(valStr) || oVal.includes(valStr) || valStr.includes(oText);
      });
    }

    // 9. Token match
    if (!matchedOpt) {
      const tokens = valStr.split(/[\s/,-]+/).filter(t => t.length > 2);
      matchedOpt = options.find(o => {
        if (o.disabled) return false;
        const oText = o.text.toLowerCase();
        if (isPlaceholder(oText, o.value)) return false;
        return tokens.some(tok => oText.includes(tok));
      });
    }

    // 10. Affirmative / Negative match (Yes/No)
    if (!matchedOpt && /^(yes|true|authorized|eligible|agree|citizen|male)$/i.test(valStr)) {
      matchedOpt = options.find(o => {
        if (o.disabled) return false;
        const oText = o.text.toLowerCase();
        if (isPlaceholder(oText, o.value)) return false;
        return /^(yes|agree|male|authorized|citizen|eligible)$/i.test(oText) || oText.startsWith('yes');
      });
    } else if (!matchedOpt && /^(no|false|none|zero|0)$/i.test(valStr)) {
      matchedOpt = options.find(o => {
        if (o.disabled) return false;
        const oText = o.text.toLowerCase();
        if (isPlaceholder(oText, o.value)) return false;
        return /^(no|none|zero|false)$/i.test(oText) || oText.startsWith('no');
      });
    }

    if (matchedOpt) {
      selectOrCombobox.value = matchedOpt.value;
      selectOrCombobox.selectedIndex = options.indexOf(matchedOpt);
      selectOrCombobox.dispatchEvent(new Event('input', { bubbles: true }));
      selectOrCombobox.dispatchEvent(new Event('change', { bubbles: true }));
      highlightFilledElement(selectOrCombobox);
      return true;
    }
    return false;
  }

  // Case B: Google Forms or ARIA custom listbox / combobox
  const listbox = selectOrCombobox.closest('div[role="listbox"], .quantumWizMenuPaperselectEl, .gf-custom-select, [aria-haspopup="listbox"]') || selectOrCombobox;
  const container = listbox.closest('div[role="listitem"], .form-group, .gf-select-container') || document.body;

  const candidateOptions = Array.from(
    container.querySelectorAll('div[role="option"], .quantumWizMenuPaperselectOption, .gf-dropdown-option, [data-value]')
  ).concat(
    Array.from(document.querySelectorAll('.exportSelectPopup div[role="option"], .quantumWizMenuPaperselectPopup div[role="option"], .OA0dhb div[role="option"]'))
  );

  let targetOpt = candidateOptions.find(opt => {
    const text = (opt.getAttribute('data-value') || opt.innerText || '').trim().toLowerCase();
    return text === valStr || text.includes(valStr) || valStr.includes(text);
  });

  if (!targetOpt) {
    const words = valStr.split(/[\s/,-]+/).filter(w => w.length > 2);
    targetOpt = candidateOptions.find(opt => {
      const text = (opt.getAttribute('data-value') || opt.innerText || '').toLowerCase();
      return words.some(w => text.includes(w));
    });
  }

  if (targetOpt) {
    targetOpt.focus();
    targetOpt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    targetOpt.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    targetOpt.click();
    targetOpt.setAttribute('aria-selected', 'true');
    targetOpt.classList.add('selected');

    const simLabel = listbox.querySelector('.gf-select-text');
    if (simLabel) {
      simLabel.textContent = (targetOpt.innerText || targetOpt.getAttribute('data-value') || '').trim();
    }
    listbox.setAttribute('aria-expanded', 'false');
    highlightFilledElement(listbox);
    return true;
  }

  return false;
}

// Helper: Clear Google Forms validation error states without destructively hiding question containers
function clearGoogleFormItemError(item) {
  if (!item) return;
  item.classList.remove('NPEfkd', 'RHiWh', 'hasError', 'is-invalid');
  item.querySelectorAll('.geS5n, .Qr7Oae, [role="listitem"]').forEach(el => {
    el.classList.remove('RHiWh', 'NPEfkd');
  });
  // Restore response wrappers if previously hidden by any script
  item.querySelectorAll('.t9kgXb, .AgroKb, .vQx30e').forEach(el => {
    el.style.display = '';
  });
  // Only hide actual role="alert" message bubbles
  item.querySelectorAll('div[role="alert"], .spb5kn').forEach(alertEl => {
    if (!alertEl.classList.contains('t9kgXb') && !alertEl.querySelector('input, select, [role="listbox"]')) {
      alertEl.style.display = 'none';
    }
  });
}

// 7.1 Dedicated Google Forms Material Dropdown Listbox Engine
async function fillGoogleFormsDropdown(listboxEl, targetValue, questionText = '') {
  if (!listboxEl) return { success: false, aiUsed: false };
  const valStr = (targetValue || '').toString().trim().toLowerCase();
  const item = listboxEl.closest('div[role="listitem"], .Qr7Oae, .geS5n, .gf-listitem') || listboxEl.parentElement || document.body;

  console.log(`[AutoApply Pro] Processing dropdown for: "${questionText}" (Target: "${targetValue}")`);

  // Helper: Detect placeholder
  function isPlaceholder(text, val) {
    const t = (text || '').trim().toLowerCase();
    const v = (val || '').trim().toLowerCase();
    if (!t && !v) return true;
    if (v === '0' || v === '-1' || v === 'none' || v === 'select' || v === 'no_selection') return true;
    return /^(-|--|select|choose|none|default|please|no\s*selection|--select--|- select -|\+?\s*select)/i.test(t) ||
           /^(-|--|select|choose|none|default|please|no\s*selection|--select--|- select -|\+?\s*select)/i.test(v);
  }

  function getOptText(el) {
    if (!el) return '';
    return (el.getAttribute('data-value') || el.querySelector('.vRMGwf')?.textContent || el.innerText || el.textContent || '').trim();
  }

  // 1. Check if candidate options already exist in the item before clicking
  let candidateOptions = Array.from(item.querySelectorAll(
    'div[role="option"], .quantumWizMenuPaperselectOption, .gf-dropdown-option, .MocG8c, [data-value]'
  )).filter(opt => {
    const text = getOptText(opt);
    return text && !isPlaceholder(text, opt.getAttribute('data-value'));
  });

  // 2. If options not found, click listbox once to open menu
  if (candidateOptions.length === 0) {
    listboxEl.focus();
    if (listboxEl.getAttribute('aria-expanded') !== 'true') {
      listboxEl.click();
    }
    await new Promise(r => setTimeout(r, 150));

    // Search in item again after click
    candidateOptions = Array.from(item.querySelectorAll(
      'div[role="option"], .quantumWizMenuPaperselectOption, .gf-dropdown-option, .MocG8c, [data-value]'
    )).filter(opt => {
      const text = getOptText(opt);
      return text && !isPlaceholder(text, opt.getAttribute('data-value'));
    });
  }

  // If not inside item, find active unhidden popup in document body
  if (candidateOptions.length === 0) {
    const popups = Array.from(document.querySelectorAll(
      '.exportSelectPopup, .quantumWizMenuPaperselectPopup, .OA0dhb, .ncFHdd, div[role="listbox"][aria-expanded="true"]'
    )).filter(p => p.style.display !== 'none' && p.getAttribute('aria-hidden') !== 'true');

    for (const popup of popups) {
      const opts = Array.from(popup.querySelectorAll('div[role="option"], .MocG8c, [data-value]')).filter(opt => {
        const text = getOptText(opt);
        return text && !isPlaceholder(text, opt.getAttribute('data-value'));
      });
      if (opts.length > 0) {
        candidateOptions = opts;
        break;
      }
    }
  }

  // Fallback to all options if still empty
  if (candidateOptions.length === 0) {
    candidateOptions = Array.from(document.querySelectorAll(
      '.exportSelectPopup div[role="option"], .quantumWizMenuPaperselectPopup div[role="option"], .OA0dhb div[role="option"], div[role="listbox"] div[role="option"], .MocG8c, div[role="option"][data-value], .gf-dropdown-option'
    )).filter(opt => {
      const text = getOptText(opt);
      return text && !isPlaceholder(text, opt.getAttribute('data-value'));
    });
  }

  console.log(`[AutoApply Pro] Found ${candidateOptions.length} candidate options for "${questionText}":`, candidateOptions.map(o => getOptText(o)));

  let targetOpt = null;
  let isAiUsed = false;

  // ==========================================
  // Domain Matchers (Strict Priority Ordering)
  // ==========================================

  // 1. PPO Interest: "Yes"
  if (/ppo|pre[_\s-]?placement|post.*internship/i.test(questionText)) {
    targetOpt = candidateOptions.find(o => {
      const t = getOptText(o).toLowerCase();
      return /^(yes|definitely|interested|positive)\b/i.test(t);
    });
  }

  // 2. Stipend & Program Details: "Yes"
  else if (/stipend|program.*structure|gone.*through.*program|clear.*stipend/i.test(questionText)) {
    targetOpt = candidateOptions.find(o => {
      const t = getOptText(o).toLowerCase();
      return /^(yes|definitely|clear|positive|agree)\b/i.test(t);
    });
  }

  // 3. Months of work experience: 10 months (Priority: 6-12 months, 6 to 12, 10, 1 year, 1-2 years)
  else if (/experience|month.*work|work.*experience/i.test(questionText) || (/month/i.test(questionText) && !/course|degree|grad/i.test(questionText))) {
    // Priority 1: Range containing 10 months (6-12 months, 6 to 12, 10, 1-2 years, 1 year)
    targetOpt = candidateOptions.find(o => {
      const t = getOptText(o).toLowerCase();
      return t.includes('6-12') || t.includes('6 to 12') || t.includes('10') || t.includes('1-2') || t.includes('1 to 2') || t.includes('1 year');
    });
    // Priority 2: Fresher or 0-6 if no higher option exists
    if (!targetOpt) {
      targetOpt = candidateOptions.find(o => {
        const t = getOptText(o).toLowerCase();
        return t.includes('0-6') || t.includes('1-6') || t.includes('fresher') || t.includes('0-1');
      });
    }
  }

  // 4. Year of Graduation: "2026"
  else if (/year.*graduation|graduation.*year|batch/i.test(questionText) || /2026/.test(valStr)) {
    targetOpt = candidateOptions.find(o => {
      const t = getOptText(o).trim();
      return t === '2026' || t.includes('2026');
    });
  }

  // 5. Course Name / Degree: Plain "BE/B.Tech" or "B.Tech" (Exclude + MBA, Dual, Integrated)
  else if (/course|degree|qualification|highest.*education/i.test(questionText) || valStr.includes('b.tech') || valStr.includes('btech') || valStr.includes('be/b.tech')) {
    // Priority 1: Pure B.Tech / BE/B.Tech (No MBA, No Dual, No Integrated, No +)
    targetOpt = candidateOptions.find(o => {
      const t = getOptText(o).toLowerCase();
      const isPureBtech = (t.includes('b.tech') || t.includes('btech') || t.includes('be/b.tech') || t.includes('b.e.') || t.includes('bachelor of technology') || t.includes('bachelor in technology') || t.includes('bachelor of engineering')) &&
                          !t.includes('mba') && !t.includes('dual') && !t.includes('integrated') && !t.includes('+');
      return isPureBtech;
    });

    // Priority 2: Standard BE/B.Tech if pure wasn't isolated
    if (!targetOpt) {
      targetOpt = candidateOptions.find(o => {
        const t = getOptText(o).toLowerCase();
        return (t.includes('b.tech') || t.includes('btech') || t.includes('be/b.tech') || t.includes('bachelor') || t.includes('b.e.')) && !t.includes('mba');
      });
    }

    // Priority 3: Any tech degree
    if (!targetOpt) {
      targetOpt = candidateOptions.find(o => {
        const t = getOptText(o).toLowerCase();
        return t.includes('engineering') || t.includes('computer') || t.includes('artificial');
      });
    }
  }

  // 6. Generic Affirmative / Negative
  if (!targetOpt && /^(yes|agree|positive|authorized|eligible)$/i.test(valStr)) {
    targetOpt = candidateOptions.find(o => {
      const t = getOptText(o).toLowerCase();
      return /^(yes|agree|positive)\b/i.test(t);
    });
  } else if (!targetOpt && /^(no|false|none|zero|0)$/i.test(valStr)) {
    targetOpt = candidateOptions.find(o => {
      const t = getOptText(o).toLowerCase();
      return /^(no|none|zero|false)\b/i.test(t);
    });
  }

  // 7. Exact match (case insensitive)
  if (!targetOpt && valStr) {
    targetOpt = candidateOptions.find(opt => {
      const text = getOptText(opt).toLowerCase();
      return text === valStr;
    });
  }

  // 8. Substring match
  if (!targetOpt && valStr) {
    targetOpt = candidateOptions.find(opt => {
      const text = getOptText(opt).toLowerCase();
      return text.includes(valStr) || valStr.includes(text);
    });
  }

  // 9. Token match
  if (!targetOpt && valStr) {
    const tokens = valStr.split(/[\s/,-]+/).filter(t => t.length > 2);
    targetOpt = candidateOptions.find(opt => {
      const text = getOptText(opt).toLowerCase();
      return tokens.some(tok => text.includes(tok));
    });
  }

  // 10. UNIVERSAL GEMINI AI FALLBACK FOR DROPDOWN
  if (!targetOpt && candidateOptions.length > 0) {
    const visibleOptionStrings = candidateOptions.map(opt => getOptText(opt)).filter(t => t && !isPlaceholder(t, t));

    if (visibleOptionStrings.length > 0) {
      try {
        highlightElementThinking(listboxEl);
        const aiChosen = await sendInferFieldAiRequest({
          label: questionText,
          options: visibleOptionStrings,
          tag: 'select'
        });

        if (aiChosen && aiChosen.trim()) {
          const aiChoiceClean = aiChosen.trim().toLowerCase();
          targetOpt = candidateOptions.find(opt => {
            const t = getOptText(opt).toLowerCase();
            return t === aiChoiceClean || t.includes(aiChoiceClean) || aiChoiceClean.includes(t);
          });
          if (targetOpt) {
            isAiUsed = true;
          }
        }
      } catch (err) {
        console.warn('[AutoApply Pro] Gemini AI dropdown inference failed:', err);
      }
    }
  }

  // Dispatch selection on target option & let Google Forms manage its internal state
  if (targetOpt) {
    const optValue = targetOpt.getAttribute('data-value') || getOptText(targetOpt);

    targetOpt.focus();
    targetOpt.click();
    targetOpt.setAttribute('aria-selected', 'true');
    targetOpt.classList.add('selected');

    // Update display label in dropdown trigger
    const displayLabel = listboxEl.querySelector('.vRMGwf, .quantumWizMenuPaperselectContent, .gf-select-text, span[jsname="V67aGc"]');
    if (displayLabel) {
      displayLabel.textContent = optValue;
    }

    // Set all hidden/text inputs inside this question item to satisfy Google Forms validation
    const questionInputs = item.querySelectorAll('input[type="hidden"], input[name^="entry."], input[jsname="L9xktb"], input.quantumWizMenuPaperselectInput');
    for (const qInput of questionInputs) {
      setNativeValue(qInput, optValue);
    }

    // Clear "This is a required question" error UI on the item safely
    clearGoogleFormItemError(item);

    highlightFilledElement(listboxEl);

    // Wait 120ms for Google Forms Closure engine to complete state mutation
    await new Promise(r => setTimeout(r, 120));

    return { success: true, aiUsed: isAiUsed };
  }

  return { success: false, aiUsed: false };
}

// 7. Google Forms Adapter (2-Step Scanning: Local Heuristics -> Universal Gemini AI Fallback)
async function fillGoogleForms(profile, options = { aiAnswers: false }) {
  let filledCount = 0;
  let aiCount = 0;

  // Auto-expand any collapsed sections
  expandAllCollapsedSections();

  // Deduplicate question items so child containers (e.g. .geS5n inside .Qr7Oae) don't run twice
  const rawItems = Array.from(document.querySelectorAll('div[role="listitem"], .Qr7Oae, .geS5n, .gf-listitem'));
  const listItems = rawItems.filter(el => {
    const parent = el.parentElement?.closest('div[role="listitem"], .Qr7Oae, .geS5n, .gf-listitem');
    return !parent;
  });

  const unfilledItemsForAi = [];

  // ==========================================
  // PHASE 1: Scan & Fill with Local Heuristics
  // ==========================================
  for (const item of listItems) {
    const headerEl = item.querySelector('.M7eMe, [role="heading"], .dir-ltr, .HoPnR, .F9vfv');
    const questionText = headerEl ? headerEl.innerText.trim() : '';
    if (!questionText) continue;

    let itemFilled = false;

    // 1. Check for Radio Buttons first
    const radios = item.querySelectorAll('div[role="radio"], input[type="radio"]');
    if (radios.length > 0) {
      let targetValue = null;
      for (const pattern of FIELD_PATTERNS) {
        if (pattern.regex.test(questionText)) {
          if (pattern.exclude && pattern.exclude.test(questionText)) continue;
          targetValue = pattern.getValue(profile, item);
          if (targetValue) break;
        }
      }

      if (!targetValue) {
        if (/ppo|pre[_\s-]?placement|post.*internship/i.test(questionText)) {
          targetValue = "Yes";
        } else if (/stipend|program.*structure|gone.*through.*program|clear.*stipend/i.test(questionText)) {
          targetValue = "Yes";
        } else if (/month.*experience|work.*experience|how many months/i.test(questionText)) {
          targetValue = "10";
        } else {
          targetValue = resolveBooleanQuestion(questionText);
        }
      }

      const tLower = (targetValue || '').toString().toLowerCase();
      let matchedRadio = null;

      // Special domain matches for radio options
      if (/ppo|pre[_\s-]?placement|post.*internship/i.test(questionText) || /stipend|program.*structure|gone.*through/i.test(questionText)) {
        matchedRadio = Array.from(radios).find(r => {
          const lbl = (r.getAttribute('aria-label') || r.getAttribute('data-value') || r.innerText || '').toLowerCase();
          return /^(yes|definitely|clear|interested|positive|agree)\b/i.test(lbl);
        });
      } else if (/month.*experience|work.*experience|how many months/i.test(questionText)) {
        matchedRadio = Array.from(radios).find(r => {
          const lbl = (r.getAttribute('aria-label') || r.getAttribute('data-value') || r.innerText || '').toLowerCase();
          return lbl.includes('6-12') || lbl.includes('6 to 12') || lbl.includes('10') || lbl.includes('1-2') || lbl.includes('1 year');
        });
        if (!matchedRadio) {
          matchedRadio = Array.from(radios).find(r => {
            const lbl = (r.getAttribute('aria-label') || r.getAttribute('data-value') || r.innerText || '').toLowerCase();
            return lbl.includes('0-6') || lbl.includes('fresher');
          });
        }
      }

      if (!matchedRadio) {
        for (const radio of radios) {
          const radioLabel = (radio.getAttribute('aria-label') || radio.getAttribute('data-value') || radio.innerText || '').trim().toLowerCase();
          const isTargetNegative = /^(0|no|false|none|nil|zero)$/i.test(tLower);
          const isRadioNegative = /\b(no|not|false|none|zero|0|nil)\b/i.test(radioLabel);
          const isTargetPositive = /^(1|yes|true|authorized|eligible|agree)$/i.test(tLower);
          const isRadioPositive = /\b(yes|authorized|eligible|true|agree)\b/i.test(radioLabel);

          let isMatch = radioLabel === tLower || radioLabel.includes(tLower) || tLower.includes(radioLabel);
          if (isTargetPositive && isRadioPositive) isMatch = true;
          if (isTargetNegative && isRadioNegative) isMatch = true;
          if (tLower === 'male' && /\b(male|man)\b/i.test(radioLabel)) isMatch = true;
          if (tLower === 'female' && /\b(female|woman)\b/i.test(radioLabel)) isMatch = true;

          if (isMatch) {
            matchedRadio = radio;
            break;
          }
        }
      }

      if (matchedRadio) {
        const group = matchedRadio.closest('.gf-radio-group, div[role="radiogroup"]') || item;
        group.querySelectorAll('div[role="radio"]').forEach(r => {
          r.classList.remove('selected');
          r.setAttribute('aria-checked', 'false');
        });

        matchedRadio.focus();
        try {
          matchedRadio.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window, composed: true, buttons: 1 }));
        } catch (e) {}
        matchedRadio.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, composed: true, buttons: 1, button: 0 }));
        try {
          matchedRadio.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window, composed: true }));
        } catch (e) {}
        matchedRadio.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, composed: true, button: 0 }));
        matchedRadio.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, composed: true, button: 0 }));
        try {
          matchedRadio.click();
        } catch (e) {}

        matchedRadio.classList.add('selected');
        matchedRadio.setAttribute('aria-checked', 'true');

        // Sync hidden input in question container
        const radioVal = matchedRadio.getAttribute('data-value') || (matchedRadio.getAttribute('aria-label') || matchedRadio.innerText || '').trim();
        const hiddenInputs = item.querySelectorAll('input[type="hidden"], input[name^="entry."], input[jsname="L9xktb"]');
        for (const hInput of hiddenInputs) {
          setNativeValue(hInput, radioVal);
        }

        // Clear error state safely
        clearGoogleFormItemError(item);

        console.log(`[AutoApply Pro] Selected radio option "${radioVal}" for "${questionText}"`);
        highlightFilledElement(matchedRadio);
        filledCount++;
        itemFilled = true;
      }

      if (itemFilled) continue;
    }

    // 2. Dropdowns & Listboxes
    const selectEl = item.querySelector('select');
    const listboxEl = item.querySelector('div[role="listbox"], div[role="combobox"], .quantumWizMenuPaperselectEl, .ry3kXd, .jgvuAb, .vQx30e div[role="listbox"], .vQx30e div[jsname], div[jscontroller="e2G2jd"], .gf-custom-select, [aria-haspopup="listbox"]');

    if (selectEl || listboxEl) {
      if (isElementAlreadyFilled(selectEl || listboxEl)) continue;

      let matchedVal = null;
      for (const pattern of FIELD_PATTERNS) {
        if (pattern.regex.test(questionText)) {
          if (pattern.exclude && pattern.exclude.test(questionText)) continue;
          matchedVal = pattern.getValue(profile, selectEl || listboxEl);
          if (matchedVal) break;
        }
      }

      // Domain intelligent fallbacks for Google Forms dropdowns
      if (!matchedVal) {
        if (/ppo|pre[_\s-]?placement|post.*internship/i.test(questionText)) {
          matchedVal = "Yes";
        } else if (/stipend|program.*structure|gone.*through.*program|clear.*stipend/i.test(questionText)) {
          matchedVal = "Yes";
        } else if (/month.*experience|work.*experience|how many months/i.test(questionText)) {
          matchedVal = "10";
        } else if (/course|qualification|degree|highest.*education/i.test(questionText) && !/stipend|structure|ppo|internship/i.test(questionText)) {
          matchedVal = profile.academics?.graduation?.degree || "B.Tech";
        } else if (/year.*graduation|graduation.*year|batch/i.test(questionText)) {
          matchedVal = profile.academics?.graduation?.passingYear || "2026";
        } else if (/state|region|province/i.test(questionText)) {
          matchedVal = profile.address?.state || "Maharashtra";
        } else if (/country|citizenship/i.test(questionText)) {
          matchedVal = profile.address?.country || "India";
        } else if (/gender|sex/i.test(questionText)) {
          matchedVal = profile.personal?.gender || "Male";
        } else if (/notice|join/i.test(questionText)) {
          matchedVal = "Immediate";
        } else {
          matchedVal = resolveBooleanQuestion(questionText);
        }
      }

      if (selectEl) {
        if (fillCustomComboboxOrSelect(selectEl, matchedVal)) {
          filledCount++;
          itemFilled = true;
        }
      } else if (listboxEl) {
        const result = await fillGoogleFormsDropdown(listboxEl, matchedVal, questionText);
        if (result.success) {
          filledCount++;
          if (result.aiUsed) aiCount++;
          itemFilled = true;
        }
      }

      if (itemFilled) continue;
    }



    // 3. Checkboxes
    const checkboxes = item.querySelectorAll('div[role="checkbox"], input[type="checkbox"]');
    if (checkboxes.length > 0) {
      const skillsList = extractCandidateSkills(profile);

      for (const cb of checkboxes) {
        const label = (cb.getAttribute('aria-label') || cb.innerText || '').toLowerCase();
        const isMatch = skillsList.some(skill => 
          label.includes(skill) || 
          skill.includes(label) ||
          label.split(/[\s,()&+-]+/).some(token => token.length > 2 && skill.includes(token))
        );

        if (isMatch) {
          if (cb.tagName.toLowerCase() === 'input') {
            setNativeCheckboxOrRadio(cb, true);
          } else {
            cb.focus();
            cb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            cb.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            cb.click();
            cb.classList.add('selected');
            cb.setAttribute('aria-checked', 'true');
            highlightFilledElement(cb);
          }
          filledCount++;
          itemFilled = true;
        }
      }

      if (itemFilled) continue;
    }

    // 4. Text Inputs & Textareas (Handles single-line input.whsOnd and multi-line textarea.KHxj8b)
    const input = item.querySelector('input.whsOnd, input[type="text"], input[type="email"], input[type="tel"], input[type="date"], input[type="number"], input[type="url"], input[type="password"]');
    const textarea = item.querySelector('textarea.KHxj8b, textarea');
    const targetField = textarea || input;

    if (targetField && !isElementAlreadyFilled(targetField)) {
      // If open ended and AI Fill option is triggered
      if (options.aiAnswers && isOpenEndedQuestion(questionText)) {
        try {
          highlightElementThinking(targetField);
          const aiResponse = await sendAiRequest(questionText);
          if (aiResponse && setNativeValue(targetField, aiResponse)) {
            aiCount++;
            filledCount++;
            continue;
          }
        } catch (e) {
          console.error("AI Answering error on Google Forms item:", e);
          targetField.style.outline = '';
          targetField.style.boxShadow = '';
        }
      }

      // Standard heuristic match
      let matchedVal = null;
      for (const pattern of FIELD_PATTERNS) {
        if (pattern.regex.test(questionText)) {
          if (pattern.exclude && pattern.exclude.test(questionText)) continue;
          matchedVal = pattern.getValue(profile, targetField);
          if (matchedVal) break;
        }
      }

      // Domain intelligent fallbacks for Google Forms text inputs
      if (!matchedVal) {
        if (/ppo|pre[_\s-]?placement|post.*internship/i.test(questionText)) {
          matchedVal = "Yes";
        } else if (/stipend|program.*structure|program.*details|gone.*through.*program|clear.*stipend/i.test(questionText)) {
          matchedVal = "Yes";
        } else if (/how many months|months? of (work )?experience|month(s)?.*experience|work experience.*months?/i.test(questionText)) {
          matchedVal = "10";
        } else if (/relocat|willing.*relocate/i.test(questionText)) {
          matchedVal = "Yes";
        } else if (/notice|availability/i.test(questionText)) {
          matchedVal = "Immediate";
        }
      }

      // If open-ended question (like projects/internships) and no direct pattern, use rich instant candidate fallback
      if (!matchedVal && isOpenEndedQuestion(questionText)) {
        matchedVal = generateInstantFallbackAnswer(questionText, profile);
      }

      if (matchedVal) {
        if (setNativeValue(targetField, matchedVal)) {
          clearGoogleFormItemError(item);
          console.log(`[AutoApply Pro] Filled "${questionText}" with "${matchedVal}"`);
          filledCount++;
          itemFilled = true;
        }
      }
    }

    // If item could not be filled by heuristics, queue for Phase 2 (Universal Gemini AI Fallback)
    if (!itemFilled) {
      unfilledItemsForAi.push({ item, questionText, selectEl, listboxEl, radios, checkboxes, targetField });
    }
  }

  // ========================================================
  // PHASE 2: Universal Gemini AI Fallback for Unfilled Items
  // ========================================================
  for (const entry of unfilledItemsForAi) {
    const { item, questionText, listboxEl, radios, checkboxes, targetField } = entry;

    // A. Unfilled Dropdown / Listbox -> Gemini AI Option Selector
    if (listboxEl && !isElementAlreadyFilled(listboxEl)) {
      try {
        highlightElementThinking(listboxEl);
        const res = await fillGoogleFormsDropdown(listboxEl, null, questionText);
        if (res.success) {
          clearGoogleFormItemError(item);
          filledCount++;
          aiCount++;
          continue;
        }
      } catch (e) {}
    }

    // B. Unfilled Radio Buttons -> Gemini AI Choice
    if (radios && radios.length > 0) {
      const radioLabels = Array.from(radios).map(r => (r.getAttribute('aria-label') || r.getAttribute('data-value') || r.innerText || '').trim()).filter(Boolean);
      if (radioLabels.length > 0) {
        try {
          const aiChoice = await sendInferFieldAiRequest({
            label: questionText,
            options: radioLabels,
            tag: 'radio'
          });

          if (aiChoice && aiChoice.trim()) {
            const aiClean = aiChoice.trim().toLowerCase();
            const matchedRadio = Array.from(radios).find(r => {
              const lbl = (r.getAttribute('aria-label') || r.getAttribute('data-value') || r.innerText || '').toLowerCase();
              return lbl === aiClean || lbl.includes(aiClean) || aiClean.includes(lbl);
            });

            if (matchedRadio) {
              matchedRadio.focus();
              matchedRadio.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
              matchedRadio.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
              matchedRadio.click();
              matchedRadio.classList.add('selected');
              matchedRadio.setAttribute('aria-checked', 'true');
              clearGoogleFormItemError(item);
              highlightFilledElement(matchedRadio);
              filledCount++;
              aiCount++;
              continue;
            }
          }
        } catch (e) {}
      }
    }

    // C. Unfilled Single-line or Multi-line Input -> Gemini AI Inference
    if (targetField && !isElementAlreadyFilled(targetField)) {
      try {
        highlightElementThinking(targetField);
        let aiVal = null;
        if (targetField.tagName.toLowerCase() === 'textarea' || isOpenEndedQuestion(questionText)) {
          aiVal = await sendAiRequest(questionText);
        } else {
          aiVal = await sendInferFieldAiRequest({
            label: questionText,
            tag: targetField.tagName.toLowerCase(),
            type: targetField.type || 'text',
            placeholder: targetField.placeholder || ''
          });
        }

        if (aiVal && aiVal.trim()) {
          if (setNativeValue(targetField, aiVal.trim())) {
            clearGoogleFormItemError(item);
            console.log(`[AutoApply Pro] AI Filled "${questionText}" with "${aiVal.trim()}"`);
            filledCount++;
            aiCount++;
          }
        }
      } catch (e) {
        targetField.style.outline = '';
        targetField.style.boxShadow = '';
      }
    }
  }

  // ========================================================
  // PHASE 3: Automated Resume Attachment
  // ========================================================
  if (typeof autoUploadResume === 'function') {
    try {
      await autoUploadResume();
    } catch (e) {}
  }

  return { filledCount, aiCount, platform: 'Google Forms' };
}

// 8. TCS / Infosys Enterprise Adapter (2-Step Scanning: Heuristics First -> Gemini AI Fallback)
async function fillTcsInfosysEnterprise(profile, options = { aiAnswers: false }) {
  let filledCount = 0;
  let aiCount = 0;

  // Step 0: Auto-expand collapsed accordion sections & multi-step containers
  expandAllCollapsedSections();

  // Process all inputs in enterprise tables and form fields
  const elements = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea, [contenteditable="true"]'
  );

  const unfilledForAi = [];

  // Step 1: Scan & Fill with Local Heuristics (Candidate Bio & Direct Rules)
  for (const el of elements) {
    if (isElementAlreadyFilled(el)) continue;

    const labelText = getElementLabel(el);
    const tag = el.tagName.toLowerCase();

    // AI custom essay answer detection
    if (options.aiAnswers && tag === 'textarea' && isOpenEndedQuestion(labelText)) {
      try {
        highlightElementThinking(el);
        const aiAnswer = await sendAiRequest(labelText);
        if (aiAnswer && setNativeValue(el, aiAnswer)) {
          aiCount++;
          continue;
        }
      } catch (e) {
        console.error("AI Generation failed on enterprise field:", e);
      }
    }

    // Standard Heuristics match
    const matchedVal = matchValueFromProfile(el, profile);
    if (matchedVal !== null && matchedVal !== undefined) {
      if (tag === 'select') {
        if (fillCustomComboboxOrSelect(el, matchedVal)) filledCount++;
      } else if (el.type === 'radio') {
        if (fillNativeRadioGroup(el, matchedVal)) filledCount++;
      } else if (el.type === 'checkbox') {
        const isAffirmative = /yes|true|1|agree|confirm|citizen/i.test(matchedVal.toString());
        if (setNativeCheckboxOrRadio(el, isAffirmative)) filledCount++;
      } else {
        if (setNativeValue(el, matchedVal)) filledCount++;
      }
    } else {
      if (!isElementAlreadyFilled(el) && labelText) {
        unfilledForAi.push({ el, labelText, tag });
      }
    }
  }

  // Step 2: Pass unknown / unmapped fields to Gemini AI to infer
  for (const item of unfilledForAi) {
    const { el, labelText, tag } = item;
    if (isElementAlreadyFilled(el)) continue;

    let dropdownOptions = [];
    if (tag === 'select') {
      dropdownOptions = Array.from(el.options || [])
        .map(o => (o.text || o.value || '').trim())
        .filter(t => t && !/^(-|--|select|choose|none|default|please|no\s*selection|--select--|- select -|\+?\s*select)/i.test(t));
    }

    const placeholder = el.placeholder || '';
    const type = el.type || 'text';
    const section = el.closest('fieldset, section, .form-section, .accordion-body, .panel-body, form, table')?.querySelector('legend, h1, h2, h3, h4, .section-title, th')?.innerText || '';

    try {
      highlightElementThinking(el);
      const aiValue = await sendInferFieldAiRequest({
        label: labelText,
        tag,
        type,
        options: dropdownOptions,
        sectionContext: section,
        placeholder
      });

      if (aiValue && aiValue.trim()) {
        let filled = false;
        if (tag === 'select') {
          filled = fillCustomComboboxOrSelect(el, aiValue);
        } else if (type === 'radio') {
          filled = fillNativeRadioGroup(el, aiValue);
        } else if (type === 'checkbox') {
          const isAffirmative = /yes|true|1|agree|citizen|confirm/i.test(aiValue);
          filled = setNativeCheckboxOrRadio(el, isAffirmative);
        } else {
          filled = setNativeValue(el, aiValue);
        }

        if (filled) {
          filledCount++;
          aiCount++;
        }
      }
    } catch (err) {
      console.warn(`[AutoApply Pro] Gemini AI inference failed for enterprise field "${labelText}":`, err);
    }
  }

  return { filledCount, aiCount, platform: 'TCS / Infosys Enterprise' };
}

// 9. LinkedIn Easy Apply Adapter (2-Step Scanning: Heuristics First -> Gemini AI Fallback)
async function fillLinkedInEasyApply(profile, options = { aiAnswers: false }) {
  let filledCount = 0;
  let aiCount = 0;

  expandAllCollapsedSections();

  const modal = document.querySelector('.jobs-easy-apply-modal, [data-test-modal], .jobs-easy-apply-content') || document;
  const inputs = modal.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea');

  const unfilledForAi = [];

  // Step 1: Scan & Fill Heuristics
  for (const el of inputs) {
    if (isElementAlreadyFilled(el)) continue;
    const label = getElementLabel(el);
    const tag = el.tagName.toLowerCase();

    // LinkedIn-specific: "How many years of work experience do you have with [Skill]?"
    const skillMatch = label.match(/how many years of.*experience.*with\s+([A-Za-z0-9#+.\s-]+)\??/i) ||
                       label.match(/years of.*experience.*in\s+([A-Za-z0-9#+.\s-]+)\??/i);

    if (skillMatch && skillMatch[1]) {
      const skillName = skillMatch[1].trim().toLowerCase();
      let years = 2;
      if (profile.skillYears && profile.skillYears[skillName] !== undefined) {
        years = profile.skillYears[skillName];
      } else {
        for (const [s, y] of Object.entries(profile.skillYears || {})) {
          if (skillName.includes(s) || s.includes(skillName)) {
            years = y;
            break;
          }
        }
      }
      if (setNativeValue(el, years.toString())) filledCount++;
      continue;
    }

    // Standard heuristic match
    const val = matchValueFromProfile(el, profile);
    if (val && !isElementAlreadyFilled(el)) {
      if (tag === 'select') {
        if (fillCustomComboboxOrSelect(el, val)) filledCount++;
      } else if (el.type === 'radio') {
        if (fillNativeRadioGroup(el, val)) filledCount++;
      } else if (el.type === 'checkbox') {
        const isAffirmative = /yes|true|1|agree|citizen|confirm/i.test(val.toString());
        if (setNativeCheckboxOrRadio(el, isAffirmative)) filledCount++;
      } else {
        if (setNativeValue(el, val)) filledCount++;
      }
      continue;
    }

    // AI custom answers for textareas
    if (options.aiAnswers && tag === 'textarea' && !isElementAlreadyFilled(el)) {
      highlightElementThinking(el);
      const answer = await sendAiRequest(label);
      if (answer && setNativeValue(el, answer)) {
        aiCount++;
        continue;
      }
    }

    if (!isElementAlreadyFilled(el) && label) {
      unfilledForAi.push({ el, labelText: label, tag });
    }
  }

  // Step 2: Gemini AI Fallback for remaining unknown fields
  for (const item of unfilledForAi) {
    const { el, labelText, tag } = item;
    if (isElementAlreadyFilled(el)) continue;

    let dropdownOptions = [];
    if (tag === 'select') {
      dropdownOptions = Array.from(el.options || [])
        .map(o => (o.text || o.value || '').trim())
        .filter(t => t && !/^(-|--|select|choose|none|default|please|no\s*selection|--select--|- select -|\+?\s*select)/i.test(t));
    }

    try {
      highlightElementThinking(el);
      const aiValue = await sendInferFieldAiRequest({
        label: labelText,
        tag,
        type: el.type || 'text',
        options: dropdownOptions,
        sectionContext: 'LinkedIn Easy Apply',
        placeholder: el.placeholder || ''
      });

      if (aiValue && aiValue.trim()) {
        let filled = false;
        if (tag === 'select') {
          filled = fillCustomComboboxOrSelect(el, aiValue);
        } else if (el.type === 'radio') {
          filled = fillNativeRadioGroup(el, aiValue);
        } else if (el.type === 'checkbox') {
          const isAffirmative = /yes|true|1|agree|citizen|confirm/i.test(aiValue);
          filled = setNativeCheckboxOrRadio(el, isAffirmative);
        } else {
          filled = setNativeValue(el, aiValue);
        }

        if (filled) {
          filledCount++;
          aiCount++;
        }
      }
    } catch (e) {}
  }

  return { filledCount, aiCount, platform: 'LinkedIn Easy Apply' };
}

// 10. Universal Generic Form Filler (Workday, Greenhouse, Lever, Ashby, ATS)
// Step-by-Step Pipeline: Expand -> Heuristics Match -> Gemini AI Unknown Field Fallback
async function fillGenericForm(profile, options = { aiAnswers: false }) {
  let filledCount = 0;
  let aiCount = 0;

  // Step 0: Auto-expand collapsed accordion sections & multi-step containers
  expandAllCollapsedSections();

  const elements = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea, [contenteditable="true"], div[role="combobox"], div[role="listbox"]'
  );

  const unfilledForAi = [];

  // Step 1: Scan & Fill with Local Heuristics (Candidate Bio & Direct Rules)
  for (const el of elements) {
    if (isElementAlreadyFilled(el)) continue;

    const labelText = getElementLabel(el);
    const tag = el.tagName.toLowerCase();

    // AI question detection
    if (options.aiAnswers && (tag === 'textarea' || el.isContentEditable) && isOpenEndedQuestion(labelText)) {
      try {
        highlightElementThinking(el);
        const aiAnswer = await sendAiRequest(labelText);
        if (aiAnswer && setNativeValue(el, aiAnswer)) {
          aiCount++;
          continue;
        }
      } catch (e) {
        console.error("AI Generation failed on field:", e);
        el.style.outline = '';
        el.style.boxShadow = '';
      }
    }

    // Heuristic Profile Match
    const matchedVal = matchValueFromProfile(el, profile);
    if (matchedVal !== null && matchedVal !== undefined) {
      if (tag === 'select' || el.getAttribute('role') === 'combobox' || el.getAttribute('role') === 'listbox') {
        if (fillCustomComboboxOrSelect(el, matchedVal)) filledCount++;
      } else if (el.type === 'radio') {
        if (fillNativeRadioGroup(el, matchedVal)) filledCount++;
      } else if (el.type === 'checkbox') {
        const isAffirmative = /yes|true|1|agree|citizen|confirm/i.test(matchedVal.toString());
        if (setNativeCheckboxOrRadio(el, isAffirmative)) filledCount++;
      } else {
        if (setNativeValue(el, matchedVal)) filledCount++;
      }
    } else {
      // If we don't have direct heuristic data -> queue for Step 2 (Gemini AI Inference)
      if (!isElementAlreadyFilled(el) && labelText) {
        unfilledForAi.push({ el, labelText, tag });
      }
    }
  }

  // Step 2: For any remaining unfilled/unknown/unique fields, pass to Gemini AI to deduce
  for (const item of unfilledForAi) {
    const { el, labelText, tag } = item;
    if (isElementAlreadyFilled(el)) continue;

    let dropdownOptions = [];
    if (tag === 'select') {
      dropdownOptions = Array.from(el.options || [])
        .map(o => (o.text || o.value || '').trim())
        .filter(t => t && !/^(-|--|select|choose|none|default|please|no\s*selection|--select--|- select -|\+?\s*select)/i.test(t));
    }

    const placeholder = el.placeholder || '';
    const type = el.type || 'text';
    const section = el.closest('fieldset, section, .form-section, .accordion-body, .panel-body, form')?.querySelector('legend, h1, h2, h3, h4, .section-title')?.innerText || '';

    try {
      highlightElementThinking(el);
      const aiValue = await sendInferFieldAiRequest({
        label: labelText,
        tag,
        type,
        options: dropdownOptions,
        sectionContext: section,
        placeholder
      });

      if (aiValue && aiValue.trim()) {
        let filled = false;
        if (tag === 'select' || el.getAttribute('role') === 'combobox' || el.getAttribute('role') === 'listbox') {
          filled = fillCustomComboboxOrSelect(el, aiValue);
        } else if (type === 'radio') {
          filled = fillNativeRadioGroup(el, aiValue);
        } else if (type === 'checkbox') {
          const isAffirmative = /yes|true|1|agree|citizen|confirm/i.test(aiValue);
          filled = setNativeCheckboxOrRadio(el, isAffirmative);
        } else {
          filled = setNativeValue(el, aiValue);
        }

        if (filled) {
          filledCount++;
          aiCount++;
        }
      }
    } catch (err) {
      console.warn(`[AutoApply Pro] Gemini AI inference failed for field "${labelText}":`, err);
    }
  }

  return { filledCount, aiCount, platform: detectCurrentPlatform() };
}

// 11. Visual Field Inspector Diagnostic Scanner
function inspectFormFields(profile) {
  const elements = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea, [contenteditable="true"]'
  );

  const inspected = [];

  for (const el of elements) {
    const labelText = getElementLabel(el);
    let matchedPattern = null;
    let matchedVal = null;

    for (const pattern of FIELD_PATTERNS) {
      if (pattern.regex.test(labelText)) {
        if (pattern.exclude && pattern.exclude.test(labelText)) continue;
        try {
          matchedVal = pattern.getValue(profile, el);
          matchedPattern = pattern;
          break;
        } catch (e) {}
      }
    }

    const isAI = (el.tagName.toLowerCase() === 'textarea' || el.isContentEditable) && isOpenEndedQuestion(labelText);

    inspected.push({
      element: el,
      labelText: labelText.slice(0, 50),
      key: matchedPattern ? matchedPattern.key : (isAI ? "ai.customEssay" : "unmatched"),
      value: matchedVal || (isAI ? "✨ Gemini AI Generated Essay" : ""),
      isMatched: Boolean(matchedPattern || isAI),
      isAI: isAI
    });
  }

  return inspected;
}

// 12. Helper: Extract Candidate Skills List
function extractCandidateSkills(profile) {
  const skills = new Set();
  
  if (profile) {
    if (Array.isArray(profile.skills)) {
      profile.skills.forEach(s => typeof s === 'string' && skills.add(s.toLowerCase()));
    } else if (profile.skills && typeof profile.skills === 'object') {
      Object.values(profile.skills).forEach(val => {
        if (Array.isArray(val)) {
          val.forEach(s => typeof s === 'string' && skills.add(s.toLowerCase()));
        } else if (typeof val === 'string') {
          skills.add(val.toLowerCase());
        }
      });
    }

    if (profile.skillYears && typeof profile.skillYears === 'object') {
      Object.keys(profile.skillYears).forEach(k => skills.add(k.toLowerCase()));
    }
  }

  [
    'react', 'react.js', 'node', 'node.js', 'express', 'express.js', 
    'javascript', 'js', 'es6', 'java', 'dsa', 'mongodb', 'supabase', 
    'html', 'html5', 'css', 'css3', 'tailwind', 'tailwind css', 
    'next.js', 'rest', 'rest api', 'git', 'full stack', 'web development',
    'python', 'yes', 'agree', 'i agree', 'certify', 'confirm', 'accept'
  ].forEach(s => skills.add(s));

  return Array.from(skills);
}

// 13. Communication with Background Worker for AI Essay Generation
function sendAiRequest(question) {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: "GENERATE_AI_ANSWER",
        payload: { question, jobContext: document.title }
      }, (res) => {
        if (chrome.runtime.lastError || !res || !res.success) {
          if (typeof generateAnswerWithGemini === 'function') {
            const p = window.DEFAULT_PROFILE || {};
            generateAnswerWithGemini({ question, jobContext: document.title }, p).then(resolve).catch(reject);
          } else {
            reject(new Error(res?.error || chrome.runtime.lastError?.message || "Failed to generate AI response."));
          }
        } else {
          resolve(res.answer);
        }
      });
    } else if (typeof generateAnswerWithGemini === 'function') {
      const p = window.DEFAULT_PROFILE || {};
      generateAnswerWithGemini({ question, jobContext: document.title }, p).then(resolve).catch(reject);
    } else {
      reject(new Error("Gemini AI client not available."));
    }
  });
}

// 14. Communication with Background Worker for AI Field Inference (Unknown/Unique Fields)
function sendInferFieldAiRequest({ label, tag = "input", type = "text", options = [], sectionContext = "", placeholder = "" }) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: "INFER_FIELD_AI",
        payload: { label, tag, type, options, sectionContext, placeholder }
      }, (res) => {
        if (chrome.runtime.lastError || !res || !res.success) {
          if (typeof inferFieldWithGemini === 'function') {
            const p = window.DEFAULT_PROFILE || {};
            inferFieldWithGemini({ label, tag, type, options, sectionContext, placeholder }, p).then(resolve).catch(() => resolve(""));
          } else {
            resolve("");
          }
        } else {
          resolve(res.answer || "");
        }
      });
    } else if (typeof inferFieldWithGemini === 'function') {
      const p = window.DEFAULT_PROFILE || {};
      inferFieldWithGemini({ label, tag, type, options, sectionContext, placeholder }, p).then(resolve).catch(() => resolve(""));
    } else {
      resolve("");
    }
  });
}

// 15. Master Dispatcher (Step-by-Step AutoApply Runner)
async function runAutoApply(profile, options = { aiAnswers: false }) {
  const platform = detectCurrentPlatform();
  console.log(`[AutoApply Pro] Running on detected platform: ${platform}`);

  // Auto-expand all collapsed sections & accordions upfront
  expandAllCollapsedSections();

  let result;
  if (platform === 'Google Forms') {
    result = await fillGoogleForms(profile, options);
  } else if (platform === 'TCS / Infosys Enterprise') {
    result = await fillTcsInfosysEnterprise(profile, options);
  } else if (platform === 'LinkedIn Easy Apply') {
    result = await fillLinkedInEasyApply(profile, options);
  } else {
    result = await fillGenericForm(profile, options);
  }

  // Automatically attach DanishKhan_Resume.pdf if file input or dropzone is present
  if (typeof autoUploadResume === 'function') {
    try {
      const resumeRes = await autoUploadResume();
      if (resumeRes && resumeRes.uploaded) {
        result.resumeUploaded = true;
        result.resumeFilename = resumeRes.filename;
        console.log(`[AutoApply Pro] Attached resume: ${resumeRes.filename}`);
      } else if (resumeRes && resumeRes.openedDialog) {
        result.openedResumeDialog = true;
        console.log(`[AutoApply Pro] Opened Google Forms resume file upload dialog.`);
      }
    } catch (e) {
      console.warn('[AutoApply Pro] Auto-upload resume failed:', e);
    }
  }

  return result;
}

// 16. Field Suggestion Engine for On-Demand Interactive Popup
function getFieldSuggestions(element, customLabel = '', profile = {}) {
  const p = profile && Object.keys(profile).length > 0 ? profile : (typeof window !== 'undefined' ? window.DEFAULT_PROFILE : {});
  const label = (customLabel || (element ? getElementLabel(element) : '') || '').trim();
  const lLower = label.toLowerCase();
  const tag = element ? element.tagName.toLowerCase() : 'input';
  const type = element ? (element.type || 'text').toLowerCase() : 'text';

  const _isOpenEndedFn = (typeof isOpenEndedQuestion === 'function') ? isOpenEndedQuestion : _heuristics.isOpenEndedQuestion;
  const isResume = /resume|cv\b|curriculum|biodata|upload.*file|file.*upload|add.*file/i.test(lLower) || type === 'file';
  const isOpenEnded = typeof _isOpenEndedFn === 'function' ? _isOpenEndedFn(label) : false;

  const suggestions = [];

  // 1. Personal Identity
  if (/full[_\s-]?name|candidate[_\s-]?name|^name$|your[_\s-]?name/i.test(lLower) && !/first|last|middle|father|mother|college|company/i.test(lLower)) {
    suggestions.push({ label: "Full Name", value: p.personal?.fullName || "Mohammad Danish Khan Naeem Khan" });
    suggestions.push({ label: "Certificate Name", value: p.personal?.certificateName || "Mohammad Danish Khan" });
    suggestions.push({ label: "Short Name", value: p.personal?.shortName || "Danish Khan" });
  } else if (/first[_\s-]?name|given[_\s-]?name|fname/i.test(lLower)) {
    suggestions.push({ label: "First Name", value: p.personal?.firstName || "Mohammad Danish" });
    suggestions.push({ label: "Full Name", value: p.personal?.fullName || "Mohammad Danish Khan Naeem Khan" });
  } else if (/last[_\s-]?name|surname|family[_\s-]?name|lname/i.test(lLower)) {
    suggestions.push({ label: "Last Name", value: p.personal?.lastName || "Khan" });
    suggestions.push({ label: "Father Name as Surname", value: p.personal?.fatherName || "Naeem Khan" });
  } else if (/e?mail/i.test(lLower)) {
    suggestions.push({ label: "Primary Email", value: p.personal?.email || "danishkhan.jsx@gmail.com" });
    suggestions.push({ label: "College Email", value: p.personal?.altEmail || "danish.khan@ghrcem.raisoni.net" });
  } else if (/phone|mobile|contact[_\s-]?no|cell/i.test(lLower)) {
    suggestions.push({ label: "Phone (Plain)", value: p.personal?.phonePlain || "9172928551" });
    suggestions.push({ label: "Phone (+91)", value: p.personal?.phone || "+91 91729 28551" });
    suggestions.push({ label: "Country Code", value: p.personal?.phoneCountryCode || "+91" });
  } else if (/dob|birth/i.test(lLower)) {
    suggestions.push({ label: "DOB (DD/MM/YYYY)", value: p.personal?.dobFormatted || "01/06/2005" });
    suggestions.push({ label: "DOB (YYYY-MM-DD)", value: p.personal?.dob || "2005-06-01" });
  } else if (/gender|sex/i.test(lLower)) {
    suggestions.push({ label: "Gender", value: p.personal?.gender || "Male" });
  }

  // 2. Screening & Work Authorization
  else if (/ppo|pre[_\s-]?placement|post.*internship/i.test(lLower)) {
    suggestions.push({ label: "Interested in PPO", value: "Yes" });
    suggestions.push({ label: "Alternative", value: "No" });
  } else if (/stipend|program[_\s-]?structure|program[_\s-]?details|gone.*through/i.test(lLower)) {
    suggestions.push({ label: "Acknowledge Details", value: "Yes" });
  } else if (/how many months|months? of (work )?experience|month(s)?.*experience|experience in months/i.test(lLower)) {
    suggestions.push({ label: "Internship Experience (Months)", value: "10" });
    suggestions.push({ label: "Experience Range", value: "6-12 months" });
    suggestions.push({ label: "Total Career Experience", value: "21" });
    suggestions.push({ label: "Alternative", value: "0-6 months" });
  } else if (/relocat/i.test(lLower)) {
    suggestions.push({ label: "Willing to Relocate", value: "Yes" });
    suggestions.push({ label: "Preferred Location", value: "Pune / Bengaluru / Mumbai" });
  } else if (/shifts?|travel/i.test(lLower)) {
    suggestions.push({ label: "Rotational Shifts / Travel", value: "Yes" });
  } else if (/work.*auth|authorized.*work|legal.*work/i.test(lLower)) {
    suggestions.push({ label: "Work Authorized in India", value: "Yes" });
  } else if (/sponsorship/i.test(lLower)) {
    suggestions.push({ label: "Require Sponsorship in India", value: "No" });
    suggestions.push({ label: "Require Sponsorship in US", value: "Yes" });
  } else if (/backlog|arrear/i.test(lLower)) {
    suggestions.push({ label: "Active Backlogs", value: "No" });
    suggestions.push({ label: "Count", value: "0" });
  }

  // 3. Academics
  else if (/degree|qualification|course/i.test(lLower)) {
    suggestions.push({ label: "Degree", value: p.academics?.graduation?.degree || "B.Tech" });
    suggestions.push({ label: "BE/B.Tech", value: "BE/B.Tech" });
    suggestions.push({ label: "Branch", value: p.academics?.graduation?.branch || "Artificial Intelligence" });
    suggestions.push({ label: "Course Full", value: p.academics?.graduation?.courseName || "B.Tech in Artificial Intelligence" });
  } else if (/cgpa|gpa|marks|grade/i.test(lLower)) {
    suggestions.push({ label: "Graduation CGPA", value: p.academics?.graduation?.cgpa || "7.79" });
    suggestions.push({ label: "Percentage", value: p.academics?.graduation?.percentage || "77.9%" });
    suggestions.push({ label: "12th Percentage", value: p.academics?.hsc_12th?.percentage || "76.33%" });
    suggestions.push({ label: "10th Percentage", value: p.academics?.ssc_10th?.percentage || "83.60%" });
  } else if (/year.*grad|grad.*year|passing.*year|batch/i.test(lLower)) {
    suggestions.push({ label: "Graduation Year", value: p.academics?.graduation?.passingYear || "2026" });
  } else if (/college|institute|university/i.test(lLower)) {
    suggestions.push({ label: "College Name", value: p.academics?.graduation?.college || "G H Raisoni College of Engineering and Management" });
    suggestions.push({ label: "University", value: p.academics?.graduation?.university || "KBC North Maharashtra University" });
  }

  // 4. Address & Socials
  else if (/city/i.test(lLower)) {
    suggestions.push({ label: "Current City", value: p.address?.city || "Bhusawal" });
    suggestions.push({ label: "Preferred City", value: "Pune" });
  } else if (/state|province/i.test(lLower)) {
    suggestions.push({ label: "State", value: p.address?.state || "Maharashtra" });
  } else if (/country/i.test(lLower)) {
    suggestions.push({ label: "Country", value: p.address?.country || "India" });
  } else if (/pin|postal|zip/i.test(lLower)) {
    suggestions.push({ label: "Pincode", value: p.address?.pincode || "425201" });
  } else if (/linkedin/i.test(lLower)) {
    suggestions.push({ label: "LinkedIn URL", value: p.socials?.linkedin || "https://linkedin.com/in/danishkhan-tech" });
  } else if (/github/i.test(lLower)) {
    suggestions.push({ label: "GitHub URL", value: p.socials?.github || "https://github.com/DanishKhan0" });
  } else if (/portfolio|website/i.test(lLower)) {
    suggestions.push({ label: "Portfolio URL", value: p.socials?.portfolio || "https://danishkhan.tech" });
  }

  // Fallback to general heuristics if still empty
  const _fieldPatterns = (typeof FIELD_PATTERNS !== 'undefined') ? FIELD_PATTERNS : (_heuristics.FIELD_PATTERNS || []);
  if (suggestions.length === 0 && _fieldPatterns.length > 0) {
    for (const pattern of _fieldPatterns) {
      if (pattern.regex.test(label)) {
        if (pattern.exclude && pattern.exclude.test(label)) continue;
        const val = pattern.getValue(p, element);
        if (val) {
          suggestions.push({ label: pattern.key.split('.').pop(), value: val.toString() });
          break;
        }
      }
    }
  }

  // Fallback to matchValueFromProfile engine
  if (suggestions.length === 0 && typeof matchValueFromProfile === 'function' && element) {
    const matched = matchValueFromProfile(element, p);
    if (matched) {
      suggestions.push({ label: "Profile Match", value: matched.toString() });
    }
  }

  // Fallback to Boolean Question resolver
  const _resolveBoolFn = (typeof resolveBooleanQuestion === 'function') ? resolveBooleanQuestion : _heuristics.resolveBooleanQuestion;
  if (suggestions.length === 0 && typeof _resolveBoolFn === 'function' && (/\?|whether|confirm|agree|declare|are you|do you|will you|have you/i.test(label) || (element && (element.type === 'radio' || element.type === 'checkbox')))) {
    const boolAns = _resolveBoolFn(label);
    suggestions.push({ label: "Screening Match", value: boolAns });
    suggestions.push({ label: "Alternative", value: boolAns === "Yes" ? "No" : "Yes" });
  }

  return {
    label,
    primary: suggestions[0] || null,
    alternatives: suggestions.slice(1),
    isOpenEnded,
    isResume
  };
}

// 17. Selective Section / Marquee Elements Autofiller
async function fillSelectedElements(elements, profile, options = { aiAnswers: true }) {
  if (!elements || !Array.isArray(elements) || elements.length === 0) {
    return { filledCount: 0, aiCount: 0, selectedCount: 0 };
  }

  const p = profile && Object.keys(profile).length > 0 ? profile : (typeof window !== 'undefined' ? window.DEFAULT_PROFILE : {});
  let filledCount = 0;
  let aiCount = 0;
  const processedContainers = new Set();

  for (const el of elements) {
    if (!el || !el.isConnected) continue;

    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    const type = (el.type || 'text').toLowerCase();
    const item = el.closest('div[role="listitem"], .Qr7Oae, .geS5n, .gf-listitem, .form-group, .form-row') || el.parentElement;
    const labelText = (typeof getElementLabel === 'function') ? getElementLabel(el) : '';
    const _isOpenEndedFn = (typeof isOpenEndedQuestion === 'function') ? isOpenEndedQuestion : (typeof _heuristics !== 'undefined' ? _heuristics.isOpenEndedQuestion : null);
    const isOpenEnded = (typeof _isOpenEndedFn === 'function') ? _isOpenEndedFn(labelText) : false;

    // A. Open-ended question AI generation
    if (options.aiAnswers && (tag === 'textarea' || el.isContentEditable || isOpenEnded)) {
      try {
        if (typeof highlightElementThinking === 'function') highlightElementThinking(el);
        let answer = '';
        if (typeof sendAiRequest === 'function') {
          answer = await sendAiRequest(labelText || document.title);
        } else if (typeof generateAnswerWithGemini === 'function') {
          answer = await generateAnswerWithGemini({ question: labelText, jobContext: document.title }, p);
        }
        if (answer && setNativeValue(el, answer)) {
          aiCount++;
          filledCount++;
          if (item && typeof clearGoogleFormItemError === 'function') clearGoogleFormItemError(item);
          continue;
        }
      } catch (err) {
        console.warn("[AutoApply Pro] Selected field AI generation error:", err);
      }
    }

    // B. Resume / Document input
    if (type === 'file' || /resume|cv\b/i.test(labelText) || el.classList.contains('gf-hidden-file-input')) {
      if (typeof autoUploadResume === 'function') {
        try {
          const res = await autoUploadResume();
          if (res && res.uploaded) filledCount++;
        } catch (e) {}
      }
      continue;
    }

    // C. Heuristic Profile Match
    let matchedVal = null;
    if (typeof getFieldSuggestions === 'function') {
      const suggestions = getFieldSuggestions(el, labelText, p);
      if (suggestions && suggestions.primary && suggestions.primary.value) {
        matchedVal = suggestions.primary.value;
      }
    }

    if (matchedVal === null && typeof matchValueFromProfile === 'function') {
      matchedVal = matchValueFromProfile(el, p);
    }

    if (matchedVal !== null && matchedVal !== undefined) {
      let isFilled = false;

      // 1. Google Forms or Custom Dropdown Listbox / Native Select
      if (tag === 'select' || el.getAttribute('role') === 'combobox' || el.getAttribute('role') === 'listbox' || el.classList.contains('quantumWizMenuPaperselectEl') || el.classList.contains('gf-custom-select') || el.hasAttribute('aria-haspopup')) {
        if (typeof fillGoogleFormsDropdown === 'function' && (el.getAttribute('role') === 'listbox' || el.classList.contains('quantumWizMenuPaperselectEl') || el.classList.contains('gf-custom-select') || el.hasAttribute('aria-haspopup'))) {
          const res = await fillGoogleFormsDropdown(el, matchedVal, labelText);
          if (res && (res.success || res === true)) isFilled = true;
        }
        if (!isFilled && typeof fillCustomComboboxOrSelect === 'function') {
          if (fillCustomComboboxOrSelect(el, matchedVal)) isFilled = true;
        }
        if (!isFilled && tag === 'select') {
          el.value = matchedVal;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          isFilled = true;
        }
      }
      // 2. Custom ARIA or Native Radio Button
      else if (type === 'radio' || el.getAttribute('role') === 'radio') {
        const radioContainer = el.closest('[role="radiogroup"], .gf-radio-group, .form-group, [role="listitem"]') || item || document.body;
        if (!processedContainers.has(radioContainer)) {
          processedContainers.add(radioContainer);
          const valStr = matchedVal.toString().trim().toLowerCase();
          const allRadios = Array.from(radioContainer.querySelectorAll('[role="radio"], input[type="radio"]'));
          let targetRadio = allRadios.find(r => {
            const text = (r.getAttribute('aria-label') || r.innerText || r.textContent || r.value || '').trim().toLowerCase();
            return text === valStr || text.includes(valStr) || valStr.includes(text);
          });

          if (!targetRadio && /male/i.test(valStr)) {
            targetRadio = allRadios.find(r => /\bmale\b|\bman\b/i.test(r.getAttribute('aria-label') || r.innerText || r.textContent || r.value || ''));
          }

          if (targetRadio) {
            if (targetRadio.tagName.toLowerCase() === 'input') {
              targetRadio.checked = true;
              targetRadio.dispatchEvent(new Event('input', { bubbles: true }));
              targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
              targetRadio.click();
              targetRadio.setAttribute('aria-checked', 'true');
              allRadios.forEach(r => { if (r !== targetRadio) r.setAttribute('aria-checked', 'false'); });
            }
            isFilled = true;
            if (typeof highlightFilledElement === 'function') highlightFilledElement(targetRadio);
          }
        }
      }
      // 3. Custom ARIA or Native Checkbox
      else if (type === 'checkbox' || el.getAttribute('role') === 'checkbox') {
        const isAffirmative = /yes|true|1|agree|citizen|confirm/i.test(matchedVal.toString());
        if (typeof setNativeCheckboxOrRadio === 'function') {
          if (setNativeCheckboxOrRadio(el, isAffirmative)) isFilled = true;
        }
      }
      // 4. Standard Text / Date / Number / Email / Tel Input
      else {
        if (typeof setNativeValue === 'function') {
          if (setNativeValue(el, matchedVal)) isFilled = true;
        }
      }

      if (isFilled) {
        filledCount++;
        if (item && typeof clearGoogleFormItemError === 'function') {
          clearGoogleFormItemError(item);
        }
        if (typeof highlightFilledElement === 'function') {
          highlightFilledElement(el);
        }
      }
    }
  }

  return { filledCount, aiCount, selectedCount: elements.length };
}

if (typeof window !== 'undefined') {
  window.runAutoApply = runAutoApply;
  window.detectCurrentPlatform = detectCurrentPlatform;
  window.setNativeValue = setNativeValue;
  window.setNativeCheckboxOrRadio = setNativeCheckboxOrRadio;
  window.fillCustomComboboxOrSelect = fillCustomComboboxOrSelect;
  window.isElementAlreadyFilled = isElementAlreadyFilled;
  window.getElementLabel = getElementLabel;
  window.matchValueFromProfile = matchValueFromProfile;
  window.inspectFormFields = inspectFormFields;
  window.sendAiRequest = sendAiRequest;
  window.sendInferFieldAiRequest = sendInferFieldAiRequest;
  window.expandAllCollapsedSections = expandAllCollapsedSections;
  window.clearGoogleFormItemError = clearGoogleFormItemError;
  window.fillGoogleFormsDropdown = fillGoogleFormsDropdown;
  window.getFieldSuggestions = getFieldSuggestions;
  window.fillSelectedElements = fillSelectedElements;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setNativeValue,
    setNativeCheckboxOrRadio,
    fillNativeRadioGroup,
    highlightFilledElement,
    highlightElementThinking,
    detectCurrentPlatform,
    expandAllCollapsedSections,
    clearGoogleFormItemError,
    isElementAlreadyFilled,
    getElementLabel,
    matchValueFromProfile,
    fillCustomComboboxOrSelect,
    fillGoogleForms,
    fillGoogleFormsDropdown,
    fillTcsInfosysEnterprise,
    fillLinkedInEasyApply,
    fillGenericForm,
    inspectFormFields,
    extractCandidateSkills,
    sendAiRequest,
    sendInferFieldAiRequest,
    runAutoApply,
    getFieldSuggestions,
    fillSelectedElements
  };
}
