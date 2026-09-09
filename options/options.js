/**
 * AutoApply Pro - Clean Google AI Studio Dashboard Controller
 */

let currentProfile = null;
let toastTimeout = null;

const PAGE_TITLES = {
  'tab-gemini': 'Gemini AI Settings',
  'tab-personal': 'Personal & Civil IDs',
  'tab-academics': 'Academic Records & Marks',
  'tab-career': 'Career & Compensation',
  'tab-projects': 'Projects & Resume'
};

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Sidebar Tab Switching
  const navItems = document.querySelectorAll('.studio-nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageTitleEl = document.getElementById('page-title');

  function switchTab(targetTabId) {
    navItems.forEach(item => {
      if (item.getAttribute('data-tab') === targetTabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    tabPanes.forEach(pane => {
      if (pane.id === targetTabId) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    if (pageTitleEl && PAGE_TITLES[targetTabId]) {
      pageTitleEl.textContent = PAGE_TITLES[targetTabId];
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });

  // 2. Prevent default form submit which would reload page
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveProfile();
    });
  }

  // 3. Load Bio Data & API Key
  await loadProfile();

  // 4. Bind Actions
  document.getElementById('btn-save-all').addEventListener('click', saveProfile);
  const resetBtn = document.getElementById('btn-reset-default');
  if (resetBtn) resetBtn.addEventListener('click', resetToDefaults);

  // Gemini API Key test & toggle
  document.getElementById('btn-test-key').addEventListener('click', testGeminiKey);
  const toggleKeyBtn = document.getElementById('btn-toggle-key');
  const keyInput = document.getElementById('gemini-api-key');
  const modelSelect = document.getElementById('gemini-model');
  const instructionsInput = document.getElementById('gemini-custom-instructions');

  toggleKeyBtn.addEventListener('click', () => {
    if (keyInput.type === 'password') {
      keyInput.type = 'text';
      toggleKeyBtn.textContent = 'Hide';
    } else {
      keyInput.type = 'password';
      toggleKeyBtn.textContent = 'Show';
    }
  });

  // Auto-persist API Key & AI settings in real-time as user types
  if (keyInput) {
    keyInput.addEventListener('input', () => {
      const val = keyInput.value.trim();
      try {
        localStorage.setItem('autoapply_gemini_api_key', val);
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ geminiApiKey: val });
        }
      } catch (e) {}
    });

    keyInput.addEventListener('change', async () => {
      await saveProfile(true);
    });
  }

  if (modelSelect) {
    modelSelect.addEventListener('change', async () => {
      await saveProfile(true);
    });
  }

  if (instructionsInput) {
    instructionsInput.addEventListener('change', async () => {
      await saveProfile(true);
    });
  }

  // Export & Import Profile JSON
  const exportBtn = document.getElementById('btn-export-profile');
  const importBtn = document.getElementById('btn-import-profile');
  const importPicker = document.getElementById('import-file-picker');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const data = extractFormData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AutoApply_Profile_${(data.personal?.firstName || 'Candidate').replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("✓ Profile exported successfully!");
    });
  }

  if (importBtn && importPicker) {
    importBtn.addEventListener('click', () => importPicker.click());
    importPicker.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const imported = JSON.parse(event.target.result);
            currentProfile = imported;
            populateForm(currentProfile);
            await saveProfile();
            showToast(`✓ Imported profile from ${file.name}!`);
          } catch (err) {
            showToast(`Import error: Invalid JSON file.`, "error");
          }
        };
        reader.readAsText(file);
      }
    });
  }
});

async function loadProfile() {
  let profile = null;
  let storedApiKey = '';

  // 1. Check chrome.storage.local
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const res = await chrome.storage.local.get(['candidateProfile', 'geminiApiKey']);
      profile = res.candidateProfile;
      storedApiKey = res.geminiApiKey || '';
    } catch (e) {
      console.warn("Error reading chrome.storage.local:", e);
    }
  }

  // 2. Check localStorage backup
  if (!profile) {
    try {
      const local = localStorage.getItem('candidateProfile');
      if (local) profile = JSON.parse(local);
    } catch (e) {}
  }

  if (!storedApiKey) {
    try {
      storedApiKey = localStorage.getItem('autoapply_gemini_api_key') || '';
    } catch (e) {}
  }

  // 3. Fallback to DEFAULT_PROFILE
  if (!profile && typeof DEFAULT_PROFILE !== 'undefined') {
    profile = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
  }

  // 4. Ensure gemini configuration and API key are guaranteed to be present
  if (profile) {
    profile.gemini = profile.gemini || {};
    
    // Fill API key if empty
    if (!profile.gemini.apiKey || profile.gemini.apiKey.trim() === '') {
      if (storedApiKey && storedApiKey.trim() !== '') {
        profile.gemini.apiKey = storedApiKey.trim();
      } else if (typeof DEFAULT_PROFILE !== 'undefined' && DEFAULT_PROFILE.gemini?.apiKey) {
        profile.gemini.apiKey = DEFAULT_PROFILE.gemini.apiKey;
      }
    }

    if (!profile.gemini.model) {
      profile.gemini.model = (typeof DEFAULT_PROFILE !== 'undefined' && DEFAULT_PROFILE.gemini?.model) 
        ? DEFAULT_PROFILE.gemini.model 
        : 'gemini-flash-lite-latest';
    }

    if (!profile.gemini.customInstructions) {
      profile.gemini.customInstructions = (typeof DEFAULT_PROFILE !== 'undefined' && DEFAULT_PROFILE.gemini?.customInstructions) 
        ? DEFAULT_PROFILE.gemini.customInstructions 
        : '';
    }
  }

  currentProfile = JSON.parse(JSON.stringify(profile || {}));
  populateForm(currentProfile);

  // 5. Ensure storage has the consolidated profile with the API key saved
  if (currentProfile && currentProfile.gemini?.apiKey) {
    try {
      localStorage.setItem('autoapply_gemini_api_key', currentProfile.gemini.apiKey);
      localStorage.setItem('candidateProfile', JSON.stringify(currentProfile));
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          candidateProfile: currentProfile,
          geminiApiKey: currentProfile.gemini.apiKey
        });
      }
    } catch (e) {}
  }
}

function populateForm(p) {
  if (!p) return;

  // Gemini Settings
  setVal('gemini-api-key', p.gemini?.apiKey || '');
  setVal('gemini-model', p.gemini?.model || 'gemini-flash-lite-latest');
  setVal('gemini-custom-instructions', p.gemini?.customInstructions || '');

  // Personal Info
  setVal('personal-fullName', p.personal?.fullName);
  setVal('personal-shortName', p.personal?.shortName);
  setVal('personal-firstName', p.personal?.firstName || "Mohammad Danish Khan");
  setVal('personal-middleName', p.personal?.middleName || "Khan");
  setVal('personal-lastName', p.personal?.lastName || "Naeem Khan");
  setVal('personal-gender', p.personal?.gender);
  setVal('personal-fatherName', p.personal?.fatherName);
  setVal('personal-motherName', p.personal?.motherName);
  setVal('personal-dob', p.personal?.dob);
  setVal('personal-email', p.personal?.email);
  setVal('personal-phone', p.personal?.phone);
  setVal('personal-phonePlain', p.personal?.phonePlain);

  // Civil Documents
  setVal('id-panNumber', p.identification?.panNumber);
  setVal('id-aadhaarNumber', p.identification?.aadhaarNumber);
  setVal('id-passportNumber', p.identification?.passportNumber);
  setVal('cred-password', p.credentials?.defaultPassword || p.personal?.password || 'Danishe@1257');

  // Address
  setVal('address-city', p.address?.city);
  setVal('address-state', p.address?.state);
  setVal('address-pincode', p.address?.pincode);
  setVal('address-fullAddress', p.address?.fullAddress);

  // Social Links
  setVal('links-linkedin', p.links?.linkedin);
  setVal('links-github', p.links?.github);
  setVal('links-portfolio', p.links?.portfolio);

  // Academics - B.Tech
  setVal('acad-grad-college', p.academics?.graduation?.collegeName);
  setVal('acad-grad-university', p.academics?.graduation?.university);
  setVal('acad-grad-degree', p.academics?.graduation?.degree);
  setVal('acad-grad-branch', p.academics?.graduation?.branch);
  setVal('acad-grad-cgpa', p.academics?.graduation?.cgpa);
  setVal('acad-grad-passingYear', p.academics?.graduation?.passingYear);
  setVal('acad-grad-prn', p.academics?.graduation?.prnNumber);
  setVal('acad-grad-backlogs', p.academics?.graduation?.activeBacklogs);

  // Academics - 12th
  setVal('acad-12-college', p.academics?.twelfth?.collegeName);
  setVal('acad-12-board', p.academics?.twelfth?.board);
  setVal('acad-12-percentage', p.academics?.twelfth?.percentage);
  setVal('acad-12-year', p.academics?.twelfth?.passingYear);

  // Academics - 10th
  setVal('acad-10-school', p.academics?.tenth?.schoolName);
  setVal('acad-10-board', p.academics?.tenth?.board);
  setVal('acad-10-percentage', p.academics?.tenth?.percentage);
  setVal('acad-10-year', p.academics?.tenth?.passingYear);

  // Career & CTC
  setVal('career-currentCtc', p.career?.currentCtcLpa);
  setVal('career-expectedCtc', p.career?.expectedCtcLpa);
  setVal('career-noticePeriod', p.career?.noticePeriodString || 'Immediate (0 Days)');
  setVal('career-totalExp', p.career?.totalExperienceYears);
  setVal('career-currentCompany', p.career?.currentCompany);
  setVal('career-currentRole', p.career?.currentRole);

  // Skill Years Matrix
  const skillContainer = document.getElementById('skill-years-container');
  if (skillContainer && p.skillYears) {
    skillContainer.innerHTML = '';
    for (const [skill, yrs] of Object.entries(p.skillYears)) {
      const div = document.createElement('div');
      div.className = 'field-item';
      div.innerHTML = `
        <label>${skill.toUpperCase()}</label>
        <input type="number" class="studio-input font-mono skill-year-input" data-skill="${skill}" value="${yrs}" min="0" max="20">
      `;
      skillContainer.appendChild(div);
    }
  }

  // Master Resume Text
  setVal('master-resume-text', p.masterResumeText || '');

  // Resume File Info
  const resumeInfo = p.resume || (typeof RESUME_DATA !== 'undefined' ? RESUME_DATA : null);
  if (resumeInfo) {
    const nameEl = document.getElementById('resume-display-name');
    const sizeEl = document.getElementById('resume-display-size');
    if (nameEl && resumeInfo.filename) nameEl.textContent = resumeInfo.filename;
    if (sizeEl && resumeInfo.sizeBytes) {
      sizeEl.textContent = `${(resumeInfo.sizeBytes / 1024).toFixed(1)} KB • PDF • Ready for Auto-Upload`;
    }
  }
}

function extractFormData() {
  const p = JSON.parse(JSON.stringify(currentProfile || (typeof DEFAULT_PROFILE !== 'undefined' ? DEFAULT_PROFILE : {})));

  // Gemini
  p.gemini = p.gemini || {};
  p.gemini.apiKey = getVal('gemini-api-key').trim();
  p.gemini.model = getVal('gemini-model') || 'gemini-flash-lite-latest';
  p.gemini.customInstructions = getVal('gemini-custom-instructions');

  // Personal
  p.personal = p.personal || {};
  p.personal.fullName = getVal('personal-fullName');
  p.personal.shortName = getVal('personal-shortName');
  p.personal.firstName = getVal('personal-firstName') || "Mohammad Danish Khan";
  p.personal.middleName = getVal('personal-middleName') || "Khan";
  p.personal.lastName = getVal('personal-lastName') || "Naeem Khan";
  p.personal.gender = getVal('personal-gender');
  p.personal.fatherName = getVal('personal-fatherName');
  p.personal.motherName = getVal('personal-motherName');
  p.personal.dob = getVal('personal-dob');
  p.personal.email = getVal('personal-email');
  p.personal.phone = getVal('personal-phone');
  p.personal.phonePlain = getVal('personal-phonePlain');

  // Civil Documents & Credentials
  p.identification = p.identification || {};
  p.identification.panNumber = getVal('id-panNumber');
  p.identification.aadhaarNumber = getVal('id-aadhaarNumber');
  p.identification.passportNumber = getVal('id-passportNumber');
  p.credentials = p.credentials || {};
  p.credentials.defaultPassword = getVal('cred-password');
  p.personal.password = getVal('cred-password');

  // Address
  p.address = p.address || {};
  p.address.city = getVal('address-city');
  p.address.state = getVal('address-state');
  p.address.pincode = getVal('address-pincode');
  p.address.fullAddress = getVal('address-fullAddress');

  // Social Links
  p.links = p.links || {};
  p.links.linkedin = getVal('links-linkedin');
  p.links.github = getVal('links-github');
  p.links.portfolio = getVal('links-portfolio');

  // Academics - B.Tech
  p.academics = p.academics || {};
  p.academics.graduation = p.academics.graduation || {};
  p.academics.graduation.collegeName = getVal('acad-grad-college');
  p.academics.graduation.university = getVal('acad-grad-university');
  p.academics.graduation.degree = getVal('acad-grad-degree');
  p.academics.graduation.branch = getVal('acad-grad-branch');
  p.academics.graduation.cgpa = getVal('acad-grad-cgpa');
  p.academics.graduation.passingYear = getVal('acad-grad-passingYear');
  p.academics.graduation.prnNumber = getVal('acad-grad-prn');
  p.academics.graduation.activeBacklogs = getVal('acad-grad-backlogs');

  // Academics - 12th
  p.academics.twelfth = p.academics.twelfth || {};
  p.academics.twelfth.collegeName = getVal('acad-12-college');
  p.academics.twelfth.board = getVal('acad-12-board');
  p.academics.twelfth.percentage = getVal('acad-12-percentage');
  p.academics.twelfth.passingYear = getVal('acad-12-year');

  // Academics - 10th
  p.academics.tenth = p.academics.tenth || {};
  p.academics.tenth.schoolName = getVal('acad-10-school');
  p.academics.tenth.board = getVal('acad-10-board');
  p.academics.tenth.percentage = getVal('acad-10-percentage');
  p.academics.tenth.passingYear = getVal('acad-10-year');

  // Career
  p.career = p.career || {};
  p.career.currentCtcLpa = getVal('career-currentCtc');
  p.career.expectedCtcLpa = getVal('career-expectedCtc');
  p.career.noticePeriodString = getVal('career-noticePeriod');
  p.career.totalExperienceYears = getVal('career-totalExp');
  p.career.currentCompany = getVal('career-currentCompany');
  p.career.currentRole = getVal('career-currentRole');

  // Skill years
  p.skillYears = p.skillYears || {};
  document.querySelectorAll('.skill-year-input').forEach(input => {
    const skill = input.getAttribute('data-skill');
    if (skill) {
      p.skillYears[skill] = parseInt(input.value, 10) || 0;
    }
  });

  // Master Resume
  p.masterResumeText = getVal('master-resume-text');

  return p;
}

async function saveProfile(silent = false) {
  const updated = extractFormData();
  currentProfile = updated;
  const apiKey = updated.gemini?.apiKey || '';

  // 1. Chrome storage save
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      await chrome.storage.local.set({ 
        candidateProfile: updated,
        geminiApiKey: apiKey
      });
    } catch (e) {
      console.warn("Storage save error:", e);
    }
  }

  // 2. localStorage backup save
  try {
    localStorage.setItem('candidateProfile', JSON.stringify(updated));
    if (apiKey) {
      localStorage.setItem('autoapply_gemini_api_key', apiKey);
    }
  } catch (e) {}

  if (!silent) {
    showToast("✓ Changes saved successfully!", "success");
  }
}

function resetToDefaults() {
  if (confirm("Reset all credentials to verified defaults from bio.txt?")) {
    currentProfile = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    populateForm(currentProfile);
    saveProfile();
    showToast("Restored verified details for Mohammad Danish Khan from bio.txt", "success");
  }
}

async function testGeminiKey() {
  const key = getVal('gemini-api-key').trim();
  const model = getVal('gemini-model') || 'gemini-flash-lite-latest';
  const box = document.getElementById('gemini-test-result');

  if (!key) {
    box.className = 'console-box error';
    box.textContent = '> [ERROR]: Please enter an API key first.';
    return;
  }

  box.className = 'console-box';
  box.textContent = `> Calling Google Generative Language API (${model})...`;

  try {
    const res = await new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: "TEST_GEMINI_KEY",
          payload: { apiKey: key, model }
        }, resolve);
      } else {
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'OK' }] }] })
        }).then(r => r.ok ? resolve({ success: true, message: `Connected! HTTP ${r.status}` }) : resolve({ success: false, message: `HTTP ${r.status}` }))
        .catch(err => resolve({ success: false, message: err.message }));
      }
    });

    if (res && res.success) {
      box.className = 'console-box success';
      box.textContent = `> [SUCCESS]: ${res.message || 'Gemini Flash connection verified.'}`;
      // CRITICAL: Auto-save on successful test so it immediately persists!
      await saveProfile(true);
      showToast("✓ API Key verified & saved permanently!", "success");
    } else {
      box.className = 'console-box error';
      box.textContent = `> [FAILED]: ${res?.message || 'Check your Gemini API key.'}`;
    }
  } catch (e) {
    box.className = 'console-box error';
    box.textContent = `> [ERROR]: ${e.message}`;
  }
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val !== undefined && val !== null ? val : '';
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function showToast(msg, type = "success") {
  const banner = document.getElementById('toast-banner');
  if (!banner) return;
  banner.textContent = msg;
  banner.className = `studio-toast ${type}`;
  banner.style.display = 'block';
  banner.style.opacity = '1';

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastTimeout = setTimeout(() => {
    banner.style.opacity = '0';
    setTimeout(() => {
      banner.style.display = 'none';
    }, 300);
  }, 3500);
}
