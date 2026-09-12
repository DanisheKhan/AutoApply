/**
 * AutoApply Pro - Snip & Fill (Area Selection Autofill Engine)
 * Windows Snipping Tool style (Win+Shift+S) rectangular marquee area selection.
 * Allows candidates to drag a box over any specific form section (e.g. Education,
 * Experience, or Custom Essay Questions) and fills ONLY those selected fields.
 */

(function () {
  'use strict';

  let overlayHost = null;
  let overlayShadow = null;
  let isSnipActive = false;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentRect = null;
  let highlightedElements = new Set();
  let cachedProfile = null;

  let marqueeEl = null;
  let badgeEl = null;

  /**
   * Activates the Snipping Area Selection Mode.
   */
  function activateSnipSelector(passedProfile) {
    if (isSnipActive) return;
    if (passedProfile) cachedProfile = passedProfile;
    isSnipActive = true;
    highlightedElements.clear();

    // Close any open field popups
    if (typeof window.hideFieldPopup === 'function') {
      window.hideFieldPopup();
    }

    createOverlayDom();
    bindOverlayEvents();
  }

  /**
   * Cancels and cleans up the Snip Selector overlay.
   */
  function deactivateSnipSelector() {
    isSnipActive = false;
    isDragging = false;
    unbindOverlayEvents();
    clearElementHighlights();

    if (overlayHost && overlayHost.parentNode) {
      overlayHost.parentNode.removeChild(overlayHost);
    }
    overlayHost = null;
    overlayShadow = null;
    marqueeEl = null;
    badgeEl = null;
  }

  /**
   * Creates the full-screen isolated Shadow DOM overlay.
   */
  function createOverlayDom() {
    if (document.getElementById('autoapply-snip-root')) {
      document.getElementById('autoapply-snip-root').remove();
    }

    overlayHost = document.createElement('div');
    overlayHost.id = 'autoapply-snip-root';
    overlayHost.style.position = 'fixed';
    overlayHost.style.top = '0';
    overlayHost.style.left = '0';
    overlayHost.style.width = '100vw';
    overlayHost.style.height = '100vh';
    overlayHost.style.zIndex = '2147483647';
    overlayHost.style.cursor = 'crosshair';
    overlayHost.style.userSelect = 'none';
    overlayHost.style.pointerEvents = 'auto';

    (document.body || document.documentElement).appendChild(overlayHost);

    overlayShadow = overlayHost.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&family=JetBrains+Mono:wght@500&display=swap');

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      :host {
        all: initial;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .aap-snip-backdrop {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(10, 10, 14, 0.45);
        cursor: crosshair;
        z-index: 2147483647;
      }

      /* Instruction Banner at Top Center */
      .aap-snip-banner {
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        display: inline-flex;
        align-items: center;
        gap: 10px;
        background: #18181b;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 8px 18px;
        border-radius: 9999px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.65), 0 2px 8px rgba(0, 0, 0, 0.4);
        color: #f4f4f5;
        font-size: 12.5px;
        font-weight: 500;
        letter-spacing: 0.1px;
        pointer-events: none;
        z-index: 2147483647;
        animation: aap-banner-in 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .aap-snip-banner .aap-snip-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #f4f4f5;
      }

      .aap-snip-kbd {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.18);
        padding: 2px 6px;
        border-radius: 4px;
        color: #a1a1aa;
      }

      /* Drag Selection Marquee Box */
      .aap-snip-marquee {
        position: fixed;
        display: none;
        border: 1.5px dashed #ffffff;
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 0 0 99999px rgba(10, 10, 14, 0.5);
        pointer-events: none;
        z-index: 2147483647;
      }

      /* Dynamic Count Tooltip Badge attached to cursor */
      .aap-snip-badge {
        position: fixed;
        display: none;
        align-items: center;
        gap: 5px;
        background: #18181b;
        border: 1px solid rgba(255, 255, 255, 0.25);
        padding: 4px 10px;
        border-radius: 9999px;
        color: #ffffff;
        font-size: 11px;
        font-weight: 600;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
        pointer-events: none;
        z-index: 2147483647;
      }

      .aap-snip-badge.has-fields {
        border-color: rgba(74, 222, 128, 0.6);
        color: #4ade80;
      }

      @keyframes aap-banner-in {
        from { opacity: 0; transform: translate(-50%, -10px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
    `;

    overlayShadow.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.className = 'aap-snip-backdrop';

    const banner = document.createElement('div');
    banner.className = 'aap-snip-banner';
    banner.innerHTML = `
      <span class="aap-snip-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="6" cy="6" r="3"></circle>
          <circle cx="6" cy="18" r="3"></circle>
          <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
          <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
          <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
        </svg>
      </span>
      <span>Click & drag a box over form fields to fill</span>
      <span class="aap-snip-kbd">Esc to cancel</span>
    `;

    marqueeEl = document.createElement('div');
    marqueeEl.className = 'aap-snip-marquee';

    badgeEl = document.createElement('div');
    badgeEl.className = 'aap-snip-badge';

    overlayShadow.appendChild(backdrop);
    overlayShadow.appendChild(banner);
    overlayShadow.appendChild(marqueeEl);
    overlayShadow.appendChild(badgeEl);
  }

  // Event Handlers
  function onMouseDown(e) {
    if (e.button !== 0) return; // Left click only
    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    currentRect = { left: startX, top: startY, width: 0, height: 0, right: startX, bottom: startY };

    if (marqueeEl) {
      marqueeEl.style.display = 'block';
      marqueeEl.style.left = `${startX}px`;
      marqueeEl.style.top = `${startY}px`;
      marqueeEl.style.width = '0px';
      marqueeEl.style.height = '0px';
    }

    if (badgeEl) {
      badgeEl.style.display = 'inline-flex';
      badgeEl.style.left = `${startX + 14}px`;
      badgeEl.style.top = `${startY + 14}px`;
      badgeEl.textContent = '0 fields';
    }
  }

  function onMouseMove(e) {
    if (!isDragging || !isSnipActive) return;
    e.preventDefault();

    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    currentRect = {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height
    };

    if (marqueeEl) {
      marqueeEl.style.left = `${left}px`;
      marqueeEl.style.top = `${top}px`;
      marqueeEl.style.width = `${width}px`;
      marqueeEl.style.height = `${height}px`;
    }

    // Position badge near bottom right of cursor
    if (badgeEl) {
      let badgeLeft = currentX + 16;
      let badgeTop = currentY + 16;
      if (badgeLeft + 100 > window.innerWidth) badgeLeft = currentX - 90;
      if (badgeTop + 30 > window.innerHeight) badgeTop = currentY - 30;

      badgeEl.style.left = `${badgeLeft}px`;
      badgeEl.style.top = `${badgeTop}px`;

      // Detect fields inside bounding box in real time
      const elementsInside = findElementsInRect(currentRect);
      updateElementHighlights(elementsInside);

      const count = elementsInside.length;
      badgeEl.textContent = `${count} field${count === 1 ? '' : 's'}`;
      if (count > 0) {
        badgeEl.classList.add('has-fields');
      } else {
        badgeEl.classList.remove('has-fields');
      }
    }
  }

  async function onMouseUp(e) {
    if (!isDragging || !isSnipActive) return;
    e.preventDefault();
    e.stopPropagation();

    isDragging = false;
    const dragBox = currentRect ? { ...currentRect } : null;
    const elementsInside = findElementsInRect(dragBox);

    // Clean up overlay first
    deactivateSnipSelector();

    // If user dragged a meaningful box and fields were captured
    if (elementsInside && elementsInside.length > 0) {
      await executeSelectiveAutofill(elementsInside);
    } else if (dragBox && (dragBox.width > 12 || dragBox.height > 12)) {
      showResultToast("No form fields detected in selected area");
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && isSnipActive) {
      e.preventDefault();
      e.stopPropagation();
      deactivateSnipSelector();
    }
  }

  function bindOverlayEvents() {
    if (overlayHost) {
      overlayHost.addEventListener('mousedown', onMouseDown, true);
    }
    window.addEventListener('mousemove', onMouseMove, { capture: true, passive: false });
    window.addEventListener('mouseup', onMouseUp, { capture: true, passive: false });
    window.addEventListener('keydown', onKeyDown, { capture: true, passive: false });
  }

  function unbindOverlayEvents() {
    if (overlayHost) {
      overlayHost.removeEventListener('mousedown', onMouseDown, true);
    }
    window.removeEventListener('mousemove', onMouseMove, { capture: true, passive: false });
    window.removeEventListener('mouseup', onMouseUp, { capture: true, passive: false });
    window.removeEventListener('keydown', onKeyDown, { capture: true, passive: false });
  }

  /**
   * Scans document for interactive form elements that overlap the given 2D bounding rect.
   */
  function findElementsInRect(box) {
    if (!box || (box.width < 5 && box.height < 5)) return [];

    const matched = new Set();

    // 1. Direct interactive form elements
    const candidates = Array.from(document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select, [contenteditable="true"], div[role="combobox"], div[role="listbox"]:not(.OA0dhb), div[role="radio"], div[role="checkbox"], .quantumWizMenuPaperselectEl, .gf-custom-select, [aria-haspopup="listbox"], [class*="dropzone"], [class*="drop-zone"]'
    ));

    for (const el of candidates) {
      if (!el.isConnected) continue;
      // Skip overlay internal elements
      if (el.id === 'autoapply-snip-root' || el.closest('#autoapply-snip-root') || el.closest('#autoapply-field-popup-root')) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;

      // 2D AABB overlap condition
      const isOverlapping = (
        rect.left < box.right &&
        rect.right > box.left &&
        rect.top < box.bottom &&
        rect.bottom > box.top
      );

      if (isOverlapping) {
        matched.add(el);
      }
    }

    // 2. Question card / group container overlap (e.g. Google Forms cards, form-groups)
    const containers = Array.from(document.querySelectorAll(
      'div[role="listitem"], .gf-listitem, .form-group, .geS5n, .Qr7Oae, .form-row, fieldset, .form-card, [role="radiogroup"], .gf-radio-group'
    ));

    for (const cont of containers) {
      if (!cont.isConnected) continue;
      if (cont.id === 'autoapply-snip-root' || cont.closest('#autoapply-snip-root')) continue;

      const rect = cont.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;

      const isOverlapping = (
        rect.left < box.right &&
        rect.right > box.left &&
        rect.top < box.bottom &&
        rect.bottom > box.top
      );

      if (isOverlapping) {
        const innerFields = cont.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select, div[role="combobox"], div[role="listbox"]:not(.OA0dhb), div[role="radio"], div[role="checkbox"], .quantumWizMenuPaperselectEl, .gf-custom-select, [aria-haspopup="listbox"]'
        );
        innerFields.forEach(f => {
          if (f.isConnected && !f.closest('#autoapply-snip-root') && !f.closest('#autoapply-field-popup-root')) {
            matched.add(f);
          }
        });
      }
    }

    return Array.from(matched);
  }

  /**
   * Updates visual outline highlights on elements currently inside the box.
   */
  function updateElementHighlights(newElements) {
    const newSet = new Set(newElements);

    // Remove highlight from elements that are no longer inside
    for (const el of highlightedElements) {
      if (!newSet.has(el)) {
        removeHighlight(el);
      }
    }

    // Add highlight to newly captured elements
    for (const el of newSet) {
      if (!highlightedElements.has(el)) {
        addHighlight(el);
      }
    }

    highlightedElements = newSet;
  }

  function addHighlight(el) {
    if (!el) return;
    el.setAttribute('data-aap-snip-highlight', 'true');
    el.style.outline = '2px dashed rgba(255, 255, 255, 0.85)';
    el.style.outlineOffset = '2px';
  }

  function removeHighlight(el) {
    if (!el) return;
    el.removeAttribute('data-aap-snip-highlight');
    el.style.outline = '';
    el.style.outlineOffset = '';
  }

  function clearElementHighlights() {
    for (const el of highlightedElements) {
      removeHighlight(el);
    }
    highlightedElements.clear();
  }

  /**
   * Executes autofill solely on the selected array of elements.
   */
  async function executeSelectiveAutofill(elements) {
    let profile = cachedProfile || (typeof window !== 'undefined' && window.DEFAULT_PROFILE) ? (cachedProfile || window.DEFAULT_PROFILE) : {};

    if (!cachedProfile) {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          const res = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "GET_PROFILE" }, (response) => {
              if (chrome.runtime.lastError || !response || !response.profile) {
                resolve(profile);
              } else {
                resolve(response.profile);
              }
            });
          });
          if (res) profile = res;
        }
      } catch (e) {}
    }

    let filledCount = 0;
    let aiCount = 0;

    if (typeof window.fillSelectedElements === 'function') {
      const res = await window.fillSelectedElements(elements, profile, { aiAnswers: true });
      filledCount = res.filledCount || 0;
      aiCount = res.aiCount || 0;
    } else {
      // Fallback direct heuristic fill
      for (const el of elements) {
        if (typeof matchValueFromProfile === 'function' && typeof setNativeValue === 'function') {
          const val = matchValueFromProfile(el, profile);
          if (val !== null && val !== undefined) {
            if (setNativeValue(el, val)) filledCount++;
          }
        }
      }
    }

    if (filledCount > 0) {
      showResultToast(`✓ Filled ${filledCount} field${filledCount === 1 ? '' : 's'} in selected area!`);
    } else {
      showResultToast("No matching profile values found for selected fields.");
    }
  }

  /**
   * Displays temporary clean toast notifying candidate of filled fields.
   */
  function showResultToast(message) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '28px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '8px';
    toast.style.background = '#18181b';
    toast.style.border = '1px solid rgba(74, 222, 128, 0.5)';
    toast.style.padding = '9px 20px';
    toast.style.borderRadius = '9999px';
    toast.style.color = '#4ade80';
    toast.style.fontSize = '12.5px';
    toast.style.fontWeight = '600';
    toast.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6)';
    toast.style.zIndex = '2147483647';
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    toast.style.pointerEvents = 'none';
    toast.textContent = message;

    (document.body || document.documentElement).appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, 10px)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2500);
  }

  // Global window export
  if (typeof window !== 'undefined') {
    window.activateSnipSelector = activateSnipSelector;
    window.deactivateSnipSelector = deactivateSnipSelector;
  }
})();
