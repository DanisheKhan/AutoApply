/**
 * AutoApply Pro - Background Service Worker (Manifest V3)
 * Manages profile initialization, messaging bus, and secure Gemini API requests.
 */

try {
  importScripts('../default-profile.js', 'gemini-client.js');
} catch (e) {
  console.error("Error importing scripts in service worker:", e);
}

function normalizeCandidateProfile(profile) {
  if (!profile || typeof profile !== 'object') return profile;
  
  if (!profile.personal) profile.personal = {};
  
  // Legacy migration for 2-field vs 3-field name
  if (profile.personal.lastName === "Khan" || !profile.personal.lastName) {
    profile.personal.lastName = "Naeem Khan";
  }
  if (!profile.personal.firstName2Field) {
    profile.personal.firstName2Field = "Mohammad Danish Khan";
  }
  if (!profile.personal.firstName3Field) {
    profile.personal.firstName3Field = "Mohammad Danish";
  }
  if (!profile.personal.middleName) {
    profile.personal.middleName = "Khan";
  }
  if (profile.personal.firstName === "Mohammad Danish" || !profile.personal.firstName) {
    profile.personal.firstName = "Mohammad Danish Khan";
  }
  if (!profile.personal.phonePlain) {
    profile.personal.phonePlain = "9322990946";
  }

  return profile;
}

// 1. Extension Lifecycle: Install & Seed Default Bio-Data
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("AutoApply Pro installed/updated:", details.reason);

  const data = await chrome.storage.local.get(['candidateProfile', 'geminiApiKey']);
  let profile = data.candidateProfile;
  if (!profile && typeof DEFAULT_PROFILE !== 'undefined') {
    profile = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    await chrome.storage.local.set({ 
      candidateProfile: profile,
      geminiApiKey: profile.gemini?.apiKey || ''
    });
    console.log("Seeded master bio-data for Mohammad Danish Khan into chrome.storage.local");
  } else if (profile && typeof DEFAULT_PROFILE !== 'undefined') {
    profile = normalizeCandidateProfile(profile);
    // Backfill any missing gemini key
    if (!profile.gemini || !profile.gemini.apiKey || profile.gemini.apiKey.trim() === '') {
      profile.gemini = profile.gemini || {};
      profile.gemini.apiKey = data.geminiApiKey || DEFAULT_PROFILE.gemini?.apiKey || '';
      profile.gemini.model = profile.gemini.model || DEFAULT_PROFILE.gemini?.model || 'gemini-flash-lite-latest';
    }
    await chrome.storage.local.set({ candidateProfile: profile });
  }
});

// 2. Messaging Dispatcher between Content Scripts, Popup, Options, and Gemini API
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, payload } = message || {};

  if (action === "GET_PROFILE") {
    chrome.storage.local.get(['candidateProfile', 'geminiApiKey']).then((res) => {
      let p = res.candidateProfile;
      if (!p && typeof DEFAULT_PROFILE !== 'undefined') {
        p = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
      } else if (p && typeof DEFAULT_PROFILE !== 'undefined') {
        p = normalizeCandidateProfile(p);
        p.gemini = p.gemini || {};
        if (!p.gemini.apiKey || p.gemini.apiKey.trim() === '') {
          p.gemini.apiKey = res.geminiApiKey || DEFAULT_PROFILE.gemini?.apiKey || '';
        }
      }
      sendResponse({ success: true, profile: p || DEFAULT_PROFILE });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep channel open for async response
  }

  if (action === "SAVE_PROFILE") {
    const geminiKey = payload?.gemini?.apiKey || '';
    chrome.storage.local.set({ 
      candidateProfile: payload,
      geminiApiKey: geminiKey
    }).then(() => {
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (action === "TEST_GEMINI_KEY") {
    const { apiKey, model } = payload || {};
    testGeminiApiKey(apiKey, model).then((result) => {
      sendResponse(result);
    }).catch((err) => {
      sendResponse({ success: false, message: err.message });
    });
    return true;
  }

  if (action === "GENERATE_AI_ANSWER") {
    chrome.storage.local.get(['candidateProfile']).then(async (res) => {
      const profile = res.candidateProfile || DEFAULT_PROFILE;
      try {
        const answer = await generateAnswerWithGemini(payload, profile);
        sendResponse({ success: true, answer });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (action === "INFER_FIELD_AI") {
    chrome.storage.local.get(['candidateProfile']).then(async (res) => {
      const profile = res.candidateProfile || DEFAULT_PROFILE;
      try {
        const answer = await inferFieldWithGemini(payload, profile);
        sendResponse({ success: true, answer });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (action === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return false;
  }
});
