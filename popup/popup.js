/**
 * AutoApply Pro - Extension Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const platformEl = document.getElementById('detected-platform');
  const tagEl = document.getElementById('platform-tag');
  const autofillBtn = document.getElementById('btn-autofill');
  const aiBtn = document.getElementById('btn-ai-fill');
  const statusMsg = document.getElementById('status-message');
  const optionsBtn = document.getElementById('btn-open-options');
  const testsBtn = document.getElementById('btn-open-tests');
  const widgetToggle = document.getElementById('widget-toggle');
  const widgetPill = document.getElementById('floating-toggle-pill');
  const widgetStatusDot = document.getElementById('widget-status-dot');
  const widgetStatusText = document.getElementById('widget-status-text');

  // Helper to sync toggle UI
  function updateToggleUI(isEnabled) {
    if (!widgetToggle) return;
    widgetToggle.checked = isEnabled;
    if (isEnabled) {
      if (widgetStatusDot) widgetStatusDot.classList.remove('inactive');
      if (widgetStatusText) widgetStatusText.textContent = "Active";
      if (widgetPill) {
        widgetPill.classList.remove('inactive');
        widgetPill.title = "Floating Box: Active (Click to deactivate)";
      }
    } else {
      if (widgetStatusDot) widgetStatusDot.classList.add('inactive');
      if (widgetStatusText) widgetStatusText.textContent = "Inactive";
      if (widgetPill) {
        widgetPill.classList.add('inactive');
        widgetPill.title = "Floating Box: Inactive (Click to activate)";
      }
    }
  }

  // Load initial floating widget preference
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['floatingWidgetEnabled'], (data) => {
      const isEnabled = data.floatingWidgetEnabled !== false; // Default: true
      updateToggleUI(isEnabled);
    });
  }

  // Query Active Tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Floating Box Toggle Change Listener
  if (widgetToggle) {
    widgetToggle.addEventListener('change', () => {
      const isEnabled = widgetToggle.checked;
      updateToggleUI(isEnabled);

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ floatingWidgetEnabled: isEnabled });
      }

      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: "SET_WIDGET_VISIBILITY",
          enabled: isEnabled
        }, () => {
          if (chrome.runtime.lastError) {
            // Tab may not have content script loaded yet
          }
        });
      }

      if (statusMsg) {
        statusMsg.className = "status-message";
        statusMsg.textContent = isEnabled ? "Floating box activated on pages." : "Floating box deactivated.";
      }
    });
  }

  if (!tab || !tab.id) {
    platformEl.textContent = "No active tab";
    return;
  }

  // Ask content script for platform status
  chrome.tabs.sendMessage(tab.id, { action: "GET_PAGE_STATUS" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      platformEl.textContent = "Ready (Open any job form)";
      tagEl.textContent = "STANDBY";
      return;
    }

    platformEl.textContent = response.platform || "Standard Form";
    tagEl.textContent = (response.platform || "GENERIC").toUpperCase();
  });

  // Autofill Click
  autofillBtn.addEventListener('click', () => {
    autofillBtn.disabled = true;
    statusMsg.className = "status-message thinking";
    statusMsg.textContent = "⚡ Dispatching form autofill...";

    chrome.tabs.sendMessage(tab.id, { action: "TRIGGER_AUTOFILL" }, (res) => {
      autofillBtn.disabled = false;
      if (chrome.runtime.lastError) {
        statusMsg.className = "status-message";
        statusMsg.textContent = "Please reload the job page once to activate.";
        return;
      }

      if (res && res.success && res.result) {
        statusMsg.className = "status-message success";
        statusMsg.textContent = `✓ Filled ${res.result.filledCount} fields on ${res.result.platform}!`;
      } else {
        statusMsg.className = "status-message";
        statusMsg.textContent = res?.error || "Autofill completed.";
      }
    });
  });

  // AI Question Solver Click
  aiBtn.addEventListener('click', () => {
    aiBtn.disabled = true;
    statusMsg.className = "status-message thinking";
    statusMsg.textContent = "✨ Calling Gemini AI for custom essays...";

    chrome.tabs.sendMessage(tab.id, { action: "TRIGGER_AI_FILL" }, (res) => {
      aiBtn.disabled = false;
      if (chrome.runtime.lastError) {
        statusMsg.className = "status-message";
        statusMsg.textContent = "Please reload the job page once to activate.";
        return;
      }

      if (res && res.success && res.result) {
        statusMsg.className = "status-message success";
        statusMsg.textContent = `✓ Generated ${res.result.aiCount} tailored answers!`;
      } else {
        statusMsg.className = "status-message";
        statusMsg.textContent = res?.error || "AI generation completed.";
      }
    });
  });

  // Upload Resume Click
  const resumeBtn = document.getElementById('btn-upload-resume');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      resumeBtn.disabled = true;
      statusMsg.className = "status-message thinking";
      statusMsg.textContent = "Attaching DanishKhan_Resume.pdf...";

      chrome.tabs.sendMessage(tab.id, { action: "TRIGGER_UPLOAD_RESUME" }, (res) => {
        resumeBtn.disabled = false;
        if (chrome.runtime.lastError) {
          statusMsg.className = "status-message";
          statusMsg.textContent = "Please reload the job page once to activate.";
          return;
        }

        if (res && res.success && res.result && res.result.uploaded) {
          statusMsg.className = "status-message success";
          statusMsg.textContent = `✓ Attached ${res.result.filename || 'DanishKhan_Resume.pdf'}!`;
        } else {
          statusMsg.className = "status-message";
          statusMsg.textContent = res?.error || "No resume dropzone detected on this page.";
        }
      });
    });
  }

  // Open Options / Bio Manager
  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Open Test Suite
  testsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('test-page/index.html') });
  });
});
