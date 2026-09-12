/**
 * AutoApply Pro - Main Content Script Coordinator
 * Bridges DOM inspection, Profile data, and UI triggers.
 */

(async function initAutoApply() {
  console.log("[AutoApply Pro] Content script loaded on:", window.location.href);

  // 1. Fetch Candidate Profile from Storage / Background Worker
  let candidateProfile = typeof DEFAULT_PROFILE !== 'undefined' ? DEFAULT_PROFILE : null;

  try {
    const res = await new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: "GET_PROFILE" }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: true, profile: candidateProfile });
          } else {
            resolve(response || { success: true, profile: candidateProfile });
          }
        });
      } else {
        resolve({ success: true, profile: candidateProfile });
      }
    });

    if (res && res.success && res.profile) {
      candidateProfile = res.profile;
    }
  } catch (e) {
    console.warn("[AutoApply Pro] Using fallback default profile:", e);
  }

  if (!candidateProfile && typeof window.DEFAULT_PROFILE !== 'undefined') {
    candidateProfile = window.DEFAULT_PROFILE;
  }

  if (!candidateProfile) {
    console.error("[AutoApply Pro] Unable to load candidate profile.");
    return;
  }

  // 2. Handlers for Autofill Actions
  const handleAutofill = async () => {
    return await runAutoApply(candidateProfile, { aiAnswers: false });
  };

  const handleAiFill = async () => {
    return await runAutoApply(candidateProfile, { aiAnswers: true });
  };

  // 3. Initialize In-Field Quick Fill Popover (Floating bar removed per user request)
  const existingHud = document.getElementById('autoapply-pro-root');
  if (existingHud) existingHud.remove();

  if (typeof initFieldPopup === 'function') {
    initFieldPopup(candidateProfile);
  }

  // Listen for storage changes across tabs
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.floatingWidgetEnabled !== undefined) {
        const isEnabled = changes.floatingWidgetEnabled.newValue !== false;
        if (typeof window.setFieldPopupEnabled === 'function') {
          window.setFieldPopupEnabled(isEnabled);
        } else if (typeof window.hideFieldPopup === 'function' && !isEnabled) {
          window.hideFieldPopup();
        }
        const fieldRoot = document.getElementById('autoapply-field-popup-root');
        if (fieldRoot) {
          fieldRoot.style.display = isEnabled ? '' : 'none';
        }
      }
    });
  }

  // 4. Listen for Messages from Popup or Background
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "SET_WIDGET_VISIBILITY") {
        if (typeof window.setFieldPopupEnabled === 'function') {
          window.setFieldPopupEnabled(request.enabled);
        } else if (typeof window.hideFieldPopup === 'function' && !request.enabled) {
          window.hideFieldPopup();
        }
        const fieldRoot = document.getElementById('autoapply-field-popup-root');
        if (fieldRoot) {
          fieldRoot.style.display = request.enabled ? '' : 'none';
        }
        sendResponse({ success: true, enabled: request.enabled });
        return false;
      }

      if (request.action === "TRIGGER_AUTOFILL") {
        handleAutofill().then(res => sendResponse({ success: true, result: res })).catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }

      if (request.action === "TRIGGER_AI_FILL") {
        handleAiFill().then(res => sendResponse({ success: true, result: res })).catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }

      if (request.action === "TRIGGER_UPLOAD_RESUME") {
        if (typeof autoUploadResume === 'function') {
          autoUploadResume().then(res => sendResponse({ success: true, result: res })).catch(err => sendResponse({ success: false, error: err.message }));
          return true;
        } else {
          sendResponse({ success: false, error: "Resume uploader not loaded" });
          return false;
        }
      }

      if (request.action === "TRIGGER_SNIP_FILL") {
        if (typeof window.activateSnipSelector === 'function') {
          window.activateSnipSelector(candidateProfile);
        }
        sendResponse({ success: true });
        return false;
      }

      if (request.action === "GET_PAGE_STATUS") {
        const isEnabled = typeof window.isFieldPopupEnabled === 'function'
          ? window.isFieldPopupEnabled()
          : true;
        const currentMode = typeof window.getActivationMode === 'function'
          ? window.getActivationMode()
          : 'smart';

        let analysis = { isJobForm: false, platform: detectCurrentPlatform(), confidence: 0, fieldCount: 0 };
        const jd = typeof JobDetector !== 'undefined' ? JobDetector : (typeof window !== 'undefined' ? window.JobDetector : null);
        if (jd && typeof jd.analyzePage === 'function') {
          analysis = jd.analyzePage(document, window.location);
        }

        sendResponse({
          platform: analysis.platform || detectCurrentPlatform(),
          isJobForm: Boolean(analysis.isJobForm),
          confidence: analysis.confidence || 0,
          fieldCount: analysis.fieldCount || 0,
          reason: analysis.reason || '',
          url: window.location.href,
          title: document.title,
          widgetVisible: isEnabled,
          activationMode: currentMode
        });
        return false;
      }
    });
  }

  // 5. Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Alt + Shift + S: Snip & Fill Section
    if (e.altKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.activateSnipSelector === 'function') {
        window.activateSnipSelector(candidateProfile);
      }
      return;
    }

    // Alt + Shift + F: 1-Click Autofill Full Page
    if (e.altKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault();
      e.stopPropagation();
      handleAutofill();
      return;
    }
  }, true);

})();
