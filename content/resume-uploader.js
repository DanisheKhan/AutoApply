/**
 * AutoApply Pro - Automated Resume & Document Uploader
 * Converts bundled DanishKhan_Resume.pdf into a live browser File object and attaches
 * it to job portal file inputs and drag-and-drop zones (SmartRecruiters, Greenhouse, Lever, Workday, etc.)
 */

function createResumeFileFromBase64() {
  try {
    if (typeof RESUME_DATA !== 'undefined' && RESUME_DATA.base64) {
      const binaryString = atob(RESUME_DATA.base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: RESUME_DATA.mimeType || 'application/pdf' });
      return new File([blob], RESUME_DATA.filename || 'DanishKhan_Resume.pdf', {
        type: RESUME_DATA.mimeType || 'application/pdf',
        lastModified: Date.now()
      });
    }
  } catch (err) {
    console.error('[AutoApply Pro] Failed to create resume File from Base64:', err);
  }
  return null;
}

async function getResumeFile() {
  // 1. Check custom uploaded resume in chrome.storage.local / active profile
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const data = await new Promise((resolve) => {
        chrome.storage.local.get(['customResumeData', 'candidateProfile'], resolve);
      });
      const customResume = data?.customResumeData || data?.candidateProfile?.resume;
      if (customResume && customResume.base64) {
        const binaryString = atob(customResume.base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: customResume.mimeType || 'application/pdf' });
        return new File([blob], customResume.filename || 'DanishKhan_Resume.pdf', {
          type: customResume.mimeType || 'application/pdf',
          lastModified: Date.now()
        });
      }
    } catch (e) {
      console.warn('[AutoApply Pro] Error reading custom resume from storage:', e);
    }
  }

  // 2. Try instant Base64 file creation from bundled RESUME_DATA
  const file = createResumeFileFromBase64();
  if (file) return file;

  // 3. Fallback: Fetch via Chrome Extension URL
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    try {
      const url = chrome.runtime.getURL('assets/DanishKhan_Resume.pdf');
      const response = await fetch(url);
      const blob = await response.blob();
      return new File([blob], 'DanishKhan_Resume.pdf', {
        type: 'application/pdf',
        lastModified: Date.now()
      });
    } catch (e) {
      console.warn('[AutoApply Pro] Could not fetch extension asset resume:', e);
    }
  }

  return null;
}

/**
 * Finds resume file inputs or drop zones and uploads DanishKhan_Resume.pdf
 * @returns {Promise<{ uploaded: boolean, filename: string, count: number }>}
 */
/**
 * Detects whether an element or its container represents a Cover Letter upload or input.
 * Used to strictly prevent DanishKhan_Resume.pdf from being attached to Cover Letter fields.
 * @param {Element} element
 * @returns {boolean}
 */
function isCoverLetterTarget(element) {
  if (!element) return false;
  const id = (element.id || '').toLowerCase();
  const name = (element.name || '').toLowerCase();
  const aria = (element.getAttribute?.('aria-label') || element.getAttribute?.('aria-labelledby') || '').toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  const className = (typeof element.className === 'string' ? element.className : '').toLowerCase();

  const container = (element.closest && typeof element.closest === 'function')
    ? element.closest('label, div[class*="upload"], div[class*="drop"], div[class*="file"], div[class*="document"], div[class*="cover"], div[role="listitem"], .gf-listitem, .form-group, .field, section, fieldset, tr')
    : element.parentElement;
  const containerText = container ? (container.innerText || container.textContent || '').toLowerCase() : '';

  const pattern = /\b(cover[_\s-]?letter|motivation[_\s-]?letter|letter[_\s-]?of[_\s-]?motivation|statement[_\s-]?of[_\s-]?purpose|\bsop\b|personal[_\s-]?statement)\b/i;

  return pattern.test(id) ||
         pattern.test(name) ||
         pattern.test(aria) ||
         pattern.test(placeholder) ||
         pattern.test(className) ||
         pattern.test(containerText);
}

/**
 * Detects whether an element or container is specifically a Resume / CV upload field.
 * Strictly distinguishes Resume fields from Cover Letters, general file attachments,
 * photos, and AI assistant prompt file uploaders (e.g. ChatGPT, Claude).
 * @param {Element} element
 * @returns {boolean}
 */
function isResumeTarget(element) {
  if (!element) return false;
  if (isCoverLetterTarget(element)) return false;

  const id = (element.id || '').toLowerCase();
  const name = (element.name || '').toLowerCase();
  const aria = (element.getAttribute?.('aria-label') || element.getAttribute?.('aria-labelledby') || '').toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  const title = (element.title || element.getAttribute?.('title') || '').toLowerCase();
  const testId = (element.getAttribute?.('data-testid') || element.getAttribute?.('data-qa') || element.getAttribute?.('data-automation-id') || '').toLowerCase();
  const className = (typeof element.className === 'string' ? element.className : '').toLowerCase();

  // Explicit negative check: photos, avatars, headshots, invoices, videos, audio
  if (/\b(photo|avatar|profile[_\s-]?pic|picture|headshot|logo|invoice|receipt|video|audio)\b/i.test(id + ' ' + name + ' ' + aria + ' ' + className + ' ' + testId)) {
    return false;
  }

  // 1. Direct attribute match for Resume / CV
  const resumeStrictRegex = /\b(resume|cv\b|curriculum[_\s-]?vitae|biodata)\b/i;
  if (resumeStrictRegex.test(id) || resumeStrictRegex.test(name) || resumeStrictRegex.test(aria) || resumeStrictRegex.test(title) || resumeStrictRegex.test(testId) || resumeStrictRegex.test(placeholder)) {
    return true;
  }

  // 2. Class name check with resume
  if (/\b(resume|cv)[_\s-]?upload|upload[_\s-]?(resume|cv)|resume[_\s-]?drop|drop[_\s-]?resume\b/i.test(className)) {
    return true;
  }

  // 3. Container / Label context check (walk up nearest upload container)
  const container = (element.closest && typeof element.closest === 'function')
    ? element.closest('label, div[class*="upload"], div[class*="drop"], div[class*="file"], div[role="listitem"], .gf-listitem, .form-group, .field, section, fieldset, tr')
    : element.parentElement;
  
  if (container) {
    const containerText = (container.innerText || container.textContent || '').slice(0, 500).toLowerCase();
    if (resumeStrictRegex.test(containerText)) {
      return true;
    }
  }

  // 4. Preceding sibling check
  const prevSibling = element.previousElementSibling;
  if (prevSibling) {
    const prevText = (prevSibling.innerText || prevSibling.textContent || '').slice(0, 150).toLowerCase();
    if (resumeStrictRegex.test(prevText)) {
      return true;
    }
  }

  return false;
}

/**
 * Finds resume file inputs or drop zones and uploads DanishKhan_Resume.pdf
 * Strictly excludes any Cover Letter inputs and verifies authentic Resume targets.
 * If targetElement is provided, uploads specifically to that target without affecting others.
 * @param {Element} [targetElement=null] - Optional specific field/dropzone to attach to
 * @returns {Promise<{ uploaded: boolean, filename: string, count: number }>}
 */
async function autoUploadResume(targetElement = null) {
  // Domain guard: Never upload resume on ChatGPT, Claude, social, etc.
  if (typeof isExcludedDomain === 'function' && isExcludedDomain()) {
    console.log('[AutoApply Pro] autoUploadResume skipped: active site is excluded.');
    return { uploaded: false, filename: '', count: 0 };
  }

  const resumeFile = await getResumeFile();
  if (!resumeFile) {
    console.warn('[AutoApply Pro] Resume file not available for auto-upload.');
    return { uploaded: false, filename: '', count: 0 };
  }

  // Strict Resume and Cover Letter Gate: MUST be a verified resume target and NEVER Cover Letter
  if (targetElement) {
    if (isCoverLetterTarget(targetElement)) {
      console.log('[AutoApply Pro] Target is Cover Letter; strictly skipping resume PDF attachment.');
      return { uploaded: false, filename: '', count: 0 };
    }
    if (!isResumeTarget(targetElement)) {
      console.log('[AutoApply Pro] Target is not a verified Resume/CV upload field; skipping attachment.');
      return { uploaded: false, filename: '', count: 0 };
    }
  }

  let uploadedCount = 0;
  const dt = new DataTransfer();
  dt.items.add(resumeFile);

  // A. Scoped Direct Upload to specific targetElement
  if (targetElement) {
    const input = targetElement.tagName?.toLowerCase() === 'input' && targetElement.type === 'file'
      ? targetElement
      : (targetElement.querySelector ? targetElement.querySelector('input[type="file"]') : null);

    if (input && !isCoverLetterTarget(input)) {
      try {
        input.files = dt.files;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        uploadedCount++;
      } catch (e) {}
    }

    const dropZone = (targetElement.closest && typeof targetElement.closest === 'function')
      ? (targetElement.closest('[class*="dropzone"], [class*="drop"], [class*="upload"], label, .file-input-wrapper, [class*="resume"], div[role="listitem"], .gf-listitem, .gf-file-upload-container') || targetElement)
      : targetElement;

    if (dropZone && !isCoverLetterTarget(dropZone)) {
      try {
        const dragEnter = new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt });
        const dragOver = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt });
        const drop = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });

        dropZone.dispatchEvent(dragEnter);
        dropZone.dispatchEvent(dragOver);
        dropZone.dispatchEvent(drop);
      } catch (de) {}

      const tag = dropZone.querySelector ? dropZone.querySelector('.gf-uploaded-file-tag, [class*="file-name"], [class*="uploaded-file"]') : null;
      const filenameSpan = dropZone.querySelector ? dropZone.querySelector('.gf-uploaded-filename, [class*="file-name-text"]') : null;
      if (tag) {
        tag.style.display = 'block';
        if (filenameSpan) filenameSpan.textContent = resumeFile.name;
      }

      showDirectAttachedBadge(dropZone, resumeFile.name);
      highlightResumeDropzone(dropZone);
      uploadedCount++;
    }

    return {
      uploaded: uploadedCount > 0,
      openedDialog: false,
      filename: resumeFile.name,
      count: uploadedCount
    };
  }

  // B. Global Upload Mode: Strictly filter out any cover letters and photos
  const fileInputs = Array.from(document.querySelectorAll('input[type="file"], .gf-hidden-file-input'))
    .filter(input => !isCoverLetterTarget(input));

  const resumeInputs = fileInputs.filter(input => {
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const accept = (input.getAttribute('accept') || '').toLowerCase();
    const aria = (input.getAttribute('aria-label') || '').toLowerCase();
    
    const container = (input.closest && typeof input.closest === 'function')
      ? (input.closest('label, div[class*="upload"], div[class*="drop"], div[class*="file"], div[class*="resume"], div[class*="document"], div[role="listitem"], .gf-listitem, section, fieldset') || input.parentElement)
      : input.parentElement;
    const containerText = container ? (container.innerText || container.textContent || '').toLowerCase() : '';

    if (isCoverLetterTarget(input) || isCoverLetterTarget(container)) return false;

    const isResumeRegex = /(resume|cv\b|curriculum|biodata|profile|attachment|upload.*file|file.*upload|add.*file|document)/i;
    const isPhoto = /photo|picture|avatar|image|signature/i.test(id) || /photo|signature/i.test(name) || /photo|signature/i.test(containerText);

    if (isPhoto) return false;

    const acceptsDoc = accept.includes('pdf') || accept.includes('doc') || accept.includes('docx') || accept === '*' || accept === '';

    if (fileInputs.length === 1) return true;

    return isResumeRegex.test(id) || 
           isResumeRegex.test(name) || 
           isResumeRegex.test(aria) || 
           isResumeRegex.test(containerText) || 
           acceptsDoc;
  });

  const targets = resumeInputs.length > 0 ? resumeInputs : (fileInputs.length === 1 ? fileInputs : []);

  for (const input of targets) {
    if (isCoverLetterTarget(input)) continue;
    try {
      if (input.tagName && input.tagName.toLowerCase() === 'input') {
        input.files = dt.files;
      }

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      const dropZone = (input.closest && typeof input.closest === 'function')
        ? (input.closest('[class*="dropzone"], [class*="drop"], [class*="upload"], label, .file-input-wrapper, [class*="resume"], div[role="listitem"], .gf-listitem, .gf-file-upload-container') || input.parentElement)
        : input.parentElement;

      if (dropZone && !isCoverLetterTarget(dropZone)) {
        try {
          const dragEnter = new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt });
          const dragOver = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt });
          const drop = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });

          dropZone.dispatchEvent(dragEnter);
          dropZone.dispatchEvent(dragOver);
          dropZone.dispatchEvent(drop);
        } catch (de) {}

        const tag = dropZone.querySelector ? dropZone.querySelector('.gf-uploaded-file-tag, [class*="file-name"], [class*="uploaded-file"]') : null;
        const filenameSpan = dropZone.querySelector ? dropZone.querySelector('.gf-uploaded-filename, [class*="file-name-text"]') : null;
        if (tag) {
          tag.style.display = 'block';
          if (filenameSpan) filenameSpan.textContent = resumeFile.name;
        }

        showDirectAttachedBadge(dropZone, resumeFile.name);
        highlightResumeDropzone(dropZone);
      }

      uploadedCount++;
    } catch (err) {
      console.error('[AutoApply Pro] Error attaching resume to input:', err);
    }
  }

  // C. Google Forms Add file modal fallback
  let openedDialog = false;
  if (uploadedCount === 0) {
    const gfAddButtons = Array.from(document.querySelectorAll('div[role="button"][aria-label*="Add file" i], .gf-add-file-btn, div[role="button"]')).filter(btn => {
      const text = (btn.innerText || btn.getAttribute('aria-label') || '').toLowerCase();
      return (text.includes('add file') || text.includes('upload file')) && !btn.closest('#autoapply-pro-root') && !isCoverLetterTarget(btn);
    });

    for (const btn of gfAddButtons) {
      const container = (btn.closest && typeof btn.closest === 'function')
        ? (btn.closest('div[role="listitem"], .gf-listitem, .gf-file-upload-container') || btn.parentElement)
        : btn.parentElement;

      if (isCoverLetterTarget(container)) continue;

      const simTag = container?.querySelector?.('.gf-uploaded-file-tag');
      const simFilenameSpan = container?.querySelector?.('.gf-uploaded-filename');

      if (simTag) {
        simTag.style.display = 'block';
        if (simFilenameSpan) simFilenameSpan.textContent = resumeFile.name;
        highlightResumeDropzone(container || btn);
        uploadedCount++;
        break;
      }

      try {
        btn.click();
        openedDialog = true;
        highlightResumeDropzone(container || btn);
        if (typeof clearGoogleFormItemError === 'function' && container) {
          clearGoogleFormItemError(container);
        }
      } catch (e) {}

      await new Promise(r => setTimeout(r, 350));

      const modalFileInputs = Array.from(document.querySelectorAll('div[role="dialog"] input[type="file"], iframe'));
      for (const mItem of modalFileInputs) {
        if (mItem.tagName.toLowerCase() === 'input') {
          try {
            mItem.files = dt.files;
            mItem.dispatchEvent(new Event('input', { bubbles: true }));
            mItem.dispatchEvent(new Event('change', { bubbles: true }));
            uploadedCount++;
            break;
          } catch (e) {}
        } else if (mItem.tagName.toLowerCase() === 'iframe') {
          try {
            const iframeDoc = mItem.contentDocument || mItem.contentWindow?.document;
            const iframeInput = iframeDoc?.querySelector('input[type="file"]');
            if (iframeInput) {
              iframeInput.files = dt.files;
              iframeInput.dispatchEvent(new Event('input', { bubbles: true }));
              iframeInput.dispatchEvent(new Event('change', { bubbles: true }));
              uploadedCount++;
              break;
            }
          } catch (e) {}
        }
      }

      if (uploadedCount > 0) break;
    }
  }

  return {
    uploaded: uploadedCount > 0,
    openedDialog: openedDialog && uploadedCount === 0,
    filename: resumeFile.name,
    count: uploadedCount
  };
}

/**
 * Displays a sleek, non-intrusive green confirmation badge confirming instant resume attachment
 */
function showDirectAttachedBadge(container, filename = 'DanishKhan_Resume.pdf') {
  if (!container || typeof document === 'undefined') return;

  const existing = container.querySelector('.autoapply-attached-badge');
  if (existing) existing.remove();

  const badge = document.createElement('div');
  badge.className = 'autoapply-attached-badge';
  badge.innerHTML = `<span style="font-size:12px;margin-right:4px;">⚡</span><span>${filename} Attached</span>`;
  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    background: linear-gradient(135deg, #065f46 0%, #047857 100%);
    color: #ecfdf5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 9999px;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    margin-top: 6px;
    z-index: 1000;
    pointer-events: none;
    animation: aapBadgeFadeIn 0.25s ease-out;
  `;

  try {
    container.appendChild(badge);
    setTimeout(() => {
      badge.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      badge.style.opacity = '0';
      badge.style.transform = 'translateY(-4px)';
      setTimeout(() => badge.remove(), 450);
    }, 3500);
  } catch (e) {}
}

function highlightResumeDropzone(element) {
  if (!element) return;
  const originalBorder = element.style.borderColor;
  const originalTransition = element.style.transition;
  const originalBoxShadow = element.style.boxShadow;

  element.style.transition = 'border-color 0.3s ease, box-shadow 0.3s ease';
  element.style.borderColor = 'rgba(16, 185, 129, 0.8)';
  element.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)';

  setTimeout(() => {
    element.style.borderColor = originalBorder;
    element.style.boxShadow = originalBoxShadow;
    element.style.transition = originalTransition;
  }, 2500);
}

/**
 * Direct Hover Resume Auto-Attachment (Zero-Click)
 * Automatically attaches DanishKhan_Resume.pdf when the user hovers over any Resume upload field or dropzone.
 * Strictly ignores Cover Letter fields.
 */
function initDirectHoverResumeUploader() {
  if (typeof document === 'undefined') return;

  // Domain guard: Never run on ChatGPT, Claude, social, or utility sites
  if (typeof isExcludedDomain === 'function' && isExcludedDomain()) {
    console.log('[AutoApply Pro] Direct hover resume upload disabled on excluded site.');
    return;
  }

  function bindTarget(el) {
    if (!el || el.dataset?.autoapplyResumeHoverBound === 'true') return;
    if (typeof isExcludedDomain === 'function' && isExcludedDomain()) return;
    if (!isResumeTarget(el)) return; // Strictly only bind to verified Resume fields!
    if (isCoverLetterTarget(el)) return; // Strictly ignore cover letters!

    el.dataset.autoapplyResumeHoverBound = 'true';

    const onHoverOrFocus = async () => {
      // Re-verify domain and target safety
      if (typeof isExcludedDomain === 'function' && isExcludedDomain()) return;
      if (!isResumeTarget(el) || isCoverLetterTarget(el)) return;
      if (el.dataset?.autoapplyResumeAttached === 'true') return;
      el.dataset.autoapplyResumeAttached = 'true';

      try {
        const res = await autoUploadResume(el);
        if (res?.uploaded) {
          showDirectAttachedBadge(el, res.filename || 'DanishKhan_Resume.pdf');
        }
      } catch (err) {
        console.warn('[AutoApply Pro] Direct hover resume upload notice:', err);
      }
    };

    el.addEventListener('pointerenter', onHoverOrFocus, { passive: true });
    el.addEventListener('mouseenter', onHoverOrFocus, { passive: true });
    el.addEventListener('focus', onHoverOrFocus, { passive: true });
  }

  function scanAndBind() {
    if (typeof isExcludedDomain === 'function' && isExcludedDomain()) return;
    const candidates = document.querySelectorAll(
      'input[type="file"], [class*="dropzone"], [class*="drop-zone"], [data-testid*="dropzone"], [data-qa*="dropzone"], [class*="file-upload"], [class*="resume-upload"], .upload-box, [class*="document-upload"], .gf-file-upload-container, .gf-add-file-btn, div[role="button"][aria-label*="Add file" i], div[role="button"][aria-label*="Resume" i]'
    );
    candidates.forEach(bindTarget);
  }

  scanAndBind();

  // Watch for dynamic modal opens or multi-step wizard changes
  if (typeof MutationObserver !== 'undefined' && document.body) {
    const observer = new MutationObserver(() => {
      scanAndBind();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

if (typeof window !== 'undefined') {
  window.autoUploadResume = autoUploadResume;
  window.getResumeFile = getResumeFile;
  window.isCoverLetterTarget = isCoverLetterTarget;
  window.isResumeTarget = isResumeTarget;
  window.initDirectHoverResumeUploader = initDirectHoverResumeUploader;
}
if (typeof self !== 'undefined') {
  self.autoUploadResume = autoUploadResume;
  self.getResumeFile = getResumeFile;
  self.isCoverLetterTarget = isCoverLetterTarget;
  self.isResumeTarget = isResumeTarget;
  self.initDirectHoverResumeUploader = initDirectHoverResumeUploader;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    autoUploadResume,
    getResumeFile,
    isCoverLetterTarget,
    isResumeTarget,
    initDirectHoverResumeUploader
  };
}
