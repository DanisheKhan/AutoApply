/**
 * AutoApply Pro - Test Harness Interactive Script
 * Strict Manifest V3 CSP compliant (No inline scripts or handlers)
 */

function initTestPage() {
  // 1. Tab switching logic
  function switchTab(targetId, clickedBtn) {
    if (!targetId) return;

    // Update button states
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    if (clickedBtn) {
      clickedBtn.classList.add('active');
    } else {
      const found = document.querySelector(`.tab-btn[data-target="${targetId}"]`);
      if (found) found.classList.add('active');
    }

    // Switch active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.classList.add('active');
    }

    // Dispatch tab switch event so floating widget and adapters update
    window.dispatchEvent(new CustomEvent('autoapply:tabswitched', { detail: { tabId: targetId } }));
    if (typeof window.updateFloatingWidgetPlatform === 'function') {
      window.updateFloatingWidgetPlatform();
    }
  }

  // Make switchTab available on window
  window.switchTab = switchTab;

  // Bind click listeners to all tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-target');
      switchTab(target, btn);
    });
  });

  // Handle URL hash navigation (e.g. index.html#tab-enterprise)
  if (window.location.hash) {
    const hash = window.location.hash.replace('#', '');
    if (['tab-google', 'tab-enterprise', 'tab-modern', 'tab-edgecases', 'tab-accordions'].includes(hash)) {
      switchTab(hash);
    }
  }

  // 2. Radio Button Selection Simulation
  document.querySelectorAll('div[role="radio"]').forEach(radio => {
    radio.addEventListener('click', () => {
      const group = radio.closest('.gf-radio-group') || radio.parentElement;
      if (group) {
        group.querySelectorAll('div[role="radio"]').forEach(r => {
          r.classList.remove('selected');
          r.setAttribute('aria-checked', 'false');
        });
      }
      radio.classList.add('selected');
      radio.setAttribute('aria-checked', 'true');
    });
  });

  // 3. Checkbox Selection Simulation
  document.querySelectorAll('div[role="checkbox"]').forEach(cb => {
    cb.addEventListener('click', () => {
      const isChecked = cb.classList.contains('selected') || cb.getAttribute('aria-checked') === 'true';
      if (isChecked) {
        cb.classList.remove('selected');
        cb.setAttribute('aria-checked', 'false');
      } else {
        cb.classList.add('selected');
        cb.setAttribute('aria-checked', 'true');
      }
    });
  });

  // 4. Custom Google Forms Dropdown / Listbox Menus
  document.querySelectorAll('.gf-select-container').forEach(container => {
    const listbox = container.querySelector('.gf-custom-select, div[role="listbox"]');
    const menu = container.querySelector('.gf-dropdown-menu');
    const label = container.querySelector('.gf-select-text');

    if (!listbox || !menu) return;

    // Toggle dropdown open/closed
    listbox.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.style.display !== 'none';
      // Close any other open dropdowns first
      document.querySelectorAll('.gf-dropdown-menu').forEach(m => m.style.display = 'none');
      document.querySelectorAll('.gf-custom-select, div[role="listbox"]').forEach(lb => lb.setAttribute('aria-expanded', 'false'));

      if (!isOpen) {
        menu.style.display = 'block';
        listbox.setAttribute('aria-expanded', 'true');
      } else {
        menu.style.display = 'none';
        listbox.setAttribute('aria-expanded', 'false');
      }
    });

    // Option click selection
    menu.querySelectorAll('.gf-dropdown-option, div[role="option"]').forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.querySelectorAll('.gf-dropdown-option, div[role="option"]').forEach(opt => {
          opt.classList.remove('selected');
          opt.setAttribute('aria-selected', 'false');
        });
        option.classList.add('selected');
        option.setAttribute('aria-selected', 'true');

        if (label) {
          label.textContent = option.innerText.trim();
        }
        menu.style.display = 'none';
        listbox.setAttribute('aria-expanded', 'false');

        // Trigger change on listbox
        listbox.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.gf-dropdown-menu').forEach(m => m.style.display = 'none');
    document.querySelectorAll('.gf-custom-select, div[role="listbox"]').forEach(lb => lb.setAttribute('aria-expanded', 'false'));
  });

  // 5. Accordions & Collapsible Sections Handling
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const card = header.closest('.accordion-card');
      const body = card ? card.querySelector('.accordion-body') : null;
      if (!body) return;

      const isCollapsed = header.classList.contains('collapsed') || header.getAttribute('aria-expanded') === 'false';
      if (isCollapsed) {
        header.classList.remove('collapsed');
        header.setAttribute('aria-expanded', 'true');
        body.style.display = 'block';
        const arrow = header.querySelector('.accordion-arrow');
        if (arrow) arrow.textContent = 'Click to collapse';
      } else {
        header.classList.add('collapsed');
        header.setAttribute('aria-expanded', 'false');
        body.style.display = 'none';
        const arrow = header.querySelector('.accordion-arrow');
        if (arrow) arrow.textContent = 'Click to expand';
      }
    });
  });

  // "+ Expand all sections" Button
  const expandAllBtn = document.getElementById('btn-expand-all');
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.accordion-header').forEach(header => {
        header.classList.remove('collapsed');
        header.setAttribute('aria-expanded', 'true');
        const card = header.closest('.accordion-card');
        const body = card ? card.querySelector('.accordion-body') : null;
        if (body) body.style.display = 'block';
        const arrow = header.querySelector('.accordion-arrow');
        if (arrow) arrow.textContent = 'Click to collapse';
      });
    });
  }

  // Enterprise Resume Upload Trigger & Modal Popup
  const uploadResumeTrigger = document.getElementById('btn-upload-resume-trigger');
  const uploadPopupModal = document.getElementById('upload-popup-modal');
  const uploadFromDeviceBtn = document.getElementById('btn-upload-from-device');
  const enterpriseResumeInput = document.getElementById('enterprise-resume-input');
  const accordionResumeStatus = document.getElementById('accordion-resume-status');

  if (uploadResumeTrigger && uploadPopupModal) {
    uploadResumeTrigger.addEventListener('click', () => {
      uploadPopupModal.style.display = 'block';
    });
  }

  if (uploadFromDeviceBtn && enterpriseResumeInput) {
    uploadFromDeviceBtn.addEventListener('click', () => {
      enterpriseResumeInput.click();
    });
  }

  if (enterpriseResumeInput && accordionResumeStatus) {
    enterpriseResumeInput.addEventListener('change', () => {
      if (enterpriseResumeInput.files && enterpriseResumeInput.files[0]) {
        const file = enterpriseResumeInput.files[0];
        accordionResumeStatus.style.display = 'inline-block';
        accordionResumeStatus.innerHTML = `✓ Attached: <strong>${file.name}</strong>`;
        if (uploadPopupModal) uploadPopupModal.style.display = 'none';
      }
    });
  }

  // Google Forms Resume Upload Add file Button
  const gfAddFileBtn = document.getElementById('gf-add-file-button');
  const gfFileInput = document.getElementById('gf-file-input');
  const gfUploadedTag = document.getElementById('gf-uploaded-tag');

  if (gfAddFileBtn && gfFileInput) {
    gfAddFileBtn.addEventListener('click', () => {
      gfFileInput.click();
    });
  }

  if (gfFileInput && gfUploadedTag) {
    gfFileInput.addEventListener('change', () => {
      if (gfFileInput.files && gfFileInput.files[0]) {
        gfUploadedTag.style.display = 'block';
      }
    });
  }

  // 6. Form Clearing Helper
  function clearCurrentForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.reset();
    form.querySelectorAll('div[role="radio"]').forEach(r => {
      r.classList.remove('selected');
      r.setAttribute('aria-checked', 'false');
    });
    form.querySelectorAll('div[role="checkbox"]').forEach(cb => {
      cb.classList.remove('selected');
      cb.setAttribute('aria-checked', 'false');
    });
    form.querySelectorAll('.gf-select-text').forEach(lbl => {
      lbl.textContent = 'Choose';
    });
    form.querySelectorAll('.gf-dropdown-option, div[role="option"]').forEach(opt => {
      opt.classList.remove('selected');
      opt.setAttribute('aria-selected', 'false');
    });
    form.querySelectorAll('input, textarea').forEach(el => {
      if (el.type !== 'submit' && el.type !== 'button') {
        el.value = '';
      }
    });
    form.querySelectorAll('select').forEach(sel => {
      sel.selectedIndex = 0;
    });
    const gfTag = form.querySelector('.gf-uploaded-file-tag');
    if (gfTag) gfTag.style.display = 'none';
  }

  // Clear Form Buttons
  const clearGoogleBtn = document.getElementById('btn-clear-google');
  if (clearGoogleBtn) {
    clearGoogleBtn.addEventListener('click', () => clearCurrentForm('google-form-mock'));
  }

  const clearEnterpriseBtn = document.getElementById('btn-clear-enterprise');
  if (clearEnterpriseBtn) {
    clearEnterpriseBtn.addEventListener('click', () => clearCurrentForm('enterprise-form-mock'));
  }

  const clearModernBtn = document.getElementById('btn-clear-modern');
  if (clearModernBtn) {
    clearModernBtn.addEventListener('click', () => clearCurrentForm('modern-ats-mock'));
  }

  const clearEdgecasesBtn = document.getElementById('btn-clear-edgecases');
  if (clearEdgecasesBtn) {
    clearEdgecasesBtn.addEventListener('click', () => clearCurrentForm('edgecases-form-mock'));
  }

  const clearAccordionsBtn = document.getElementById('btn-clear-accordions');
  if (clearAccordionsBtn) {
    clearAccordionsBtn.addEventListener('click', () => clearCurrentForm('accordions-form-mock'));
  }

  // 7. Resume file dropzone interactions
  const resumeDropzone = document.getElementById('test-resume-dropzone');
  const resumeInput = document.getElementById('test-resume-input');
  const resumeStatus = document.getElementById('test-resume-status');

  if (resumeDropzone && resumeInput) {
    resumeDropzone.addEventListener('click', (e) => {
      if (e.target !== resumeInput) {
        resumeInput.click();
      }
    });
  }

  if (resumeInput && resumeStatus) {
    resumeInput.addEventListener('change', () => {
      if (resumeInput.files && resumeInput.files[0]) {
        const file = resumeInput.files[0];
        resumeStatus.style.display = 'inline-flex';
        resumeStatus.innerHTML = `✓ Attached: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTestPage);
} else {
  initTestPage();
}
