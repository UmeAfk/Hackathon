export function initCustomSelect(root) {
  if (!root) return;

  const input = root.querySelector('input[type="hidden"]');
  const trigger = root.querySelector('.retro-select-trigger');
  const menu = root.querySelector('.retro-select-menu');
  const title = root.querySelector('#submitAiUsageText');
  const description = trigger?.querySelector('small');
  const triggerIndex = trigger?.querySelector('.retro-select-index');
  const options = Array.from(root.querySelectorAll('.retro-select-option'));
  if (!input || !trigger || !menu || !title || !description || !triggerIndex || !options.length) return;

  let hideTimer;

  function setOpen(open, focusOption = false) {
    window.clearTimeout(hideTimer);
    trigger.setAttribute('aria-expanded', String(open));
    if (open) {
      menu.hidden = false;
      window.requestAnimationFrame(() => {
        root.dataset.open = 'true';
        if (focusOption) {
          (options.find(option => option.getAttribute('aria-selected') === 'true') || options[0]).focus();
        }
      });
      return;
    }

    root.dataset.open = 'false';
    hideTimer = window.setTimeout(() => {
      if (trigger.getAttribute('aria-expanded') === 'false') menu.hidden = true;
    }, 220);
  }

  function selectOption(option) {
    input.value = option.dataset.value || 'none';
    title.textContent = option.dataset.title || '';
    description.textContent = option.dataset.description || '';
    triggerIndex.textContent = String(options.indexOf(option) + 1).padStart(2, '0');
    options.forEach(item => item.setAttribute('aria-selected', String(item === option)));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    setOpen(false);
    trigger.focus();
  }

  trigger.addEventListener('click', () => {
    const open = trigger.getAttribute('aria-expanded') !== 'true';
    setOpen(open, open);
  });
  trigger.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true, true);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  });

  options.forEach(option => option.addEventListener('click', () => selectOption(option)));
  menu.addEventListener('keydown', event => {
    const current = options.indexOf(document.activeElement);
    let next = current;
    if (event.key === 'ArrowDown') next = (current + 1) % options.length;
    else if (event.key === 'ArrowUp') next = (current - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else if ((event.key === 'Enter' || event.key === ' ') && current >= 0) {
      event.preventDefault();
      selectOption(options[current]);
      return;
    }
    else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      trigger.focus();
      return;
    } else return;
    event.preventDefault();
    options[next].focus();
  });

  document.addEventListener('click', event => {
    if (!root.contains(event.target)) setOpen(false);
  });
}
