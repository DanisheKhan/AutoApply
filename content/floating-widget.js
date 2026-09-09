/**
 * In-Page Floating Action Widget for AutoApply Pro
 * Injected into a Closed Shadow DOM for complete CSS isolation.
 * Styled with the exact Google AI Studio Dark Theme system.
 */

function mountFloatingWidget(profile, onAutofillClick, onAiFillClick) {
  if (document.getElementById('autoapply-pro-root')) return;

  const host = document.createElement('div');
  host.id = 'autoapply-pro-root';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  // Inject Google Sans and Theme styles directly into Shadow Root
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap');

    :host {
      all: initial;
      font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      color: #e3e3e3;
      z-index: 2147483647;
      position: fixed;
      bottom: 24px;
      right: 24px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    .aap-widget {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(30, 31, 32, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid #37393b;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04);
      padding: 6px 10px 6px 14px;
      border-radius: 9999px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    }
    .aap-widget:hover {
      border-color: #4a4d51;
      box-shadow: 0 10px 36px rgba(0, 0, 0, 0.75), 0 0 16px rgba(168, 199, 250, 0.15);
    }
    .aap-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .aap-sparkle {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
    .aap-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #6dd58c;
      box-shadow: 0 0 6px rgba(109, 213, 140, 0.6);
      animation: aap-pulse 2s infinite;
      flex-shrink: 0;
    }
    .aap-status-dot.thinking {
      background: #a8c7fa;
      box-shadow: 0 0 8px rgba(168, 199, 250, 0.8);
    }
    @keyframes aap-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.9); }
    }
    .aap-title {
      font-weight: 600;
      font-size: 12.5px;
      color: #e3e3e3;
      letter-spacing: -0.01em;
    }
    .aap-platform-badge {
      font-size: 10px;
      font-family: 'Roboto Mono', ui-monospace, monospace;
      background: #131314;
      border: 1px solid #37393b;
      color: #c4c7c5;
      padding: 2px 7px;
      border-radius: 6px;
      font-weight: 500;
    }
    .aap-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: 2px;
    }
    .aap-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 9999px;
      padding: 5px 13px;
      font-size: 12px;
      font-family: inherit;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    /* Primary 1-Click Autofill: Minimal Surface */
    .aap-btn-primary {
      background-color: rgba(255, 255, 255, 0.1);
      color: #f4f4f5;
      border: 1px solid rgba(255, 255, 255, 0.2);
      font-weight: 550;
    }
    .aap-btn-primary:hover {
      background-color: rgba(255, 255, 255, 0.16);
      border-color: rgba(255, 255, 255, 0.3);
    }
    .aap-btn-primary:active {
      background-color: rgba(255, 255, 255, 0.22);
    }
    /* AI Essay Solver: Minimal Surface */
    .aap-btn-ai {
      background-color: rgba(255, 255, 255, 0.04);
      color: #d4d4d8;
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-weight: 500;
    }
    .aap-btn-ai:hover {
      background-color: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.16);
    }
    .aap-btn-ai:active {
      background-color: rgba(255, 255, 255, 0.12);
    }
    /* Icon Buttons: Minimal circular styling */
    .aap-btn-icon {
      width: 28px;
      height: 28px;
      padding: 0;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #a1a1aa;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .aap-btn-icon:hover {
      background-color: rgba(255, 255, 255, 0.08);
      color: #f4f4f5;
      border-color: rgba(255, 255, 255, 0.16);
    }
    .aap-toast {
      position: absolute;
      bottom: calc(100% + 10px);
      right: 0;
      background: #18181b;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 11.5px;
      color: #f4f4f5;
      font-weight: 450;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
      white-space: nowrap;
    }
    .aap-toast.show { opacity: 1; }
    .aap-toast.thinking {
      color: #d4d4d8;
      border-color: rgba(255, 255, 255, 0.2);
    }
    .aap-toast.success {
      color: #4ade80;
      border-color: rgba(74, 222, 128, 0.25);
    }
    .aap-toast.error {
      color: #f87171;
      border-color: rgba(248, 113, 113, 0.25);
    }
    .aap-collapsed {
      padding: 6px 12px;
    }
    .aap-collapsed .aap-actions,
    .aap-collapsed .aap-platform-badge {
      display: none;
    }
  `;
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.className = 'aap-widget';

  const platform = typeof detectCurrentPlatform === 'function' ? detectCurrentPlatform() : 'Detected';

  container.innerHTML = `
    <div class="aap-brand" title="AutoApply Pro">
      <span class="aap-status-dot" id="aap-dot"></span>
      <svg class="aap-sparkle" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" fill="url(#aap-sp-grad)" />
        <defs>
          <linearGradient id="aap-sp-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFFFFF" />
            <stop offset="1" stop-color="#A1A1AA" />
          </linearGradient>
        </defs>
      </svg>
      <span class="aap-title">AutoApply</span>
      <span class="aap-platform-badge">${platform}</span>
    </div>
    <div class="aap-actions">
      <button class="aap-btn aap-btn-primary" id="aap-fill-btn" title="Autofill standard fields (Alt+Shift+F)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <span>Autofill</span>
      </button>
      <button class="aap-btn aap-btn-ai" id="aap-ai-btn" title="Answer open-ended essay questions with Gemini AI">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z"/></svg>
        <span>AI Fill</span>
      </button>
      <button class="aap-btn-icon" id="aap-settings-btn" title="Open Bio-Data & Settings">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
      </button>
      <button class="aap-btn-icon" id="aap-toggle-btn" title="Minimize">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
    </div>
    <div class="aap-toast" id="aap-toast"></div>
  `;

  shadow.appendChild(container);

  const fillBtn = shadow.getElementById('aap-fill-btn');
  const aiBtn = shadow.getElementById('aap-ai-btn');
  const settingsBtn = shadow.getElementById('aap-settings-btn');
  const toggleBtn = shadow.getElementById('aap-toggle-btn');
  const brand = shadow.querySelector('.aap-brand');
  const dot = shadow.getElementById('aap-dot');
  const toast = shadow.getElementById('aap-toast');

  function showToast(msg, isThinking = false, duration = 3000) {
    toast.textContent = msg;
    let typeClass = '';
    if (isThinking) {
      typeClass = 'thinking';
    } else if (msg.toLowerCase().includes('error')) {
      typeClass = 'error';
    } else if (msg.includes('✓')) {
      typeClass = 'success';
    }
    toast.className = `aap-toast show ${typeClass}`.trim();
    if (!isThinking) {
      setTimeout(() => {
        toast.className = 'aap-toast';
      }, duration);
    }
  }

  // Trigger Autofill
  fillBtn.addEventListener('click', async () => {
    fillBtn.disabled = true;
    showToast("Autofilling fields...", true);
    try {
      const result = await onAutofillClick();
      if (!result) {
        showToast("Autofill completed.");
        return;
      }
      let msg = `✓ Filled ${result.filledCount || 0} fields!`;
      if (result.resumeUploaded) {
        msg = (result.filledCount || 0) > 0 
          ? `✓ Filled ${result.filledCount} fields + Attached Resume!`
          : `✓ Attached ${result.resumeFilename || 'DanishKhan_Resume.pdf'}!`;
      }
      showToast(msg);
    } catch (e) {
      showToast(`Error: ${e.message}`);
    } finally {
      fillBtn.disabled = false;
    }
  });

  // Trigger AI Custom Answering
  aiBtn.addEventListener('click', async () => {
    aiBtn.disabled = true;
    dot.className = 'aap-status-dot thinking';
    showToast("✨ Gemini AI drafting answers...", true);
    try {
      const result = await onAiFillClick();
      showToast(`✓ AI drafted ${result.aiCount} custom answers!`);
    } catch (e) {
      showToast(`AI Error: ${e.message}`);
    } finally {
      dot.className = 'aap-status-dot';
      aiBtn.disabled = false;
    }
  });

  // Settings
  settingsBtn.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: "OPEN_OPTIONS" });
    } else {
      window.open('/options/options.html', '_blank');
    }
  });

  // Minimize / Expand
  let isCollapsed = false;
  const toggleCollapse = () => {
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
      container.classList.add('aap-collapsed');
      toggleBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    } else {
      container.classList.remove('aap-collapsed');
      toggleBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    }
  };

  toggleBtn.addEventListener('click', toggleCollapse);
  brand.addEventListener('click', () => {
    if (isCollapsed) toggleCollapse();
  });

  // Hotkey: Alt + Shift + F
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault();
      fillBtn.click();
    }
  });

  // Dynamic platform badge update on tab switch
  const platformBadge = shadow.querySelector('.aap-platform-badge');
  const updateBadge = () => {
    if (platformBadge && typeof detectCurrentPlatform === 'function') {
      platformBadge.textContent = detectCurrentPlatform();
    }
  };

  window.addEventListener('autoapply:tabswitched', updateBadge);
  if (typeof window !== 'undefined') {
    window.updateFloatingWidgetPlatform = updateBadge;
  }

  return { showToast, updateBadge };
}

if (typeof window !== 'undefined') {
  window.mountFloatingWidget = mountFloatingWidget;
}
