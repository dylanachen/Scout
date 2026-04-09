const ICONS = {
  success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" stroke-width="2"/><path d="M12 8h.01M12 11v5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
};

/**
 * Show a short-lived toast notification at the bottom of the screen.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='info']
 */
export function showToast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `fos-toast fos-toast--${type}`;
  el.innerHTML = `<span style="display:inline-flex">${ICONS[type] || ICONS.info}</span><span>${message}</span>`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');

  const dismiss = () => {
    el.classList.add('fos-toast--leaving');
    setTimeout(() => el.remove(), 250);
  };

  el.addEventListener('click', dismiss);
  document.body.appendChild(el);

  const timer = setTimeout(dismiss, 3000);
  el.addEventListener('click', () => clearTimeout(timer), { once: true });
}
