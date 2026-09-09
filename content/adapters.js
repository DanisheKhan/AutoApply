/**
 * Platform Adapters & DOM Dispatcher for AutoApply Pro
 * Provides specialized support for Google Forms, TCS/Infosys, LinkedIn Easy Apply, Naukri, and Modern ATS.
 */

// 1. Synthetic React/Vue Event Dispatcher
function setNativeValue(element, value) {
  if (!element || value === undefined || value === null) return false;

  const tag = element.tagName.toLowerCase();
  const prototype = tag === 'input' 
    ? window.HTMLInputElement.prototype 
    : tag === 'textarea' 
      ? window.HTMLTextAreaElement.prototype 
      : window.HTMLSelectElement.prototype;

  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

  element.focus();

  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }

  // Dispatch all standard events for React, Angular, Vue, and vanilla DOM listeners
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));

  // Visual feedback: Subtle emerald pulse
  highlightFilledElement(element);
  return true;
}

function highlightFilledElement(element) {
  const originalTransition = element.style.transition;
  const originalOutline = element.style.outline;
  const originalBoxShadow = element.style.boxShadow;

  element.style.transition = 'all 0.25s ease';
  element.style.outline = '2px solid #a8c7fa';
  element.style.boxShadow = '0 0 10px rgba(168, 199, 250, 0.4)';

  setTimeout(() => {
    element.style.outline = originalOutline;
    element.style.boxShadow = originalBoxShadow;
    element.style.transition = originalTransition;
  }, 1200);
}

// 2. Identify Current Platform
function detectCurrentPlatform() {
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();

  if (host.includes('docs.google.com') && path.includes('/forms/')) {
    return 'Google Forms';
  }
  if (host.includes('tcs') || host.includes('ion') || host.includes('nextstep') || host.includes('infosys')) {
    return 'TCS / Infosys Enterprise';
  }
  if (host.includes('linkedin.com') && document.querySelector('.jobs-easy-apply-modal, [data-test-modal]')) {
    return 'LinkedIn Easy Apply';
  }
  if (host.includes('naukri.com')) {
    return 'Naukri';
  }
  if (host.includes('boards.greenhouse.io') || document.querySelector('#job_application, #application_form')) {
    return 'Greenhouse';
  }
  if (host.includes('jobs.lever.co') || document.querySelector('.application-form, form#apply')) {
    return 'Lever';
  }
  if (host.includes('ashbyhq.com') || host.includes('myworkdayjobs.com')) {
    return 'Modern ATS';
  }

  // Check if inside our test simulator
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

// 3. Helper: Extract meaningful descriptive label for an element
function getElementLabel(element) {
  let labels = [];

  // Associated <label> tag
  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label && label.innerText) labels.push(label.innerText.trim());
  }

  // Parent label
  const parentLabel = element.closest('label');
  if (parentLabel && parentLabel.innerText) {
    labels.push(parentLabel.innerText.replace(element.value || '', '').trim());
  }

  // Aria labels & placeholders
  if (element.getAttribute('aria-label')) labels.push(element.getAttribute('aria-label'));
  if (element.getAttribute('aria-labelledby')) {
    const labelledBy = document.getElementById(element.getAttribute('aria-labelledby'));
    if (labelledBy && labelledBy.innerText) labels.push(labelledBy.innerText.trim());
  }
  if (element.placeholder) labels.push(element.placeholder);
  if (element.name) labels.push(element.name);
  if (element.id) labels.push(element.id);

  // Preceding sibling text
  const prevSibling = element.previousElementSibling;
  if (prevSibling && prevSibling.innerText && prevSibling.innerText.length < 100) {
    labels.push(prevSibling.innerText.trim());
  }

  // Table cell context (for TCS / enterprise tables)
  const cell = element.closest('td');
  if (cell) {
    const row = cell.closest('tr');
    if (row) {
      const firstCol = row.querySelector('td:first-child, th:first-child');
      if (firstCol && firstCol.innerText) labels.push(firstCol.innerText.trim());
    }
  }

  return labels.join(' ');
}

// 4. Match value from profile using Heuristics
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
        // Skip on missing sub-fields
      }
    }
  }

  // Direct fallback for HTML password inputs
  if (element && element.type === 'password') {
    return profile.credentials?.defaultPassword || profile.personal?.password || "Danishe@1257";
  }

  return null;
}

// 5. Google Forms Adapter
async function fillGoogleForms(profile, options = { aiAnswers: false }) {
  let filledCount = 0;
  let aiCount = 0;

  const listItems = document.querySelectorAll('div[role="listitem"]');

  for (const item of listItems) {
    const headerEl = item.querySelector('.M7eMe, [role="heading"], .dir-ltr');
    const questionText = headerEl ? headerEl.innerText.trim() : '';
    if (!questionText) continue;

    // 1. Text & Number inputs (.whsOnd, standard text/email/tel/date/number)
    const input = item.querySelector('input.whsOnd, input[type="text"], input[type="email"], input[type="tel"], input[type="date"], input[type="number"], input[type="url"]');
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

    // 2. Textareas (.KHxj8b) - AI candidate or standard
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
          console.error("AI Answering error on Google Form item:", e);
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

    // 3. Dropdown Menus & Listboxes (div[role="listbox"], select, .quantumWizMenuPaperselectEl, .gf-custom-select)
    const selectEl = item.querySelector('select');
    const listboxEl = item.querySelector('div[role="listbox"], .quantumWizMenuPaperselectEl, .gf-custom-select, div[aria-haspopup="listbox"]');

    if (selectEl) {
      let matchedVal = null;
      for (const pattern of FIELD_PATTERNS) {
        if (pattern.regex.test(questionText)) {
          matchedVal = pattern.getValue(profile, selectEl);
          if (matchedVal) break;
        }
      }
      if (matchedVal) {
        const opt = Array.from(selectEl.options).find(o => 
          o.text.toLowerCase().includes(matchedVal.toString().toLowerCase()) ||
          o.value.toLowerCase().includes(matchedVal.toString().toLowerCase())
        );
        if (opt) {
          selectEl.value = opt.value;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          highlightFilledElement(selectEl);
          filledCount++;
        }
      }
    } else if (listboxEl) {
      let matchedVal = null;
      for (const pattern of FIELD_PATTERNS) {
        if (pattern.regex.test(questionText)) {
          matchedVal = pattern.getValue(profile, listboxEl);
          if (matchedVal) break;
        }
      }

      // Domain fallbacks for Google Forms dropdowns
      if (!matchedVal) {
        if (/qualification|degree|education|course|study/i.test(questionText)) {
          matchedVal = profile.academics?.graduation?.degree || "B.Tech";
        } else if (/state|region|province/i.test(questionText)) {
          matchedVal = profile.address?.state || "Maharashtra";
        } else if (/country|citizenship/i.test(questionText)) {
          matchedVal = profile.address?.country || "India";
        } else if (/gender|sex/i.test(questionText)) {
          matchedVal = profile.personal?.gender || "Male";
        } else if (/notice|join/i.test(questionText)) {
          matchedVal = "Immediate";
        } else if (/category|quota|registration\s*type/i.test(questionText)) {
          matchedVal = "General";
        }
      }

      if (matchedVal) {
        const valStr = matchedVal.toString().toLowerCase();
        // Collect candidate option elements inside container, dropdown menu, or document popup
        const optionsList = Array.from(
          item.querySelectorAll('div[role="option"], .quantumWizMenuPaperselectOption, .gf-dropdown-option, [data-value]')
        ).concat(
          Array.from(document.querySelectorAll('.exportSelectPopup div[role="option"], .quantumWizMenuPaperselectPopup div[role="option"]'))
        );

        let targetOpt = optionsList.find(opt => {
          const text = (opt.getAttribute('data-value') || opt.innerText || '').toLowerCase();
          return text.includes(valStr) || valStr.includes(text);
        });

        if (!targetOpt) {
          const words = valStr.split(/[\s/,-]+/).filter(w => w.length > 1);
          targetOpt = optionsList.find(opt => {
            const text = (opt.getAttribute('data-value') || opt.innerText || '').toLowerCase();
            return words.some(w => text.includes(w));
          });
        }

        if (targetOpt) {
          targetOpt.click();
          targetOpt.setAttribute('aria-selected', 'true');
          targetOpt.classList.add('selected');

          // Update display text in listbox trigger element
          const displayLabel = listboxEl.querySelector('.gf-select-text, .quantumWizMenuPaperselectContent, .vRMGwf') || listboxEl;
          if (displayLabel) {
            displayLabel.textContent = targetOpt.innerText.trim() || targetOpt.getAttribute('data-value');
          }
          listboxEl.setAttribute('aria-expanded', 'false');
          highlightFilledElement(listboxEl);
          filledCount++;
        }
      }
    }

    // 4. Radio buttons (div[role="radio"])
    const radios = item.querySelectorAll('div[role="radio"]');
    if (radios.length > 0) {
      let targetValue = null;
      for (const pattern of FIELD_PATTERNS) {
        if (pattern.regex.test(questionText)) {
          targetValue = pattern.getValue(profile, item);
          if (targetValue) break;
        }
      }

      let questionCategory = '';
      if (/\b(gender|sex)\b/i.test(questionText)) {
        questionCategory = 'gender';
        targetValue = profile.personal?.gender || 'Male';
      } else if (/\b(work[_\s-]?auth|authorized[_\s-]?to[_\s-]?work|legal.*work|work[_\s-]?permit)\b/i.test(questionText)) {
        questionCategory = 'workAuth';
        targetValue = 'Yes';
      } else if (/\b(backlogs?|arrears?|live[_\s-]?backlogs?|active[_\s-]?backlogs?)\b/i.test(questionText)) {
        questionCategory = 'backlogs';
        targetValue = 'No';
      } else if (/\b(sponsorship|require.*visa|visa[_\s-]?sponsorship)\b/i.test(questionText)) {
        questionCategory = 'sponsorship';
        targetValue = 'No';
      } else if (/\b(relocate|relocation|willing.*relocate)\b/i.test(questionText)) {
        questionCategory = 'relocate';
        targetValue = 'Yes';
      } else if (/\b(full[_\s-]?time|job[_\s-]?type|employment[_\s-]?type)\b/i.test(questionText)) {
        targetValue = 'Full-time';
      }

      for (const radio of radios) {
        const radioLabel = (radio.getAttribute('aria-label') || radio.innerText || '').trim();
        const rLower = radioLabel.toLowerCase();
        let isMatch = false;

        if (questionCategory === 'gender') {
          isMatch = rLower.includes((profile.personal?.gender || 'male').toLowerCase());
        } else if (questionCategory === 'workAuth') {
          isMatch = /\b(yes|authorized|eligible|true)\b/i.test(rLower) || rLower.startsWith('yes');
        } else if (questionCategory === 'backlogs') {
          isMatch = /\b(no|zero|0|nil|none)\b/i.test(rLower) || rLower.includes('zero') || rLower.startsWith('no');
        } else if (questionCategory === 'sponsorship') {
          isMatch = /\b(no|not|false)\b/i.test(rLower) || rLower.startsWith('no');
        } else if (questionCategory === 'relocate') {
          isMatch = /\b(yes|willing|open|true)\b/i.test(rLower) || rLower.startsWith('yes');
        } else if (targetValue) {
          const tLower = targetValue.toString().toLowerCase();
          isMatch = rLower.includes(tLower) || tLower.includes(rLower);
        }

        if (isMatch) {
          const group = radio.closest('.gf-radio-group') || item;
          group.querySelectorAll('div[role="radio"]').forEach(r => {
            r.classList.remove('selected');
            r.setAttribute('aria-checked', 'false');
          });

          radio.click();
          radio.classList.add('selected');
          radio.setAttribute('aria-checked', 'true');
          highlightFilledElement(radio);
          filledCount++;
          break;
        }
      }
    }

    // 5. Checkboxes (div[role="checkbox"])
    const checkboxes = item.querySelectorAll('div[role="checkbox"]');
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
          cb.click();
          cb.classList.add('selected');
          cb.setAttribute('aria-checked', 'true');
          highlightFilledElement(cb);
          filledCount++;
        }
      }
    }
  }

  return { filledCount, aiCount, platform: 'Google Forms' };
}

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

  // Core defaults & keywords
  [
    'react', 'react.js', 'node', 'node.js', 'express', 'express.js', 
    'javascript', 'js', 'es6', 'java', 'dsa', 'mongodb', 'supabase', 
    'html', 'html5', 'css', 'css3', 'tailwind', 'tailwind css', 
    'next.js', 'rest', 'rest api', 'git', 'full stack', 'web development',
    'python', 'yes', 'agree', 'i agree', 'certify', 'confirm', 'accept'
  ].forEach(s => skills.add(s));

  return Array.from(skills);
}

// 6. LinkedIn Easy Apply Adapter
async function fillLinkedInEasyApply(profile, options = { aiAnswers: false }) {
  let filledCount = 0;
  let aiCount = 0;

  const modal = document.querySelector('.jobs-easy-apply-modal, [data-test-modal], .jobs-easy-apply-content');
  if (!modal) return fillGenericForm(profile, options);

  const inputs = modal.querySelectorAll('input, select, textarea');

  for (const el of inputs) {
    const label = getElementLabel(el);

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

    const val = matchValueFromProfile(el, profile);
    if (val && !el.value) {
      if (setNativeValue(el, val)) filledCount++;
      continue;
    }

    if (options.aiAnswers && el.tagName.toLowerCase() === 'textarea' && !el.value) {
      highlightElementThinking(el);
      const answer = await sendAiRequest(label);
      if (answer && setNativeValue(el, answer)) aiCount++;
    }
  }

  return { filledCount, aiCount, platform: 'LinkedIn Easy Apply' };
}

// 7. Generic & Modern ATS / Enterprise Adapter
async function fillGenericForm(profile, options = { aiAnswers: false }) {
  let filledCount = 0;
  let aiCount = 0;

  const elements = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"]), select, textarea');

  for (const el of elements) {
    if (el.value && el.value.trim().length > 0) continue;

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
        console.error("AI Generation failed for element:", e);
        el.style.outline = '';
        el.style.boxShadow = '';
      }
    }

    // Standard heuristic match
    const matchedVal = matchValueFromProfile(el, profile);
    if (matchedVal !== null) {
      if (tag === 'select') {
        const matched = Array.from(el.options).find(opt => 
          opt.text.toLowerCase().includes(matchedVal.toString().toLowerCase()) ||
          opt.value.toLowerCase().includes(matchedVal.toString().toLowerCase())
        );
        if (matched) {
          el.value = matched.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          highlightFilledElement(el);
          filledCount++;
        }
      } else if (el.type === 'checkbox' || el.type === 'radio') {
        if (/yes|true|1/i.test(matchedVal.toString())) {
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          highlightFilledElement(el);
          filledCount++;
        }
      } else {
        if (setNativeValue(el, matchedVal)) {
          filledCount++;
        }
      }
    }
  }

  return { filledCount, aiCount, platform: detectCurrentPlatform() };
}

// 8. Communication with Background Service Worker or Direct Fallback
function sendAiRequest(question) {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: "GENERATE_AI_ANSWER",
        payload: { question, jobContext: document.title }
      }, (res) => {
        if (chrome.runtime.lastError || !res || !res.success) {
          // Attempt direct fallback if available
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

function highlightElementThinking(element) {
  element.style.transition = 'all 0.3s ease';
  element.style.outline = '2px solid #F59E0B';
  element.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.4)';
}

// Master Dispatcher
async function runAutoApply(profile, options = { aiAnswers: false }) {
  const platform = detectCurrentPlatform();
  console.log(`[AutoApply Pro] Running on detected platform: ${platform}`);

  let result;
  if (platform === 'Google Forms') {
    result = await fillGoogleForms(profile, options);
  } else if (platform === 'LinkedIn Easy Apply') {
    result = await fillLinkedInEasyApply(profile, options);
  } else {
    result = await fillGenericForm(profile, options);
  }

  // Automatically attach DanishKhan_Resume.pdf if a file input or resume dropzone is present
  if (typeof autoUploadResume === 'function') {
    try {
      const resumeRes = await autoUploadResume();
      if (resumeRes && resumeRes.uploaded) {
        result.resumeUploaded = true;
        result.resumeFilename = resumeRes.filename;
        console.log(`[AutoApply Pro] Successfully attached resume: ${resumeRes.filename}`);
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
  window.sendAiRequest = sendAiRequest;
}
