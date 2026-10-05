/**
 * AutoApply Pro - Visual AI Snip & Autofill Engine
 * Allows candidates to drag a rectangular box over any question or form field on the screen.
 * Captures high-res pixels, routes to Gemini Multimodal Vision API, references Mohammad Danish Khan's
 * master bio-data (bio.txt), and automatically inserts the answer into the target form field.
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
  let cachedProfile = null;

  let marqueeEl = null;
  let badgeEl = null;
  let activeLoaderEl = null;
  let activeResultHudEl = null;

  /**
   * Activates the Visual AI Snip Mode.
   */
  function activateVisualSnip(passedProfile) {
    if (isSnipActive) return;
    if (passedProfile) cachedProfile = passedProfile;
    isSnipActive = true;

    // Close any previous HUD or field popup
    dismissResultHud();
    dismissLoader();

    if (typeof window.hideFieldPopup === 'function') {
      window.hideFieldPopup();
    }
    if (typeof window.deactivateSnipSelector === 'function') {
      window.deactivateSnipSelector();
    }

    createOverlayDom();
    bindOverlayEvents();
  }

  /**
   * Deactivates the Visual AI Snip Overlay.
   */
  function deactivateVisualSnip() {
    isSnipActive = false;
    isDragging = false;
    unbindOverlayEvents();

    if (overlayHost && overlayHost.parentNode) {
      overlayHost.parentNode.removeChild(overlayHost);
    }
    overlayHost = null;
    overlayShadow = null;
    marqueeEl = null;
    badgeEl = null;
  }

  /**
   * Creates isolated full-screen Shadow DOM overlay.
   */
  function createOverlayDom() {
    if (document.getElementById('autoapply-visual-snip-root')) {
      document.getElementById('autoapply-visual-snip-root').remove();
    }

    overlayHost = document.createElement('div');
    overlayHost.id = 'autoapply-visual-snip-root';
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

      .aav-backdrop {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(10, 10, 14, 0.48);
        cursor: crosshair;
        z-index: 2147483647;
      }

      /* Instruction Banner at Top Center */
      .aav-banner {
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        display: inline-flex;
        align-items: center;
        gap: 11px;
        background: #13131a;
        border: 1px solid rgba(139, 92, 246, 0.4);
        padding: 9px 20px;
        border-radius: 9999px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.75), 0 0 20px rgba(139, 92, 246, 0.2);
        color: #f4f4f5;
        font-size: 13px;
        font-weight: 500;
        pointer-events: none;
        z-index: 2147483647;
        animation: aav-banner-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .aav-banner-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #c084fc;
      }

      .aav-kbd {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.16);
        padding: 2px 7px;
        border-radius: 5px;
        color: #a1a1aa;
      }

      /* Drag Selection Marquee Box */
      .aav-marquee {
        position: fixed;
        display: none;
        border: 1.5px dashed #c084fc;
        background: rgba(139, 92, 246, 0.12);
        box-shadow: 0 0 0 99999px rgba(10, 10, 14, 0.52);
        pointer-events: none;
        z-index: 2147483647;
      }

      /* Badge near cursor */
      .aav-badge {
        position: fixed;
        display: none;
        align-items: center;
        gap: 6px;
        background: #18181f;
        border: 1px solid rgba(139, 92, 246, 0.45);
        padding: 4px 11px;
        border-radius: 9999px;
        color: #e9d5ff;
        font-size: 11.5px;
        font-weight: 600;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
        pointer-events: none;
        z-index: 2147483647;
      }

      .aav-badge.has-target {
        border-color: rgba(74, 222, 128, 0.7);
        color: #86efac;
      }

      @keyframes aav-banner-in {
        from { opacity: 0; transform: translate(-50%, -10px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
    `;

    overlayShadow.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.className = 'aav-backdrop';

    const banner = document.createElement('div');
    banner.className = 'aav-banner';
    banner.innerHTML = `
      <span class="aav-banner-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
      </span>
      <span>Drag a box over any question or field for Gemini AI Vision</span>
      <span class="aav-kbd">Esc to cancel</span>
    `;

    marqueeEl = document.createElement('div');
    marqueeEl.className = 'aav-marquee';

    badgeEl = document.createElement('div');
    badgeEl.className = 'aav-badge';

    overlayShadow.appendChild(backdrop);
    overlayShadow.appendChild(banner);
    overlayShadow.appendChild(marqueeEl);
    overlayShadow.appendChild(badgeEl);
  }

  function onMouseDown(e) {
    if (e.button !== 0) return;
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
      badgeEl.style.left = `${startX + 15}px`;
      badgeEl.style.top = `${startY + 15}px`;
      badgeEl.textContent = 'Snip question';
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

    if (badgeEl) {
      let badgeLeft = currentX + 16;
      let badgeTop = currentY + 16;
      if (badgeLeft + 140 > window.innerWidth) badgeLeft = currentX - 130;
      if (badgeTop + 35 > window.innerHeight) badgeTop = currentY - 35;

      badgeEl.style.left = `${badgeLeft}px`;
      badgeEl.style.top = `${badgeTop}px`;

      const targetField = findTargetFieldInOrNear(currentRect);
      if (targetField) {
        badgeEl.textContent = `🎯 Field detected (${Math.round(width)}×${Math.round(height)})`;
        badgeEl.classList.add('has-target');
      } else {
        badgeEl.textContent = `📸 Snip ${Math.round(width)}×${Math.round(height)} px`;
        badgeEl.classList.remove('has-target');
      }
    }
  }

  async function onMouseUp(e) {
    if (!isDragging || !isSnipActive) return;
    e.preventDefault();
    e.stopPropagation();

    isDragging = false;
    const dragBox = currentRect ? { ...currentRect } : null;

    // Detect target input element before removing overlay
    const targetElement = dragBox ? findTargetFieldInOrNear(dragBox) : null;
    const nearbyHint = targetElement ? extractLabelHint(targetElement) : "";

    // Clean up overlay immediately so the page returns to normal view
    deactivateVisualSnip();

    if (!dragBox || dragBox.width < 12 || dragBox.height < 12) {
      return;
    }

    // Launch Visual Vision Pipeline
    await processVisualCapture(dragBox, targetElement, nearbyHint);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && isSnipActive) {
      e.preventDefault();
      e.stopPropagation();
      deactivateVisualSnip();
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
   * Finds any interactive form field inside or directly below the dragged box.
   */
  function findTargetFieldInOrNear(box) {
    if (!box || (box.width < 5 && box.height < 5)) return null;

    const candidates = Array.from(document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select, [contenteditable="true"], div[role="combobox"]'
    ));

    // 1. Direct overlap
    for (const el of candidates) {
      if (!el.isConnected) continue;
      if (el.id?.startsWith('autoapply-') || el.closest('[id^="autoapply-"]')) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;

      const isOverlapping = (
        rect.left < box.right &&
        rect.right > box.left &&
        rect.top < box.bottom &&
        rect.bottom > box.top
      );

      if (isOverlapping) return el;
    }

    // 2. Proximity: field immediately underneath the box (within 70px)
    let closest = null;
    let closestDist = Infinity;
    for (const el of candidates) {
      if (!el.isConnected) continue;
      if (el.id?.startsWith('autoapply-') || el.closest('[id^="autoapply-"]')) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;

      // Below the bottom of the box and horizontally aligned
      const isBelow = rect.top >= box.bottom - 10 && rect.top <= box.bottom + 80;
      const isHorizAligned = rect.right >= box.left && rect.left <= box.right;

      if (isBelow && isHorizAligned) {
        const dist = rect.top - box.bottom;
        if (dist < closestDist) {
          closestDist = dist;
          closest = el;
        }
      }
    }

    return closest;
  }

  /**
   * Extracts text context hint from field label, placeholder, or aria.
   */
  function extractLabelHint(el) {
    if (!el) return "";
    let hint = el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || "";
    if (!hint && el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) hint = lbl.innerText || "";
    }
    if (!hint) {
      const parentLabel = el.closest('label');
      if (parentLabel) hint = parentLabel.innerText || "";
    }
    return hint.trim().replace(/\s+/g, ' ').slice(0, 150);
  }

  /**
   * Main pipeline: requests viewport screenshot, crops using canvas,
   * sends to Gemini Vision, inserts into field, and displays floating HUD.
   */
  async function processVisualCapture(rect, targetElement, hint) {
    showLoaderBadge(rect, "📸 Capturing & Analyzing with Gemini Vision...");

    // 1. Request tab screenshot from background service worker
    let dataUrl = null;
    try {
      const captureRes = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "CAPTURE_VISIBLE_TAB" }, (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            resolve(null);
          } else {
            resolve(response.dataUrl);
          }
        });
      });
      dataUrl = captureRes;
    } catch (e) {
      console.error("[AutoApply Pro] Tab capture error:", e);
    }

    if (!dataUrl) {
      dismissLoader();
      showToast("Could not capture screen. Please reload the tab or check permissions.");
      return;
    }

    // 2. Crop screenshot to the snipped area via offscreen canvas
    let croppedBase64 = null;
    try {
      croppedBase64 = await cropImageDataUrl(dataUrl, rect);
    } catch (cropErr) {
      console.error("[AutoApply Pro] Canvas crop failed:", cropErr);
      dismissLoader();
      showToast("Failed to process cropped image.");
      return;
    }

    if (!croppedBase64) {
      dismissLoader();
      showToast("Cropping failed.");
      return;
    }

    // 3. Dispatch to Gemini Vision API via service worker
    updateLoaderText("✨ Reading question & checking your bio...");

    let visionResult = null;
    try {
      const res = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "ANALYZE_VISION_SNIP",
          payload: {
            imageBase64: croppedBase64,
            questionHint: hint,
            maxLength: targetElement?.maxLength > 0 ? targetElement.maxLength : undefined
          }
        }, (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            resolve(null);
          } else {
            resolve(response.result);
          }
        });
      });
      visionResult = res;
    } catch (apiErr) {
      console.error("[AutoApply Pro] Vision API dispatch error:", apiErr);
    }

    dismissLoader();

    let detectedQuestion = (visionResult && visionResult.detectedQuestion) ? visionResult.detectedQuestion.trim() : (hint || "Detected Section");
    let answer = (visionResult && visionResult.answer) ? visionResult.answer.trim() : "";

    // Guarantee that answer is NEVER empty - if a section header like 'Job Requirements' was snipped,
    // generate Danish's high-impact qualification summary matching the prompt
    if (!answer) {
      if (typeof window.generateInstantFallbackAnswer === 'function') {
        answer = window.generateInstantFallbackAnswer(detectedQuestion, cachedProfile);
      }
      if (!answer) {
        answer = "Mohammad Danish Khan | B.Tech in Artificial Intelligence (CGPA 7.79) | 10-month Web & UI/UX Developer Intern at Meet Bros | Built Madina Perfumes (React, Supabase, Razorpay, Shiprocket) & CodeRace (Supabase & PostgreSQL progress tracker) | Stack: React.js, Node.js, Express.js, MongoDB, TypeScript, Tailwind CSS, Java.";
      }
    }

    // 4. Auto-insert into target field if present
    let didAutoInsert = false;
    if (targetElement) {
      if (typeof window.setNativeValue === 'function') {
        didAutoInsert = Boolean(window.setNativeValue(targetElement, answer));
      } else {
        targetElement.value = answer;
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        targetElement.dispatchEvent(new Event('change', { bubbles: true }));
        didAutoInsert = true;
      }
    }

    // 5. Render Floating Result Card
    renderResultHud({
      rect,
      question: detectedQuestion,
      answer,
      targetElement,
      didAutoInsert
    });
  }

  /**
   * Crops a data URL image to the specified bounding box coordinates.
   */
  function cropImageDataUrl(dataUrl, box) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const dpr = window.devicePixelRatio || 1;
          const canvas = document.createElement('canvas');

          // Source coordinates accounting for DPR
          const sx = Math.max(0, Math.floor(box.left * dpr));
          const sy = Math.max(0, Math.floor(box.top * dpr));
          const sw = Math.min(img.width - sx, Math.floor(box.width * dpr));
          const sh = Math.min(img.height - sy, Math.floor(box.height * dpr));

          canvas.width = Math.max(1, sw);
          canvas.height = Math.max(1, sh);

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

          const cropped = canvas.toDataURL('image/png');
          resolve(cropped);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error("Image load failed for crop"));
      img.src = dataUrl;
    });
  }

  /**
   * Shows a floating animated status loader badge.
   */
  function showLoaderBadge(rect, text) {
    dismissLoader();

    activeLoaderEl = document.createElement('div');
    activeLoaderEl.id = 'autoapply-visual-loader';
    activeLoaderEl.style.position = 'fixed';
    activeLoaderEl.style.left = `${Math.min(window.innerWidth - 320, Math.max(20, rect.left))}px`;
    activeLoaderEl.style.top = `${Math.max(20, rect.top - 46)}px`;
    activeLoaderEl.style.zIndex = '2147483647';
    activeLoaderEl.style.display = 'inline-flex';
    activeLoaderEl.style.alignItems = 'center';
    activeLoaderEl.style.gap = '10px';
    activeLoaderEl.style.background = '#13131a';
    activeLoaderEl.style.border = '1px solid rgba(139, 92, 246, 0.5)';
    activeLoaderEl.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(139, 92, 246, 0.25)';
    activeLoaderEl.style.borderRadius = '9999px';
    activeLoaderEl.style.padding = '8px 18px';
    activeLoaderEl.style.color = '#e9d5ff';
    activeLoaderEl.style.fontSize = '12.5px';
    activeLoaderEl.style.fontWeight = '600';
    activeLoaderEl.style.fontFamily = "'Plus Jakarta Sans', -apple-system, sans-serif";
    activeLoaderEl.style.pointerEvents = 'none';

    activeLoaderEl.innerHTML = `
      <svg class="aav-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: aav-spin 0.8s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      <span class="aav-loader-text">${text}</span>
      <style>
        @keyframes aav-spin {
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    (document.body || document.documentElement).appendChild(activeLoaderEl);
  }

  function updateLoaderText(text) {
    if (activeLoaderEl) {
      const span = activeLoaderEl.querySelector('.aav-loader-text');
      if (span) span.textContent = text;
    }
  }

  function dismissLoader() {
    if (activeLoaderEl && activeLoaderEl.parentNode) {
      activeLoaderEl.parentNode.removeChild(activeLoaderEl);
    }
    activeLoaderEl = null;
  }

  let activeHudCleanups = [];

  /**
   * Renders the floating Result HUD beside the snipped area with rich glassmorphism.
   */
  function renderResultHud({ rect, question, answer, targetElement, didAutoInsert }) {
    dismissResultHud();

    const hudHost = document.createElement('div');
    hudHost.id = 'autoapply-visual-hud-root';
    hudHost.style.position = 'fixed';

    // Position intelligently near the rect
    let hudLeft = rect.left;
    let hudTop = rect.bottom + 14;

    if (hudLeft + 450 > window.innerWidth) {
      hudLeft = Math.max(16, window.innerWidth - 470);
    }
    if (hudTop + 340 > window.innerHeight) {
      hudTop = Math.max(20, rect.top - 350);
    }
    if (hudTop < 20) hudTop = 20;
    if (hudLeft < 16) hudLeft = 16;

    hudHost.style.left = `${hudLeft}px`;
    hudHost.style.top = `${hudTop}px`;
    hudHost.style.zIndex = '2147483647';

    const shadow = hudHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .aav-card {
        width: 440px;
        max-width: calc(100vw - 32px);
        background: rgba(14, 15, 23, 0.96);
        backdrop-filter: blur(28px) saturate(200%);
        -webkit-backdrop-filter: blur(28px) saturate(200%);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 18px;
        box-shadow: 
          0 24px 64px -10px rgba(0, 0, 0, 0.85),
          0 0 0 1px rgba(168, 85, 247, 0.25),
          0 0 35px rgba(139, 92, 246, 0.14);
        color: #f4f4f5;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 16px 18px 18px 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        animation: aav-card-pop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        user-select: text;
      }

      /* Card Header with Drag Handle & Top-Right Close Button */
      .aav-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: grab;
        padding-bottom: 2px;
        user-select: none;
      }

      .aav-card-header:active {
        cursor: grabbing;
      }

      .aav-header-left {
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .aav-brand-row {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 13px;
        font-weight: 700;
        color: #f4f4f5;
        letter-spacing: -0.01em;
      }

      .aav-brand-icon-wrap {
        width: 24px;
        height: 24px;
        border-radius: 7px;
        background: linear-gradient(135deg, rgba(168, 85, 247, 0.35), rgba(99, 102, 241, 0.35));
        border: 1px solid rgba(168, 85, 247, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #c084fc;
        flex-shrink: 0;
        box-shadow: 0 0 12px rgba(168, 85, 247, 0.3);
      }

      .aav-badge-status {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 9px;
        border-radius: 9999px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        letter-spacing: 0.01em;
      }

      .aav-badge-status.inserted {
        background: rgba(34, 197, 94, 0.15);
        color: #4ade80;
        border: 1px solid rgba(34, 197, 94, 0.35);
      }

      .aav-badge-status.ready {
        background: rgba(168, 85, 247, 0.16);
        color: #d8b4fe;
        border: 1px solid rgba(168, 85, 247, 0.35);
      }

      .aav-header-right {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .aav-drag-hint {
        color: #71717a;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 5px;
        border-radius: 6px;
        cursor: grab;
        transition: color 0.15s ease;
      }

      .aav-drag-hint:hover {
        color: #d4d4d8;
      }

      .aav-close-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #a1a1aa;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
        outline: none;
      }

      .aav-close-btn:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.4);
        color: #fca5a5;
        transform: scale(1.06);
      }

      /* Question / Context Banner */
      .aav-question-box {
        background: rgba(255, 255, 255, 0.035);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-left: 3px solid #a855f7;
        border-radius: 10px;
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .aav-q-header {
        font-family: 'JetBrains Mono', monospace;
        font-size: 9.5px;
        font-weight: 600;
        color: #c084fc;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .aav-q-content {
        font-size: 12px;
        color: #e4e4e7;
        line-height: 1.45;
        max-height: 52px;
        overflow-y: auto;
        word-break: break-word;
      }

      .aav-q-content::-webkit-scrollbar {
        width: 4px;
      }
      .aav-q-content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
      }

      /* Quick Action Chips Bar */
      .aav-chips-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        overflow-x: auto;
        padding-bottom: 1px;
      }

      .aav-chip {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #d4d4d8;
        font-size: 11px;
        font-weight: 500;
        padding: 4px 9px;
        border-radius: 6px;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.15s ease;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-family: inherit;
        outline: none;
      }

      .aav-chip:hover {
        background: rgba(168, 85, 247, 0.18);
        border-color: rgba(168, 85, 247, 0.4);
        color: #e9d5ff;
        transform: translateY(-1px);
      }

      /* Textarea Box with anti-extension collision */
      .aav-textarea-wrap {
        position: relative;
        width: 100%;
      }

      .aav-textarea {
        width: 100%;
        min-height: 100px;
        max-height: 220px;
        background: rgba(8, 8, 13, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        padding: 12px 14px;
        color: #ffffff;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.5;
        resize: vertical;
        outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }

      .aav-textarea:focus {
        border-color: rgba(168, 85, 247, 0.7);
        box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.2);
      }

      .aav-textarea::-webkit-scrollbar {
        width: 5px;
      }
      .aav-textarea::-webkit-scrollbar-track {
        background: transparent;
      }
      .aav-textarea::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.18);
        border-radius: 4px;
      }

      /* Textarea Meta Footer */
      .aav-textarea-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: #71717a;
        padding: 0 2px;
      }

      .aav-meta-counter {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px;
        color: #a1a1aa;
      }

      .aav-meta-hint {
        font-size: 10.5px;
        color: #71717a;
      }

      /* Action Buttons */
      .aav-actions-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 2px;
      }

      .aav-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        height: 38px;
        padding: 0 16px;
        border-radius: 9px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        border: none;
        outline: none;
        font-family: inherit;
        user-select: none;
      }

      .aav-btn-primary {
        background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
        color: #ffffff;
        flex: 1;
        box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);
      }

      .aav-btn-primary:hover {
        opacity: 0.95;
        box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
        transform: translateY(-1px);
      }

      .aav-btn-primary:active {
        transform: translateY(0);
      }

      .aav-btn-secondary {
        background: rgba(255, 255, 255, 0.08);
        color: #f4f4f5;
        border: 1px solid rgba(255, 255, 255, 0.14);
        padding: 0 16px;
      }

      .aav-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.14);
        border-color: rgba(255, 255, 255, 0.22);
      }

      @keyframes aav-card-pop {
        from { opacity: 0; transform: translateY(10px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;

    shadow.appendChild(style);

    const card = document.createElement('div');
    card.className = 'aav-card';

    const statusBadgeHtml = didAutoInsert
      ? `<span class="aav-badge-status inserted"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Auto-Injected</span>`
      : `<span class="aav-badge-status ready"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Ready to Insert</span>`;

    card.innerHTML = `
      <div class="aav-card-header" id="aav-header-drag">
        <div class="aav-header-left">
          <div class="aav-brand-row">
            <div class="aav-brand-icon-wrap">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z"></path>
              </svg>
            </div>
            <span>Gemini Vision AI</span>
          </div>
          ${statusBadgeHtml}
        </div>
        <div class="aav-header-right">
          <span class="aav-drag-hint" id="aav-drag-handle" title="Drag to reposition card">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
              <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
              <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
            </svg>
          </span>
          <button class="aav-close-btn" id="aav-btn-dismiss" title="Close (Esc)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div class="aav-question-box">
        <span class="aav-q-header">DETECTED QUESTION / CONTEXT</span>
        <div class="aav-q-content" title="${escapeHtml(question)}">${escapeHtml(question || "Detected question or form area")}</div>
      </div>

      <div class="aav-chips-bar">
        <button type="button" class="aav-chip" id="aav-chip-pitch" title="Insert Danish's complete profile & project pitch">
          <span>✨ Bio Pitch</span>
        </button>
        <button type="button" class="aav-chip" id="aav-chip-concise" title="Condense into 1-2 punchy sentences">
          <span>⚡ Concise</span>
        </button>
        <button type="button" class="aav-chip" id="aav-chip-skills" title="Insert technical skills list">
          <span>🛠️ Tech Stack</span>
        </button>
        <button type="button" class="aav-chip" id="aav-chip-projects" title="Insert Madina Perfumes & CodeRace projects">
          <span>🚀 Projects</span>
        </button>
      </div>

      <div class="aav-textarea-wrap">
        <textarea class="aav-textarea" id="aav-text-input" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false" placeholder="Gemini Vision generated response...">${escapeHtml(answer)}</textarea>
      </div>

      <div class="aav-textarea-meta">
        <span class="aav-meta-counter" id="aav-counter">0 chars • 0 words</span>
        <span class="aav-meta-hint">Esc to close • Alt+X to re-snip</span>
      </div>

      <div class="aav-actions-row">
        <button class="aav-btn aav-btn-primary" id="aav-btn-insert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span id="aav-insert-text">${didAutoInsert ? 'Re-Insert into Field' : 'Insert into Field'}</span>
        </button>
        <button class="aav-btn aav-btn-secondary" id="aav-btn-copy">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span id="aav-copy-text">Copy</span>
        </button>
      </div>
    `;

    shadow.appendChild(card);
    (document.body || document.documentElement).appendChild(hudHost);
    activeResultHudEl = hudHost;

    // Draggable Card functionality
    const dragHeader = shadow.getElementById('aav-header-drag');
    let isDraggingHud = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initHudX = 0;
    let initHudY = 0;

    const onDragStart = (e) => {
      if (e.target.closest('#aav-btn-dismiss')) return;
      isDraggingHud = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const b = hudHost.getBoundingClientRect();
      initHudX = b.left;
      initHudY = b.top;
      e.preventDefault();
    };

    dragHeader.addEventListener('mousedown', onDragStart);

    const onHudMouseMove = (e) => {
      if (!isDraggingHud) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      hudHost.style.left = `${Math.max(10, Math.min(window.innerWidth - 460, initHudX + dx))}px`;
      hudHost.style.top = `${Math.max(10, Math.min(window.innerHeight - 300, initHudY + dy))}px`;
    };

    const onHudMouseUp = () => {
      isDraggingHud = false;
    };

    window.addEventListener('mousemove', onHudMouseMove, true);
    window.addEventListener('mouseup', onHudMouseUp, true);

    activeHudCleanups.push(() => {
      window.removeEventListener('mousemove', onHudMouseMove, true);
      window.removeEventListener('mouseup', onHudMouseUp, true);
      dragHeader.removeEventListener('mousedown', onDragStart);
    });

    // Elements
    const textarea = shadow.getElementById('aav-text-input');
    const counterEl = shadow.getElementById('aav-counter');
    const insertBtn = shadow.getElementById('aav-btn-insert');
    const copyBtn = shadow.getElementById('aav-btn-copy');
    const copyText = shadow.getElementById('aav-copy-text');
    const dismissBtn = shadow.getElementById('aav-btn-dismiss');

    // Live Word/Char Counter
    function updateCounter() {
      const val = textarea.value || "";
      const trimmed = val.trim();
      const chars = val.length;
      const words = trimmed ? trimmed.split(/\s+/).length : 0;
      counterEl.textContent = `${chars} chars • ${words} words`;
    }
    textarea.addEventListener('input', updateCounter);
    updateCounter();

    // Quick Action Chips
    const chipPitch = shadow.getElementById('aav-chip-pitch');
    const chipConcise = shadow.getElementById('aav-chip-concise');
    const chipSkills = shadow.getElementById('aav-chip-skills');
    const chipProjects = shadow.getElementById('aav-chip-projects');

    chipPitch?.addEventListener('click', () => {
      textarea.value = "Mohammad Danish Khan | B.Tech in Artificial Intelligence (CGPA 7.79, 2022-2026) | Full-Stack Web Developer with 10-month internship at Meet Bros. Built production e-commerce platform Madina Perfumes (React, Supabase, Razorpay, Shiprocket) and CodeRace (live Supabase & PostgreSQL progress tracker). Proficient in React.js, Node.js, Express.js, MongoDB, TypeScript, Tailwind CSS, and Java.";
      updateCounter();
      textarea.focus();
    });

    chipConcise?.addEventListener('click', () => {
      textarea.value = "Full-Stack Web Developer proficient in React.js, Node.js, Express, MongoDB, and TypeScript, with 10 months internship experience building scalable production web applications.";
      updateCounter();
      textarea.focus();
    });

    chipSkills?.addEventListener('click', () => {
      textarea.value = "React.js, Node.js, Express.js, MongoDB, JavaScript, TypeScript, Tailwind CSS, Supabase, Next.js, Java, RESTful APIs, Git, PostgreSQL";
      updateCounter();
      textarea.focus();
    });

    chipProjects?.addEventListener('click', () => {
      textarea.value = "1. Madina Perfumes (madinaperfumes.in): Production e-commerce store with React, Vite, Supabase, Tailwind CSS, Razorpay payments, and Shiprocket API.\n2. CodeRace (coderace-danishkhan.vercel.app): Full-stack developer progress tracking platform with live Supabase & PostgreSQL leaderboards and streaks.";
      updateCounter();
      textarea.focus();
    });

    // Insert button click
    insertBtn.addEventListener('click', () => {
      const currentVal = textarea.value;
      let target = targetElement;

      // If no target pre-identified, check active element
      if (!target && document.activeElement && ['input', 'textarea'].includes((document.activeElement.tagName || '').toLowerCase())) {
        target = document.activeElement;
      }

      if (target) {
        if (typeof window.setNativeValue === 'function') {
          window.setNativeValue(target, currentVal);
        } else {
          target.value = currentVal;
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
        }
        showToast("✓ Injected into field!");
        dismissResultHud();
      } else {
        // Prompt user to click an input field
        showToast("Click any input field on the page to insert!");
        const oneTimeFocusHandler = (e) => {
          const clicked = e.target;
          if (clicked && ['input', 'textarea'].includes((clicked.tagName || '').toLowerCase())) {
            if (typeof window.setNativeValue === 'function') {
              window.setNativeValue(clicked, currentVal);
            } else {
              clicked.value = currentVal;
              clicked.dispatchEvent(new Event('input', { bubbles: true }));
              clicked.dispatchEvent(new Event('change', { bubbles: true }));
            }
            showToast("✓ Injected into field!");
            document.removeEventListener('focusin', oneTimeFocusHandler, true);
            dismissResultHud();
          }
        };
        document.addEventListener('focusin', oneTimeFocusHandler, true);
      }
    });

    // Copy button click - copies text and immediately closes HUD box
    copyBtn.addEventListener('click', async () => {
      const val = textarea.value;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(val);
        } else {
          textarea.select();
          document.execCommand('copy');
        }
        showToast("✓ Copied to clipboard!");
        dismissResultHud();
      } catch (err) {
        try {
          textarea.select();
          document.execCommand('copy');
          showToast("✓ Copied to clipboard!");
          dismissResultHud();
        } catch (copyErr) {
          showToast("Unable to copy to clipboard.");
        }
      }
    });

    // Dismiss button click
    dismissBtn.addEventListener('click', () => {
      dismissResultHud();
    });

    // Escape Keydown listener to close HUD
    const onHudKeydown = (e) => {
      if (e.key === 'Escape') {
        dismissResultHud();
      }
    };
    window.addEventListener('keydown', onHudKeydown, true);
    activeHudCleanups.push(() => {
      window.removeEventListener('keydown', onHudKeydown, true);
    });
  }

  function dismissResultHud() {
    while (activeHudCleanups.length > 0) {
      const cleanup = activeHudCleanups.pop();
      try { cleanup(); } catch (e) {}
    }
    if (activeResultHudEl && activeResultHudEl.parentNode) {
      activeResultHudEl.parentNode.removeChild(activeResultHudEl);
    }
    activeResultHudEl = null;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '28px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '8px';
    toast.style.background = '#14141c';
    toast.style.border = '1px solid rgba(139, 92, 246, 0.5)';
    toast.style.padding = '9px 20px';
    toast.style.borderRadius = '9999px';
    toast.style.color = '#c084fc';
    toast.style.fontSize = '12.5px';
    toast.style.fontWeight = '600';
    toast.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.65)';
    toast.style.zIndex = '2147483647';
    toast.style.pointerEvents = 'none';
    toast.textContent = message;

    (document.body || document.documentElement).appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, 10px)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2800);
  }

  // Global window export
  if (typeof window !== 'undefined') {
    window.activateVisualSnip = activateVisualSnip;
    window.deactivateVisualSnip = deactivateVisualSnip;
  }
})();
