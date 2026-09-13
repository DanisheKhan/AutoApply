/**
 * AutoApply Pro - Minimal In-Field Action Button & Options Menu
 * Injected into a Closed Shadow DOM for 100% CSS isolation.
 * Features:
 *  1. Non-intrusive split button [ ⚡ Insert | ⋮ ] anchored right beside/inside the field.
 *  2. 1-click Insert directly applies the primary value and clears errors.
 *  3. Clicking [ ⋮ ] (three dots) opens a clean dropdown menu with alternative values,
 *     AI generation, resume attachment, and 1-click full page autofill.
 *  4. Continuous requestAnimationFrame tracking for zero-drift positioning on scroll.
 */

(function () {
  'use strict';

  let activeProfile = null;
  let popupHost = null;
  let popupShadow = null;
  let btnGroup = null;
  let insertBtn = null;
  let menuEl = null;

  let currentAnchor = null;
  let currentTargetValue = null;
  let currentLabel = '';
  let currentSuggestions = null;
  let currentFingerprint = null; // Full DOM fingerprint built by buildFieldFingerprint()
  let currentMode = 'insert'; // 'insert' | 'ai' | 'resume'
  let isButtonVisible = false;
  let isMenuVisible = false;
  let animFrameId = null;
  let isWidgetEnabled = true;
  let activationMode = 'always'; // 'smart' (Job Forms Only) | 'always' | 'disabled'

  const ICONS = {
    bolt: `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    sparkle: `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/></svg>`,
    dots: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`,
    check: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    file: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    dot: `<svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>`,
    scissors: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
    spinner: `<svg class="aap-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>`
  };

  /**
   * Sets the activation mode: 'smart' | 'always' | 'disabled'
   */
  function setActivationMode(mode) {
    activationMode = mode || 'smart';
    if (activationMode === 'disabled') {
      setWidgetEnabled(false);
    } else {
      setWidgetEnabled(true);
    }
  }

  /**
   * Sets whether the floating in-field button is enabled.
   * When disabled, immediately hides active buttons and stops tracking.
   */
  function setWidgetEnabled(enabled) {
    isWidgetEnabled = Boolean(enabled);
    if (!isWidgetEnabled) {
      hideAll();
      if (popupHost) {
        popupHost.style.display = 'none';
      }
    } else {
      if (popupHost) {
        popupHost.style.display = '';
      }
    }
  }

  /**
   * Initializes the in-field button and menu subsystem.
   * @param {Object} profile - The loaded candidate profile
   */
  function initFieldPopup(profile) {
    if (profile) {
      activeProfile = profile;
    } else if (typeof DEFAULT_PROFILE !== 'undefined') {
      activeProfile = DEFAULT_PROFILE;
    } else if (typeof window !== 'undefined' && window.DEFAULT_PROFILE) {
      activeProfile = window.DEFAULT_PROFILE;
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['floatingWidgetEnabled', 'popupActivationMode'], (data) => {
        if (data && data.popupActivationMode) {
          setActivationMode(data.popupActivationMode);
        } else if (data && data.floatingWidgetEnabled !== undefined) {
          setWidgetEnabled(data.floatingWidgetEnabled !== false);
        }
      });
    }

    if (!popupHost) {
      createButtonDom();
      bindGlobalEvents();
    }
  }

  /**
   * Creates the Closed Shadow DOM host, split button, and options dropdown menu.
   */
  function createButtonDom() {
    if (document.getElementById('autoapply-field-popup-root')) return;

    popupHost = document.createElement('div');
    popupHost.id = 'autoapply-field-popup-root';
    popupHost.style.position = 'fixed';
    popupHost.style.top = '0';
    popupHost.style.left = '0';
    popupHost.style.width = '0';
    popupHost.style.height = '0';
    popupHost.style.border = 'none';
    popupHost.style.padding = '0';
    popupHost.style.margin = '0';
    popupHost.style.zIndex = '2147483647';
    popupHost.style.pointerEvents = 'none';
    if (!isWidgetEnabled) {
      popupHost.style.display = 'none';
    }
    document.documentElement.appendChild(popupHost);

    popupShadow = popupHost.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600&family=JetBrains+Mono:wght@400;500&display=swap');

      :host {
        all: initial;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 2147483647;
        position: fixed;
        top: 0;
        left: 0;
        pointer-events: none;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      /* Unified Rounded Minimal Pill Button */
      .aap-btn-group {
        position: fixed;
        display: none;
        align-items: center;
        height: 24px;
        background: #18181b;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 9999px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
        z-index: 2147483647;
        pointer-events: auto !important;
        user-select: none;
        overflow: hidden;
        will-change: transform, left, top;
        transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        animation: aap-fade-in 0.12s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .aap-btn-group.visible {
        display: inline-flex !important;
      }

      .aap-btn-group:hover {
        background: #27272a;
        border-color: rgba(255, 255, 255, 0.28);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
      }

      /* Inner Action Button */
      .aap-insert-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        height: 100%;
        padding: 0 10px;
        background: transparent;
        color: #f4f4f5;
        border: none;
        border-radius: 9999px;
        font-family: inherit;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.1px;
        cursor: pointer;
        outline: none;
        white-space: nowrap;
        transition: color 0.12s ease;
      }

      .aap-insert-btn:hover {
        color: #ffffff;
      }

      .aap-insert-btn:active {
        opacity: 0.85;
      }

      .aap-insert-btn .aap-icon {
        color: #d4d4d8;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      /* Success Feedback - Clean & Minimal without glow */
      .aap-btn-group.success {
        border-color: rgba(74, 222, 128, 0.5) !important;
      }
      .aap-btn-group.success .aap-insert-btn,
      .aap-btn-group.success .aap-icon {
        color: #4ade80 !important;
      }

      /* Dropdown Menu Overlay - Minimal Dark */
      .aap-menu {
        position: fixed;
        display: none;
        flex-direction: column;
        min-width: 200px;
        max-width: 300px;
        background: #18181b;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
        padding: 4px;
        z-index: 2147483647;
        pointer-events: auto !important;
        user-select: none;
        will-change: transform, left, top;
        animation: aap-fade-in 0.12s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .aap-menu.visible {
        display: flex !important;
      }

      .aap-menu-header {
        font-size: 9.5px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #71717a;
        padding: 5px 8px 3px;
      }

      .aap-menu-divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.08);
        margin: 3px 0;
      }

      .aap-menu-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 8px;
        border-radius: 5px;
        font-size: 11.5px;
        color: #e4e4e7;
        cursor: pointer;
        transition: background-color 0.1s ease, color 0.1s ease;
      }

      .aap-menu-item:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
      }

      .aap-menu-item:active {
        background: rgba(255, 255, 255, 0.12);
      }

      .aap-menu-item-left {
        display: flex;
        align-items: center;
        gap: 7px;
        overflow: hidden;
      }

      .aap-menu-item .aap-icon {
        color: #a1a1aa;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .aap-menu-val {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #f4f4f5;
      }

      .aap-menu-tag {
        font-size: 9.5px;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        color: #a1a1aa;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 1px 5px;
        border-radius: 4px;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .aap-menu-action {
        color: #e4e4e7;
        font-weight: 500;
      }

      @keyframes aap-fade-in {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }

      @keyframes aap-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .aap-spin {
        animation: aap-spin 0.8s linear infinite;
      }
    `;

    popupShadow.appendChild(style);

    // Build Minimal Rounded Pill Button
    btnGroup = document.createElement('div');
    btnGroup.className = 'aap-btn-group';

    insertBtn = document.createElement('button');
    insertBtn.type = 'button';
    insertBtn.className = 'aap-insert-btn';
    insertBtn.innerHTML = `<span class="aap-icon">${ICONS.bolt}</span><span class="aap-btn-label">Insert</span>`;

    btnGroup.appendChild(insertBtn);
    popupShadow.appendChild(btnGroup);

    // Build Dropdown Menu
    menuEl = document.createElement('div');
    menuEl.className = 'aap-menu';
    popupShadow.appendChild(menuEl);

    // Prevent button or menu interaction from blurring the anchor field
    btnGroup.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    menuEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    insertBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    // Left Click or Mouse Release: Execute primary action
    let isExecutingInsert = false;
    const executeInsertAction = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (isExecutingInsert) return;
      isExecutingInsert = true;
      setTimeout(() => { isExecutingInsert = false; }, 350);
      handleInsertClick(e);
    };

    insertBtn.addEventListener('click', executeInsertAction);
    insertBtn.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        executeInsertAction(e);
      }
    });

    // Right Click: Toggle Options Menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isMenuVisible) {
        hideMenu();
      } else {
        renderAndShowMenu();
      }
    };

    btnGroup.addEventListener('contextmenu', handleContextMenu);
    insertBtn.addEventListener('contextmenu', handleContextMenu);
  }

  /**
   * Continuous requestAnimationFrame tracker to lock button coordinates to anchor.
   */
  function startTracking() {
    stopTracking();
    function step() {
      if (isButtonVisible && currentAnchor) {
        updatePosition();
        animFrameId = requestAnimationFrame(step);
      }
    }
    animFrameId = requestAnimationFrame(step);
  }

  function stopTracking() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  /**
   * Binds global events for focus, click, escape, typing, and scrolling.
   */
  function bindGlobalEvents() {
    document.addEventListener('focusin', handleTriggerEvent, true);
    document.addEventListener('click', handleTriggerEvent, true);
    document.addEventListener('mousedown', handleTriggerEvent, true); // catches masked/wrapped inputs that absorb focus events

    // Dismiss ONLY when the user manually types into the field (real keyboard keystroke)
    // Avoid programmatic events dispatched during insertion from triggering dismissal!
    document.addEventListener('input', (e) => {
      if (isApplyingValue) return;
      if (e.isTrusted && isButtonVisible && e.target === currentAnchor) {
        hideAll();
      }
    }, true);

    // Dismiss on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (isMenuVisible) {
          hideMenu();
        } else if (isButtonVisible) {
          hideAll();
        }
      }
    }, true);

    // Dismiss on click outside
    document.addEventListener('mousedown', (e) => {
      if (!isButtonVisible && !isMenuVisible) return;

      const path = e.composedPath ? e.composedPath() : [];
      const isInsidePopup = (popupHost && (e.target === popupHost || popupHost.contains(e.target))) ||
                            path.includes(popupHost) ||
                            path.some(el => el && (el.id === 'autoapply-field-popup-root' || el === btnGroup || el === menuEl));

      if (isInsidePopup) {
        return; // User clicked inside the split button or dropdown menu
      }

      const isInsideAnchor = currentAnchor && (currentAnchor === e.target || currentAnchor.contains(e.target) || path.includes(currentAnchor));
      if (isInsideAnchor) {
        // User clicked back on the field: close menu if open, keep button visible
        if (isMenuVisible) {
          hideMenu();
        }
        return;
      }

      // Clicked outside both field and popup
      hideAll();
    }, true);

    window.addEventListener('scroll', updatePosition, { passive: true, capture: true });
    window.addEventListener('resize', updatePosition, { passive: true });

    // Listen for storage changes across tabs
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
          if (changes.popupActivationMode !== undefined) {
            setActivationMode(changes.popupActivationMode.newValue);
          }
          if (changes.floatingWidgetEnabled !== undefined) {
            setWidgetEnabled(changes.floatingWidgetEnabled.newValue !== false);
          }
        }
      });
    }

    // Direct message listener from popup or background
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request && request.action === 'SET_WIDGET_VISIBILITY') {
          setWidgetEnabled(request.enabled);
        } else if (request && request.action === 'SET_ACTIVATION_MODE') {
          setActivationMode(request.mode);
        }
      });
    }
  }

  /**
   * Evaluates event target to check if it's an actionable form field.
   */
  function handleTriggerEvent(e) {
    if (!isWidgetEnabled || activationMode === 'disabled') return;

    const target = e.target;
    if (!target) return;

    if (target.id === 'autoapply-pro-root' || target.closest('#autoapply-pro-root')) return;
    if (target.id === 'autoapply-field-popup-root' || target.closest('#autoapply-field-popup-root')) return;

    const path = e.composedPath ? e.composedPath() : [];
    if (path.includes(popupHost) || path.some(el => el && el.id === 'autoapply-field-popup-root')) return;

    const field = resolveInteractiveField(target);
    if (!field) return;

    if (isButtonVisible && currentAnchor === field) return;

    showFieldPopupForElement(field);
  }

  /**
   * Identifies the primary interactive form element from a click/focus target.
   */
  function resolveInteractiveField(target) {
    if (!target || target === document.body || target === document.documentElement) return null;

    const tag = target.tagName ? target.tagName.toLowerCase() : '';

    if (tag === 'input') {
      const type = (target.type || 'text').toLowerCase();
      if (['submit', 'button', 'reset', 'hidden', 'image'].includes(type)) return null;
      return target;
    }

    if (tag === 'textarea' || tag === 'select') {
      return target;
    }

    // Google Forms or custom dropdown listbox
    const customListbox = target.closest('div[role="listbox"], .quantumWizMenuPaperselectEl, .gf-custom-select, [aria-haspopup="listbox"]');
    if (customListbox && !customListbox.classList.contains('OA0dhb')) {
      return customListbox;
    }

    // Google Forms radio button
    const radioBtn = target.closest('div[role="radio"]');
    if (radioBtn) return radioBtn;

    // Google Forms question container: find inner field
    const gfItem = target.closest('div[role="listitem"], .Qr7Oae, .geS5n, .gf-listitem, .form-group, .field');
    if (gfItem) {
      const innerInput = gfItem.querySelector('input.whsOnd, textarea.KHxj8b, textarea.khxj8b, textarea, input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, div[role="listbox"]:not(.OA0dhb), .ry3kXd, .quantumWizMenuPaperselectEl, [aria-haspopup="listbox"], div[role="radio"], div[role="button"][aria-label*="Add file" i]');
      if (innerInput) return innerInput;
    }

    // ── GENERIC FALLBACK (handles icon-wrapped inputs, masked inputs, custom form libraries) ──
    // Stage 1: Check if the clicked element itself CONTAINS an input (e.g. icon wrapper div)
    if (typeof target.querySelector === 'function') {
      const innerInput = target.querySelector(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), textarea, select'
      );
      if (innerInput && !innerInput.disabled && !innerInput.readOnly) return innerInput;
    }

    // Stage 2: Walk up the DOM tree (max 3 levels) looking for an input in DIRECT children only.
    // Intentionally shallow — avoids picking the wrong input when a big form container is hit.
    const INPUT_QUERY = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), textarea, select';
    let el = target.parentElement;
    for (let depth = 0; depth < 3 && el && el !== document.body; depth++, el = el.parentElement) {
      const elTag = (el.tagName || '').toLowerCase();
      // Stop at any container that spans multiple fields
      if (['form', 'table', 'section', 'article', 'main', 'header', 'footer', 'nav', 'ul', 'ol'].includes(elTag)) break;
      // Only look for inputs that are DIRECT children of el, not deep descendants
      const directChild = Array.from(el.children || []).find(child => {
        const ct = (child.tagName || '').toLowerCase();
        if (ct === 'input') {
          const ctype = (child.type || 'text').toLowerCase();
          return !['submit','button','reset','hidden','image'].includes(ctype) && !child.disabled;
        }
        return (ct === 'textarea' || ct === 'select') && !child.disabled;
      });
      if (directChild) return directChild;
    }

    // Stage 3: If document.activeElement is an input (focused by JS), use that
    try {
      const active = document.activeElement;
      if (active && active !== document.body && active !== document.documentElement) {
        const activeTag = (active.tagName || '').toLowerCase();
        if (activeTag === 'input') {
          const activeType = (active.type || 'text').toLowerCase();
          if (!['submit', 'button', 'reset', 'hidden', 'image'].includes(activeType) && !active.disabled) {
            return active;
          }
        }
        if (activeTag === 'textarea' || activeTag === 'select') return active;
        if (active.isContentEditable || active.getAttribute?.('contenteditable') === 'true') return active;
      }
    } catch (e) {}

    return null;
  }

  /**
   * Displays the split button anchored cleanly beside/inside the field.
   */
  function showFieldPopupForElement(element) {
    if (!isWidgetEnabled || !element) return;

    const profile = activeProfile || (typeof window !== 'undefined' ? window.DEFAULT_PROFILE : {}) || {};
    const suggestions = (typeof getFieldSuggestions === 'function')
      ? getFieldSuggestions(element, '', profile)
      : { label: '', primary: null, alternatives: [], isOpenEnded: false, isResume: false };

    currentAnchor = element;
    currentSuggestions = suggestions;
    currentLabel = suggestions.label || '';
    currentTargetValue = suggestions.primary ? suggestions.primary.value : null;

    // Build and cache the full field fingerprint for use at Insert click time
    currentFingerprint = (typeof buildFieldFingerprint === 'function')
      ? buildFieldFingerprint(element)
      : null;

    const tag = element.tagName ? element.tagName.toLowerCase() : '';
    const isTextarea = tag === 'textarea';

    // 1. Open-Ended AI Mode (ONLY if field is genuinely an open-ended essay question AND has no direct candidate value)
    if (suggestions.isOpenEnded && (!currentTargetValue || isTextarea)) {
      currentMode = 'ai';
      btnGroup.className = 'aap-btn-group visible';
      insertBtn.innerHTML = `<span class="aap-icon">${ICONS.sparkle}</span><span class="aap-btn-label">Insert AI</span>`;
      insertBtn.title = `Insert AI (Right-click for options)`;
    }
    // 2. Resume Mode
    else if (suggestions.isResume || element.type === 'file') {
      currentMode = 'resume';
      btnGroup.className = 'aap-btn-group visible';
      insertBtn.innerHTML = `<span class="aap-icon">${ICONS.file}</span><span class="aap-btn-label">Attach Resume</span>`;
      insertBtn.title = `Attach Resume (Right-click for options)`;
    }
    // 3. Standard Field Value Insert Mode
    else if (currentTargetValue !== null && currentTargetValue !== undefined && currentTargetValue !== '') {
      currentMode = 'insert';
      btnGroup.className = 'aap-btn-group visible';
      insertBtn.innerHTML = `<span class="aap-icon">${ICONS.bolt}</span><span class="aap-btn-label">Insert</span>`;
      insertBtn.title = `Insert: ${currentTargetValue} (Right-click for options)`;
    }
    // 4. Smart fallback: avoid forcing AI mode unless truly an essay question
    else {
      const fallbackVal = (typeof matchValueFromProfile === 'function') ? matchValueFromProfile(element, profile) : null;
      if (fallbackVal !== null && fallbackVal !== undefined && fallbackVal !== '') {
        currentTargetValue = fallbackVal;
        currentMode = 'insert';
        btnGroup.className = 'aap-btn-group visible';
        insertBtn.innerHTML = `<span class="aap-icon">${ICONS.bolt}</span><span class="aap-btn-label">Insert</span>`;
        insertBtn.title = `Insert: ${currentTargetValue} (Right-click for options)`;
      } else if (suggestions.isOpenEnded) {
        currentMode = 'ai';
        btnGroup.className = 'aap-btn-group visible';
        insertBtn.innerHTML = `<span class="aap-icon">${ICONS.sparkle}</span><span class="aap-btn-label">Insert AI</span>`;
        insertBtn.title = `Insert AI (Right-click for options)`;
      } else {
        currentMode = 'insert';
        btnGroup.className = 'aap-btn-group visible';
        insertBtn.innerHTML = `<span class="aap-icon">${ICONS.bolt}</span><span class="aap-btn-label">Insert</span>`;
        insertBtn.title = `Insert (Right-click for options)`;
      }
    }

    // Close any previous menu
    hideMenu();

    btnGroup.classList.add('visible');
    btnGroup.style.display = 'inline-flex';
    isButtonVisible = true;
    updatePosition();
    startTracking();
  }

  /**
   * 1-Click Primary Insert Handler (Zero-Failure Execution)
   */
  async function handleInsertClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    hideMenu();

    if (!currentAnchor || !currentAnchor.isConnected) {
      if (document.activeElement && document.activeElement !== document.body) {
        currentAnchor = resolveInteractiveField(document.activeElement);
      }
    }
    if (!currentAnchor) return;

    // A. AI Mode
    if (currentMode === 'ai') {
      await triggerAiGenerationForField(currentAnchor, currentLabel);
      return;
    }

    // B. Resume Mode
    if (currentMode === 'resume') {
      insertBtn.innerHTML = `<span class="aap-icon aap-spin">${ICONS.spinner}</span><span class="aap-btn-label">Attaching...</span>`;
      try {
        if (typeof autoUploadResume === 'function') {
          await autoUploadResume();
        }
        showSuccessFeedback("Attached");
      } catch (err) {
        console.warn("[AutoApply Pro] Resume attach failed:", err);
        insertBtn.innerHTML = `<span class="aap-btn-label">Retry</span>`;
        setTimeout(() => {
          resetButtonToCurrentMode();
        }, 1500);
      }
      return;
    }

    // C. Standard Insert Mode: If currentTargetValue is missing, run smart lookup → Gemini
    let valToApply = currentTargetValue;
    const profile = activeProfile || (typeof window !== 'undefined' ? window.DEFAULT_PROFILE : {}) || {};

    // Step 1: Try suggestions & profile lookup (0ms, no API)
    if (!valToApply) {
      const suggestions = (typeof getFieldSuggestions === 'function')
        ? getFieldSuggestions(currentAnchor, '', profile)
        : null;
      if (suggestions?.primary?.value) {
        valToApply = suggestions.primary.value;
      }
    }

    // Step 2: Try combined-signal profile match with full fingerprint (0ms, no API)
    if (!valToApply && typeof matchValueFromProfile === 'function') {
      valToApply = matchValueFromProfile(currentAnchor, profile, currentFingerprint || undefined);
    }

    // Step 2b: Fallback directly by inspecting anchor placeholder / label text / attributes
    if (!valToApply && currentAnchor) {
      const ph = (currentAnchor.placeholder || currentAnchor.getAttribute?.('placeholder') || '').trim();
      const lbl = (typeof getElementLabel === 'function' ? getElementLabel(currentAnchor) : ph).trim();
      const combined = `${lbl} ${ph} ${currentAnchor.name || ''} ${currentAnchor.id || ''}`.toLowerCase();
      if (/skills?|tech.*stack|technolog/i.test(combined) && !/years?|months?|exp/i.test(combined)) {
        valToApply = profile.skillsSummary || "React.js, Node.js, Express.js, MongoDB, JavaScript, TypeScript, Tailwind CSS, Supabase, Next.js, Java DSA, REST APIs, Git, SQL";
      } else if (/education|qualif/i.test(combined) && !/10th|12th|school|college|degree/i.test(combined)) {
        valToApply = profile.educationSummary || "B.Tech in Artificial Intelligence (CGPA: 7.79, 2022-2026, G H Raisoni College of Engineering and Management)";
      } else if (/experience.*year|years.*exp/i.test(combined)) {
        valToApply = profile.career?.totalExperienceYears || "1";
      }
    }

    if (valToApply) {
      // Found from profile/heuristics — apply immediately
      currentTargetValue = valToApply;
      applyValueToField(currentAnchor, valToApply, currentLabel);
      showSuccessFeedback('Inserted');
      return;
    }

    // Step 3: Nothing found locally → call Gemini with the full fingerprint
    // Show spinner while Gemini works
    insertBtn.innerHTML = `<span class="aap-icon aap-spin">${ICONS.spinner}</span><span class="aap-btn-label">Thinking...</span>`;
    btnGroup.className = 'aap-btn-group visible';

    try {
      let geminiVal = '';
      const fp = currentFingerprint || {};

      if (typeof sendInferFieldAiRequest === 'function') {
        geminiVal = await sendInferFieldAiRequest({
          label: fp.label || currentLabel || '',
          tag: fp.tag || 'input',
          type: fp.fieldType || 'text',
          options: fp.options || [],
          sectionContext: fp.sectionHeading || '',
          placeholder: fp.placeholder || '',
          fieldName: fp.fieldName || '',
          fieldId: fp.fieldId || '',
          maxLength: fp.maxLength || null,
          surroundingText: fp.surroundingText || '',
          sectionHeading: fp.sectionHeading || '',
          formTitle: fp.formTitle || document.title || '',
          ariaLabel: fp.ariaLabel || '',
          ariaDescribedby: fp.ariaDescribedby || '',
          dataAttrs: fp.dataAttrs || {}
        });
      } else if (typeof inferFieldWithGemini === 'function') {
        // Direct inline call (no background worker path)
        const p = activeProfile || (typeof window !== 'undefined' ? window.DEFAULT_PROFILE : {}) || {};
        geminiVal = await inferFieldWithGemini({
          label: fp.label || currentLabel || '',
          tag: fp.tag || 'input',
          type: fp.fieldType || 'text',
          options: fp.options || [],
          placeholder: fp.placeholder || '',
          fieldName: fp.fieldName || '',
          fieldId: fp.fieldId || '',
          maxLength: fp.maxLength || null,
          surroundingText: fp.surroundingText || '',
          sectionHeading: fp.sectionHeading || '',
          formTitle: fp.formTitle || document.title || '',
          ariaLabel: fp.ariaLabel || '',
          ariaDescribedby: fp.ariaDescribedby || '',
          dataAttrs: fp.dataAttrs || {}
        }, p);
      }

      if (geminiVal && geminiVal.trim()) {
        currentTargetValue = geminiVal.trim();
        applyValueToField(currentAnchor, currentTargetValue, currentLabel);
        showSuccessFeedback('Inserted');
      } else {
        // Gemini returned nothing — reset button silently
        resetButtonToCurrentMode();
      }
    } catch (err) {
      console.warn('[AutoApply Pro] Insert Gemini fallback error:', err);
      resetButtonToCurrentMode();
    }
  } // end handleInsertClick

  /**
   * Generates AI answer with Gemini and applies it to the anchor field.
   */
  async function triggerAiGenerationForField(anchor, label) {

    if (!anchor) return;
    insertBtn.innerHTML = `<span class="aap-icon aap-spin">${ICONS.spinner}</span><span class="aap-btn-label">Drafting...</span>`;
    btnGroup.className = 'aap-btn-group visible';
    try {
      let answer = '';
      const promptText = label || document.title || 'Job application response';
      if (typeof sendAiRequest === 'function') {
        answer = await sendAiRequest(promptText);
      } else if (typeof generateAnswerWithGemini === 'function') {
        answer = await generateAnswerWithGemini({ question: promptText, jobContext: document.title }, activeProfile);
      } else if (typeof generateInstantFallbackAnswer === 'function') {
        answer = generateInstantFallbackAnswer(promptText);
      } else if (typeof getInstantFallbackAnswer === 'function') {
        answer = getInstantFallbackAnswer(promptText);
      }

      if (answer) {
        applyValueToField(anchor, answer, label);
        showSuccessFeedback("Inserted");
      } else {
        throw new Error("No answer generated");
      }
    } catch (err) {
      console.warn("[AutoApply Pro] Field AI generation failed:", err);
      insertBtn.innerHTML = `<span class="aap-btn-label">Retry</span>`;
      setTimeout(() => {
        resetButtonToCurrentMode();
      }, 1500);
    }
  }

  /**
   * Renders and opens the Options Menu anchored right below the button group.
   */
  function renderAndShowMenu() {
    if (!menuEl) return;

    // Fallback if currentAnchor is missing: re-detect from document.activeElement
    if (!currentAnchor || !currentAnchor.isConnected) {
      const activeEl = document.activeElement;
      if (activeEl && activeEl !== document.body && activeEl !== document.documentElement) {
        currentAnchor = resolveInteractiveField(activeEl);
      }
    }
    if (!currentAnchor) return;

    const profile = activeProfile || (typeof window !== 'undefined' ? window.DEFAULT_PROFILE : {}) || {};
    if (!currentSuggestions) {
      currentSuggestions = (typeof getFieldSuggestions === 'function')
        ? getFieldSuggestions(currentAnchor, '', profile)
        : { label: '', primary: null, alternatives: [], isOpenEnded: false, isResume: false };
    }

    const { primary, alternatives } = currentSuggestions || {};
    let html = '';

    // Section 1: Candidate Suggestions / Options
    const allOptions = [];
    if (primary && primary.value) {
      allOptions.push({ label: primary.label || 'Recommended', value: primary.value, isPrimary: true });
    }
    if (alternatives && Array.isArray(alternatives) && alternatives.length > 0) {
      alternatives.forEach(alt => {
        if (alt && alt.value && alt.value !== primary?.value) {
          allOptions.push({ label: alt.label || 'Alternative', value: alt.value, isPrimary: false });
        }
      });
    }

    if (allOptions.length > 0) {
      html += `<div class="aap-menu-header">Suggestions</div>`;
      allOptions.forEach((opt) => {
        html += `
          <div class="aap-menu-item" data-action="apply-value" data-val="${escapeHtml(opt.value)}">
            <div class="aap-menu-item-left">
              <span class="aap-icon">${opt.isPrimary ? ICONS.bolt : ICONS.dot}</span>
              <span class="aap-menu-val">${escapeHtml(opt.value)}</span>
            </div>
            <span class="aap-menu-tag">${escapeHtml(opt.label)}</span>
          </div>
        `;
      });
      html += `<div class="aap-menu-divider"></div>`;
    }

    // Section 2: Actions (AI, Resume, Autofill Entire Form)
    html += `<div class="aap-menu-header">Actions</div>`;

    html += `
      <div class="aap-menu-item aap-menu-action" data-action="ai-generate">
        <div class="aap-menu-item-left">
          <span class="aap-icon">${ICONS.sparkle}</span>
          <span class="aap-menu-val">Generate with Gemini AI</span>
        </div>
      </div>
    `;

    html += `
      <div class="aap-menu-item aap-menu-action" data-action="attach-resume">
        <div class="aap-menu-item-left">
          <span class="aap-icon">${ICONS.file}</span>
          <span class="aap-menu-val">Attach Resume (PDF)</span>
        </div>
      </div>
    `;

    html += `
      <div class="aap-menu-item aap-menu-action" data-action="snip-fill">
        <div class="aap-menu-item-left">
          <span class="aap-icon">${ICONS.scissors}</span>
          <span class="aap-menu-val">Snip & Fill Area</span>
        </div>
        <span class="aap-menu-tag">Alt+Shift+S</span>
      </div>
    `;

    html += `
      <div class="aap-menu-item aap-menu-action" data-action="autofill-all">
        <div class="aap-menu-item-left">
          <span class="aap-icon">${ICONS.bolt}</span>
          <span class="aap-menu-val">Autofill Entire Form</span>
        </div>
        <span class="aap-menu-tag">Alt+Shift+F</span>
      </div>
    `;

    menuEl.innerHTML = html;

    // Bind item click listeners
    menuEl.querySelectorAll('.aap-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const action = item.getAttribute('data-action');
        if (action === 'apply-value') {
          const val = item.getAttribute('data-val');
          currentTargetValue = val;
          applyValueToField(currentAnchor, val, currentLabel);
          hideMenu();
          showSuccessFeedback("Inserted");
        } else if (action === 'ai-generate') {
          hideMenu();
          triggerAiGenerationForField(currentAnchor, currentLabel);
        } else if (action === 'attach-resume') {
          hideMenu();
          if (typeof autoUploadResume === 'function') {
            autoUploadResume();
            showSuccessFeedback("Attached");
          }
        } else if (action === 'snip-fill') {
          hideMenu();
          if (typeof window.activateSnipSelector === 'function') {
            window.activateSnipSelector(activeProfile);
          }
        } else if (action === 'autofill-all') {
          hideMenu();
          if (typeof runAutoApply === 'function') {
            runAutoApply(activeProfile, { aiAnswers: false });
            showSuccessFeedback("Form Filled!");
          }
        }
      });
    });

    menuEl.classList.add('visible');
    menuEl.style.display = 'flex';
    isMenuVisible = true;
    updatePosition();
  }

  function hideMenu() {
    if (!menuEl) return;
    menuEl.style.display = 'none';
    menuEl.classList.remove('visible');
    isMenuVisible = false;
  }

  let isApplyingValue = false;

  /**
   * Applies candidate value to the field and clears errors.
   */
  function applyValueToField(el, value, labelText) {
    if (!el || value === undefined || value === null) return;
    isApplyingValue = true;

    try {
      let targetEl = el;
      const initialTag = (el.tagName || '').toLowerCase();
      if (!['input', 'textarea', 'select'].includes(initialTag) && !el.isContentEditable && el.getAttribute?.('contenteditable') !== 'true' && el.getAttribute?.('role') !== 'listbox' && el.getAttribute?.('role') !== 'radio') {
        const inner = (typeof el.querySelector === 'function')
          ? el.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select, div[role="listbox"], div[role="radio"], [contenteditable="true"]')
          : null;
        if (inner) targetEl = inner;
      }

      try {
        targetEl.focus();
      } catch (e) {}

      const tag = (targetEl.tagName || '').toLowerCase();
      const item = (typeof targetEl.closest === 'function') 
        ? (targetEl.closest('div[role="listitem"], .Qr7Oae, .geS5n, .gf-listitem, .form-group, .field') || targetEl.parentElement)
        : targetEl.parentElement;

      // 1. Google Forms or Custom Dropdown Listbox
      if (targetEl.getAttribute?.('role') === 'listbox' || targetEl.classList?.contains('quantumWizMenuPaperselectEl') || targetEl.classList?.contains('gf-custom-select') || targetEl.hasAttribute?.('aria-haspopup')) {
        if (typeof fillGoogleFormsDropdown === 'function') {
          fillGoogleFormsDropdown(targetEl, value, labelText);
        } else if (typeof fillCustomComboboxOrSelect === 'function') {
          fillCustomComboboxOrSelect(targetEl, value);
        }
      }
      // 2. Native Select
      else if (tag === 'select') {
        if (typeof fillCustomComboboxOrSelect === 'function') {
          fillCustomComboboxOrSelect(targetEl, value);
        } else {
          targetEl.value = value;
          try { targetEl.setAttribute('value', String(value)); } catch (e) {}
          targetEl.dispatchEvent(new Event('input', { bubbles: true }));
          targetEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      // 3. Custom or Native Radio Button
      else if (targetEl.getAttribute?.('role') === 'radio' || targetEl.type === 'radio') {
        const container = targetEl.closest?.('[role="radiogroup"], .gf-radio-group, .form-group') || item || document.body;
        const valStr = value.toString().trim().toLowerCase();
        const allRadios = Array.from(container.querySelectorAll('[role="radio"], input[type="radio"]'));
        let targetRadio = allRadios.find(r => {
          const text = (r.getAttribute('aria-label') || r.innerText || r.textContent || r.value || '').trim().toLowerCase();
          return text === valStr || text.includes(valStr) || valStr.includes(text);
        });

        if (!targetRadio) targetRadio = targetEl;

        if (targetRadio.tagName.toLowerCase() === 'input') {
          targetRadio.checked = true;
          targetRadio.dispatchEvent(new Event('input', { bubbles: true }));
          targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          targetRadio.click();
          targetRadio.setAttribute('aria-checked', 'true');
          allRadios.forEach(r => { if (r !== targetRadio) r.setAttribute('aria-checked', 'false'); });
        }
      }
      // 4. Standard Input / Textarea / Composite Container
      else {
        if (typeof setNativeValue === 'function') {
          setNativeValue(targetEl, value);
        } else {
          targetEl.value = value;
          try { targetEl.setAttribute('value', String(value)); } catch (e) {}
          targetEl.dispatchEvent(new Event('input', { bubbles: true }));
          targetEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Clear Google Forms red error states
      if (typeof clearGoogleFormItemError === 'function' && item) {
        clearGoogleFormItemError(item);
      }

      // Flash subtle highlight on field
      if (typeof highlightFilledElement === 'function') {
        highlightFilledElement(targetEl);
      }
    } finally {
      setTimeout(() => {
        isApplyingValue = false;
      }, 150);
    }
  }

  let successTimer = null;

  /**
   * Displays instant success checkmark on the button, then reverts to active state.
   */
  function showSuccessFeedback(msg = "Inserted") {
    if (successTimer) {
      clearTimeout(successTimer);
      successTimer = null;
    }
    btnGroup.classList.add('success');
    insertBtn.innerHTML = `<span class="aap-icon">${ICONS.check}</span><span class="aap-btn-label">${msg}</span>`;

    // After 1.2s, gracefully revert button icon and label back to normal while remaining active!
    successTimer = setTimeout(() => {
      btnGroup.classList.remove('success');
      resetButtonToCurrentMode();
      successTimer = null;
    }, 1200);
  }

  /**
   * Resets insert button icon, label, and title to current mode.
   */
  function resetButtonToCurrentMode() {
    if (!insertBtn || !btnGroup) return;
    if (currentMode === 'ai') {
      btnGroup.className = 'aap-btn-group visible';
      insertBtn.innerHTML = `<span class="aap-icon">${ICONS.sparkle}</span><span class="aap-btn-label">Insert AI</span>`;
      insertBtn.title = 'Insert AI (Right-click for options)';
    } else if (currentMode === 'resume') {
      btnGroup.className = 'aap-btn-group visible';
      insertBtn.innerHTML = `<span class="aap-icon">${ICONS.file}</span><span class="aap-btn-label">Attach Resume</span>`;
      insertBtn.title = 'Attach Resume (Right-click for options)';
    } else {
      btnGroup.className = 'aap-btn-group visible';
      insertBtn.innerHTML = `<span class="aap-icon">${ICONS.bolt}</span><span class="aap-btn-label">Insert</span>`;
      insertBtn.title = currentTargetValue ? `Insert: ${currentTargetValue} (Right-click for options)` : 'Insert (Right-click for options)';
    }
  }

  /**
   * Computes and updates position for split button and dropdown menu.
   * FIX: Places button cleanly to the right of dropdowns so it NEVER covers "Choose" or options!
   */
  function updatePosition() {
    if (!isButtonVisible || !btnGroup || !currentAnchor) return;

    const rect = currentAnchor.getBoundingClientRect();

    // If anchor is scrolled off-screen or hidden, hide
    if (rect.width === 0 && rect.height === 0) {
      hideAll();
      return;
    }
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      btnGroup.style.display = 'none';
      if (menuEl) menuEl.style.display = 'none';
      return;
    } else {
      btnGroup.style.display = 'inline-flex';
      if (isMenuVisible && menuEl) menuEl.style.display = 'flex';
    }

    const btnWidth = btnGroup.offsetWidth || 82;
    const btnHeight = btnGroup.offsetHeight || 24;

    const tag = currentAnchor.tagName ? currentAnchor.tagName.toLowerCase() : '';
    const isTextarea = tag === 'textarea';
    const isDropdown = tag === 'select' ||
                       currentAnchor.getAttribute('role') === 'listbox' ||
                       currentAnchor.classList.contains('quantumWizMenuPaperselectEl') ||
                       currentAnchor.classList.contains('gf-custom-select') ||
                       currentAnchor.hasAttribute('aria-haspopup');

    let left = 0;
    let top = 0;

    // CASE 1: Dropdown / Listbox (e.g. "Choose", "Year of Graduation")
    // IMPORTANT: Position cleanly to the RIGHT of the dropdown box so "Choose" and options are 100% visible!
    if (isDropdown) {
      if (rect.right + btnWidth + 12 <= window.innerWidth) {
        // Place to the right of the dropdown box
        left = rect.right + 8;
        top = rect.top + (rect.height - btnHeight) / 2;
      } else {
        // Narrow screen: place directly above the dropdown
        left = rect.left;
        top = rect.top - btnHeight - 4;
      }
    }
    // CASE 2: Textarea
    else if (isTextarea) {
      left = rect.right - btnWidth - 6;
      top = rect.top + 6;
    }
    // CASE 3: Standard Input (Google Forms text underline, ATS inputs)
    else {
      if (rect.width >= 240) {
        // Wide input line: dock inside right edge
        left = rect.right - btnWidth - 4;
        top = rect.top + (rect.height - btnHeight) / 2;
      } else {
        // Narrow input: dock outside right edge
        left = rect.right + 8;
        top = rect.top + (rect.height - btnHeight) / 2;
      }
    }

    // Clamp button within viewport
    const maxLeft = window.innerWidth - btnWidth - 4;
    if (left > maxLeft) left = maxLeft;
    if (left < 4) left = 4;

    const maxTop = window.innerHeight - btnHeight - 4;
    if (top > maxTop) top = maxTop;
    if (top < 4) top = 4;

    btnGroup.style.left = `${Math.round(left)}px`;
    btnGroup.style.top = `${Math.round(top)}px`;

    // Position Dropdown Menu if open
    if (isMenuVisible && menuEl) {
      menuEl.style.display = 'flex';
      const menuWidth = menuEl.offsetWidth || 220;
      const menuHeight = menuEl.offsetHeight || 160;

      // Align right edge of menu with right edge of button group (directly under three dots)
      let menuLeft = left + btnWidth - menuWidth;
      if (menuLeft < 8) {
        menuLeft = left;
      }
      if (menuLeft + menuWidth > window.innerWidth - 8) {
        menuLeft = window.innerWidth - menuWidth - 8;
      }
      if (menuLeft < 8) menuLeft = 8;

      let menuTop = top + btnHeight + 4;
      // Flip above if cutting off at bottom
      if (menuTop + menuHeight > window.innerHeight - 8 && top - menuHeight - 4 > 8) {
        menuTop = top - menuHeight - 4;
      }

      menuEl.style.left = `${Math.round(menuLeft)}px`;
      menuEl.style.top = `${Math.round(menuTop)}px`;
    }
  }

  /**
   * Hides both button and menu cleanly.
   */
  function hideAll() {
    stopTracking();
    hideMenu();
    if (successTimer) {
      clearTimeout(successTimer);
      successTimer = null;
    }
    if (btnGroup) {
      btnGroup.style.display = 'none';
      btnGroup.classList.remove('visible');
      btnGroup.classList.remove('success');
    }
    isButtonVisible = false;
    currentAnchor = null;
    currentTargetValue = null;
    currentSuggestions = null;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Window exports for global access and testing
  if (typeof window !== 'undefined') {
    window.initFieldPopup = initFieldPopup;
    window.showFieldPopupForElement = showFieldPopupForElement;
    window.hideFieldPopup = hideAll;
    window.setFieldPopupEnabled = setWidgetEnabled;
    window.isFieldPopupEnabled = () => isWidgetEnabled;
    window.setActivationMode = setActivationMode;
    window.getActivationMode = () => activationMode;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initFieldPopup());
    } else {
      initFieldPopup();
    }
  }

})();
