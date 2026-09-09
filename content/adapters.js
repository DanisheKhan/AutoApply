/**
 * Platform Adapters & Universal DOM Dispatcher for AutoApply Pro
 * Provides enterprise-grade form filling for Google Forms, TCS/Infosys Enterprise,
 * LinkedIn Easy Apply, Workday, Greenhouse, Lever, Ashby, and Modern React/Vue/Angular ATS.
 */

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
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();

  if (host.includes('docs.google.com') && path.includes('/forms/')) {
    return 'Google Forms';
  }
  if (host.includes('tcs') || host.includes('ion') || host.includes('nextstep') || host.includes('infosys') || host.includes('wipro') || host.includes('capgemini')) {
    return 'TCS / Infosys Enterprise';
  }
  if (host.includes('linkedin.com') && document.querySelector('.jobs-easy-apply-modal, [data-test-modal]')) {
    return 'LinkedIn Easy Apply';
  }
  if (host.includes('naukri.com') || host.includes('foundit.in') || host.includes('hirist.com')) {
    return 'Naukri / Indian Job Board';
  }
  if (host.includes('boards.greenhouse.io') || document.querySelector('#job_application, #application_form')) {
    return 'Greenhouse';
  }
  if (host.includes('jobs.lever.co') || document.querySelector('.application-form, form#apply')) {
    return 'Lever';
  }
  if (host.includes('myworkdayjobs.com') || host.includes('workday.com') || document.querySelector('[data-automation-id]')) {
    return 'Workday';
  }
  if (host.includes('ashbyhq.com') || host.includes('smartrecruiters.com') || host.includes('wellfound.com') || host.includes('unstop.com') || host.includes('internshala.com')) {
    return 'Modern Tech ATS';
  }

  // Inside test harness simulator
  if (document.getElementById('google-form-mock') && document.getElementById('tab-google')?.classList.contains('active')) {
    return 'Google Forms';
  }
  if (document.getElementById('enterprise-form-mock') && document.getElementById('tab-enterprise')?.classList.contains('active')) {
    return 'TCS / Infosys Enterprise';
  }
  if (document.getElementById('modern-ats-mock') && document.getElementById('tab-modern')?.classList.contains('active')) {
    return 'Modern Tech ATS';
  }

  return 'Generic Form';
}

// 4. Helper: Extract meaningful descriptive label for an element
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

// 5. Match value from profile using Heuristics
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

  return null;
}

// 6. Universal Custom Dropdown / Combobox Resolver
function fillCustomComboboxOrSelect(selectOrCombobox, targetValue) {
  if (!selectOrCombobox || !targetValue) return false;
  const valStr = targetValue.toString().trim().toLowerCase();

  // Case A: Native HTML <select>
  if (selectOrCombobox.tagName.toLowerCase() === 'select') {
    const options = Array.from(selectOrCombobox.options);
    let matchedOpt = options.find(o => o.text.trim().toLowerCase() === valStr || o.value.trim().toLowerCase() === valStr);
    
    if (!matchedOpt) {
      matchedOpt = options.find(o => o.text.toLowerCase().includes(valStr) || o.value.toLowerCase().includes(valStr) || valStr.includes(o.text.toLowerCase()));
    }
    if (!matchedOpt) {
      const tokens = valStr.split(/[\s/,-]+/).filter(t => t.length > 2);
      matchedOpt = options.find(o => tokens.some(tok => o.text.toLowerCase().includes(tok)));
    }
    if (!matchedOpt && /yes|authorized|male/i.test(valStr)) {
      matchedOpt = options.find(o => /yes|agree|male|authorized/i.test(o.text));
    }

    if (matchedOpt) {
      selectOrCombobox.value = matchedOpt.value;
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
    Array.from(document.querySelectorAll('.exportSelectPopup div[role="option"], .quantumWizMenuPaperselectPopup div[role="option"]'))
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
    targetOpt.click();
    targetOpt.setAttribute('aria-selected', 'true');
    targetOpt.classList.add('selected');

    const displayLabel = listbox.querySelector('.gf-select-text, .quantumWizMenuPaperselectContent, .vRMGwf') || listbox;
    if (displayLabel) {
      displayLabel.textContent = targetOpt.innerText.trim() || targetOpt.getAttribute('data-value');
    }
    listbox.setAttribute('aria-expanded', 'false');
    highlightFilledElement(listbox);
    return true;
  }

  return false;
}

// 7. Google Forms Adapter
async function fillGoogleForms(profile, options = { aiAnswers: false }) {
  let filledCount = 0;
  let aiCount = 0;

  const listItems = document.querySelectorAll('div[role="listitem"]');

  for (const item of listItems) {
    const headerEl = item.querySelector('.M7eMe, [role="heading"], .dir-ltr');
    const questionText = headerEl ? headerEl.innerText.trim() : '';
    if (!questionText) continue;

    // 1. Text & Number inputs
    const input = item.querySelector('input.whsOnd, input[type="text"], input[type="email"], input[type="tel"], input[type="date"], input[type="number"], input[type="url"], input[type="password"]');
    if (input && !input.value) {
      let matchedVal = null;
      for (const pattern of FIELD_PATTERNS) {
        if (pattern.regex.test(questionText)) {
          if (pattern.exclude && pattern.exclude.test(questionText)) continue;
          matchedVal = pattern.getValue(profile, input);
          if (matchedVal) break;
        }
      }

      if (matchedVal) {
        if (setNativeValue(input, matchedVal)) filledCount++;
      }
    }

    // 2. Textareas (AI answers or Heuristic)
    const textarea = item.querySelector('textarea.KHxj8b, textarea');
    if (textarea && !textarea.value) {
      if (options.aiAnswers && (isOpenEndedQuestion(questionText) || textarea.rows > 2)) {
        try {
          highlightElementThinking(textarea);
          const aiResponse = await sendAiRequest(questionText);
          if (aiResponse && setNativeValue(textarea, aiResponse)) {
            aiCount++;
          }
        } catch (e) {
          console.error("AI Answering error on Google Forms item:", e);
          textarea.style.outline = '';
          textarea.style.boxShadow = '';
        }
      } else {
        let matchedVal = null;
        for (const pattern of FIELD_PATTERNS) {
          if (pattern.regex.test(questionText)) {
            matchedVal = pattern.getValue(profile, textarea);
            if (matchedVal) break;
          }
        }
        if (matchedVal && setNativeValue(textarea, matchedVal)) filledCount++;
      }
    }

    // 3. Dropdowns & Listboxes
    const selectEl = item.querySelector('select');
    const listboxEl = item.querySelector('div[role="listbox"], .quantumWizMenuPaperselectEl, .gf-custom-select, div[aria-haspopup="listbox"]');

    if (selectEl || listboxEl) {
      let matchedVal = null;
      for (const pattern of FIELD_PATTERNS) {
        if (pattern.regex.test(questionText)) {
          matchedVal = pattern.getValue(profile, selectEl || listboxEl);
          if (matchedVal) break;
        }
      }

      // Domain intelligent fallbacks for dropdowns
      if (!matchedVal) {
        if (/qualification|degree|education|course/i.test(questionText)) {
          matchedVal = profile.academics?.graduation?.degree || "B.Tech";
        } else if (/state|region|province/i.test(questionText)) {
          matchedVal = profile.address?.state || "Maharashtra";
        } else if (/country|citizenship/i.test(questionText)) {
          matchedVal = profile.address?.country || "India";
        } else if (/gender|sex/i.test(questionText)) {
          matchedVal = profile.personal?.gender || "Male";
        } else if (/notice|join/i.test(questionText)) {
          matchedVal = "Immediate";
        } else if (/category|quota/i.test(questionText)) {
          matchedVal = "General";
        }
      }

      if (matchedVal && fillCustomComboboxOrSelect(selectEl || listboxEl, matchedVal)) {
        filledCount++;
      }
    }

    // 4. Radio Buttons
    const radios = item.querySelectorAll('div[role="radio"], input[type="radio"]');
    if (radios.length > 0) {
      let targetValue = null;
      for (const pattern of FIELD_PATTERNS) {
        if (pattern.regex.test(questionText)) {
          targetValue = pattern.getValue(profile, item);
          if (targetValue) break;
        }
      }

      if (!targetValue) {
        targetValue = resolveBooleanQuestion(questionText);
      }

      for (const radio of radios) {
        const radioLabel = (radio.getAttribute('aria-label') || radio.getAttribute('data-value') || radio.innerText || '').trim().toLowerCase();
        const tLower = targetValue.toString().toLowerCase();

        let isMatch = radioLabel.includes(tLower) || tLower.includes(radioLabel);
        if (tLower === 'yes' && /\b(yes|authorized|eligible|true|agree)\b/i.test(radioLabel)) isMatch = true;
        if (tLower === 'no' && /\b(no|not|false|none|zero|0)\b/i.test(radioLabel)) isMatch = true;
        if (tLower === 'male' && /\b(male|man)\b/i.test(radioLabel)) isMatch = true;

        if (isMatch) {
          const group = radio.closest('.gf-radio-group') || item;
          group.querySelectorAll('div[role="radio"]').forEach(r => {
            r.classList.remove('selected');
            r.setAttribute('aria-checked', 'false');
          });

          if (radio.tagName.toLowerCase() === 'input') {
            setNativeCheckboxOrRadio(radio, true);
          } else {
            radio.click();
            radio.classList.add('selected');
            radio.setAttribute('aria-checked', 'true');
            highlightFilledElement(radio);
          }
          filledCount++;
          break;
        }
      }
    }

    // 5. Checkboxes
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
            cb.click();
            cb.classList.add('selected');
            cb.setAttribute('aria-checked', 'true');
            highlightFilledElement(cb);
          }
          filledCount++;
        }
      }
    }
  }

  return { filledCount, aiCount, platform: 'Google Forms' };
}

// 8. TCS / Infosys Enterprise Adapter
async function fillTcsInfosysEnterprise(profile, options = { aiAnswers: false }) {
  let filledCount = 0;
  let aiCount = 0;

  // Process all inputs in enterprise tables and form fields
  const elements = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea');

  for (const el of elements) {
    if (el.value && el.value.trim().length > 0 && el.type !== 'radio' && el.type !== 'checkbox') continue;

    const labelText = getElementLabel(el);
    const tag = el.tagName.toLowerCase();

    // AI question detection
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
      } else if (el.type === 'checkbox' || el.type === 'radio') {
        const isAffirmative = /yes|true|1|male|agree/i.test(matchedVal.toString());
        if (setNativeCheckboxOrRadio(el, isAffirmative)) filledCount++;
      } else {
        if (setNativeValue(el, matchedVal)) filledCount++;
      }
    }
  }

  return { filledCount, aiCount, platform: 'TCS / Infosys Enterprise' };
}

// 9. LinkedIn Easy Apply Adapter
async function fillLinkedInEasyApply(profile, options = { aiAnswers: false }) {
  let filledCount = 0;
  let aiCount = 0;

  const modal = document.querySelector('.jobs-easy-apply-modal, [data-test-modal], .jobs-easy-apply-content') || document;
  const inputs = modal.querySelectorAll('input:not([type="hidden"]), select, textarea');

  for (const el of inputs) {
    const label = getElementLabel(el);

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
    if (val && !el.value) {
      if (el.tagName.toLowerCase() === 'select') {
        if (fillCustomComboboxOrSelect(el, val)) filledCount++;
      } else if (el.type === 'radio' || el.type === 'checkbox') {
        const isAffirmative = /yes|true|1|male|agree/i.test(val.toString());
        if (setNativeCheckboxOrRadio(el, isAffirmative)) filledCount++;
      } else {
        if (setNativeValue(el, val)) filledCount++;
      }
      continue;
    }

    // AI custom answers for textareas
    if (options.aiAnswers && el.tagName.toLowerCase() === 'textarea' && !el.value) {
      highlightElementThinking(el);
      const answer = await sendAiRequest(label);
      if (answer && setNativeValue(el, answer)) aiCount++;
    }
  }

  return { filledCount, aiCount, platform: 'LinkedIn Easy Apply' };
}

// 10. Universal Generic Form Filler (Workday, Greenhouse, Lever, Ashby, ATS)
async function fillGenericForm(profile, options = { aiAnswers: false }) {
  let filledCount = 0;
  let aiCount = 0;

  const elements = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea, [contenteditable="true"], div[role="combobox"], div[role="listbox"]'
  );

  for (const el of elements) {
    if (el.value && el.value.trim().length > 0 && el.type !== 'radio' && el.type !== 'checkbox') continue;

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
      } else if (el.type === 'checkbox' || el.type === 'radio') {
        const isAffirmative = /yes|true|1|male|agree/i.test(matchedVal.toString());
        if (setNativeCheckboxOrRadio(el, isAffirmative)) filledCount++;
      } else {
        if (setNativeValue(el, matchedVal)) filledCount++;
      }
    }
  }

  return { filledCount, aiCount, platform: detectCurrentPlatform() };
}

// 11. Visual Field Inspector Diagnostic Scanner
function inspectFormFields(profile) {
  const elements = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea, [contenteditable="true"]'
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

// 13. Communication with Background Worker for AI Generation
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

// 14. Master Dispatcher
async function runAutoApply(profile, options = { aiAnswers: false }) {
  const platform = detectCurrentPlatform();
  console.log(`[AutoApply Pro] Running on detected platform: ${platform}`);

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
      }
    } catch (e) {
      console.warn('[AutoApply Pro] Auto-upload resume failed:', e);
    }
  }

  return result;
}

if (typeof window !== 'undefined') {
  window.runAutoApply = runAutoApply;
  window.detectCurrentPlatform = detectCurrentPlatform;
  window.setNativeValue = setNativeValue;
  window.setNativeCheckboxOrRadio = setNativeCheckboxOrRadio;
  window.fillCustomComboboxOrSelect = fillCustomComboboxOrSelect;
  window.getElementLabel = getElementLabel;
  window.matchValueFromProfile = matchValueFromProfile;
  window.inspectFormFields = inspectFormFields;
  window.sendAiRequest = sendAiRequest;
}
