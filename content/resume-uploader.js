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
  // 1. Try instant Base64 file creation
  const file = createResumeFileFromBase64();
  if (file) return file;

  // 2. Fallback: Fetch via Chrome Extension URL
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
async function autoUploadResume() {
  const resumeFile = await getResumeFile();
  if (!resumeFile) {
    console.warn('[AutoApply Pro] Resume file not available for auto-upload.');
    return { uploaded: false, filename: '', count: 0 };
  }

  let uploadedCount = 0;
  // Look for all file inputs, including hidden or stylized ones
  const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));

  // Filter for resume-specific file inputs (ignore cover letter or profile photos if separate)
  const resumeInputs = fileInputs.filter(input => {
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const accept = (input.getAttribute('accept') || '').toLowerCase();
    const aria = (input.getAttribute('aria-label') || '').toLowerCase();
    
    // Check parent label or container text
    const container = input.closest('label, div[class*="upload"], div[class*="drop"], div[class*="file"], div[class*="resume"], section, fieldset') || input.parentElement;
    const containerText = container ? container.innerText.toLowerCase() : '';

    const isResumeRegex = /(resume|cv\b|curriculum|biodata|profile|attachment|upload.*file|file.*upload)/i;
    const isCoverLetter = /cover[_\s-]?letter/i.test(id) || /cover[_\s-]?letter/i.test(name) || /cover[_\s-]?letter/i.test(containerText);
    const isPhoto = /photo|picture|avatar|image|signature/i.test(id) || /photo|signature/i.test(name) || /photo|signature/i.test(containerText);

    if (isCoverLetter || isPhoto) return false;

    const acceptsDoc = accept.includes('pdf') || accept.includes('doc') || accept.includes('docx') || accept === '*' || accept === '';

    if (fileInputs.length === 1) return true;

    return isResumeRegex.test(id) || 
           isResumeRegex.test(name) || 
           isResumeRegex.test(aria) || 
           isResumeRegex.test(containerText) || 
           acceptsDoc;
  });

  const targets = resumeInputs.length > 0 ? resumeInputs : fileInputs;

  for (const input of targets) {
    try {
      const dt = new DataTransfer();
      dt.items.add(resumeFile);

      // Assign to input
      input.files = dt.files;

      // Dispatch change and input events
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Find dropzone target or parent wrapper
      const dropZone = input.closest('[class*="dropzone"], [class*="drop"], [class*="upload"], label, .file-input-wrapper') || input.parentElement;
      if (dropZone) {
        try {
          const dragEnter = new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt });
          const dragOver = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt });
          const drop = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });

          dropZone.dispatchEvent(dragEnter);
          dropZone.dispatchEvent(dragOver);
          dropZone.dispatchEvent(drop);
        } catch (de) {
          // Synthetic DragEvents may be restricted in some browsers
        }

        highlightResumeDropzone(dropZone);
      }

      uploadedCount++;
    } catch (err) {
      console.error('[AutoApply Pro] Error attaching resume to input:', err);
    }
  }

  // Also check for dropzone divs without an explicit <input type="file"> in same scope
  if (uploadedCount === 0) {
    const dropAreas = document.querySelectorAll('[class*="dropzone"], [class*="drop-zone"], [data-testid*="dropzone"], [data-qa*="dropzone"], [class*="file-upload"]');
    for (const dropArea of dropAreas) {
      const text = (dropArea.innerText || '').toLowerCase();
      if (/drag.*drop|upload.*resume|upload.*file|attach.*cv/i.test(text)) {
        try {
          const dt = new DataTransfer();
          dt.items.add(resumeFile);

          const drop = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
          dropArea.dispatchEvent(drop);
          highlightResumeDropzone(dropArea);
          uploadedCount++;
        } catch (e) {
          // ignore
        }
      }
    }
  }

  return {
    uploaded: uploadedCount > 0,
    filename: resumeFile.name,
    count: uploadedCount
  };
}

function highlightResumeDropzone(element) {
  if (!element) return;
  const originalBorder = element.style.borderColor;
  const originalBoxShadow = element.style.boxShadow;
  const originalTransition = element.style.transition;

  element.style.transition = 'all 0.3s ease';
  element.style.borderColor = '#a8c7fa';
  element.style.boxShadow = '0 0 16px rgba(168, 199, 250, 0.4)';

  setTimeout(() => {
    element.style.borderColor = originalBorder;
    element.style.boxShadow = originalBoxShadow;
    element.style.transition = originalTransition;
  }, 2000);
}

if (typeof window !== 'undefined') {
  window.autoUploadResume = autoUploadResume;
  window.getResumeFile = getResumeFile;
}
