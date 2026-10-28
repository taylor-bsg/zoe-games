// Big on-screen number pad. Games use it instead of text inputs because the
// iPad's own keyboard covers much of the screen. It also takes digits,
// Backspace, and Enter from a physical keyboard, for testing on a laptop.
//
//   import { createKeypad } from '../shared/keypad.js?v=0.7.6';
//   const pad = createKeypad(document.getElementById('keypad'), {
//     display: document.getElementById('answer'), // optional, see below
//     maxLength: 2,                               // digits allowed, default 3
//     digitsOnly: true,    // optional: no backspace or check key, for games
//                          // that check the answer in onChange as it's typed
//     onSubmit(value) {},  // check key; value is a non-empty string of digits
//     onChange(value) {},  // optional, after every edit
//   });
//   pad.value              current digits, '' when empty
//   pad.clear()            empties the answer
//   pad.setEnabled(false)  ignores input, e.g. while showing feedback
//   pad.display            the answer display element, for feedback classes
//
// The container becomes a 3x4 grid of keys. The answer display is the element
// passed as `display`, so it can sit inside the problem ("3 + 4 = [  ]"), or a
// new box above the keys if there isn't one. Keys act on pointerdown, so fast
// tapping feels instant. Physical keys are ignored while the keypad is hidden
// or disabled. Styles are in base.css under "Keypad".

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'enter'];

const ICONS = {
  back:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"' +
    ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M8.5 5H20a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 20 19H8.5L2.5 12z"/>' +
    '<path d="M11.5 9.5l5 5M16.5 9.5l-5 5"/></svg>',
  enter:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"' +
    ' stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4.5 12.5l5 5L19.5 6.5"/></svg>',
};

const LABELS = { back: 'Delete', enter: 'Check' };

export function createKeypad(container, options) {
  const opts = options || {};
  const maxLength = opts.maxLength || 3;
  const display = opts.display || document.createElement('div');
  const buttons = {};
  const held = {}; // pointerId -> button being pressed
  let value = '';
  let enabled = true;

  container.classList.add('keypad');
  display.classList.add('keypad-display');
  if (!opts.display) container.appendChild(display);

  KEYS.forEach(function (key) {
    if (opts.digitsOnly && ICONS[key]) {
      container.appendChild(document.createElement('span')); // keeps 0 centered
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'keypad-key';
    button.setAttribute('data-key', key);
    if (ICONS[key]) {
      button.classList.add('keypad-' + key);
      button.setAttribute('aria-label', LABELS[key]);
      button.innerHTML = ICONS[key];
    } else {
      button.textContent = key;
    }
    container.appendChild(button);
    buttons[key] = button;
  });

  function render() {
    display.textContent = value;
  }

  function press(key) {
    if (key === 'enter') {
      if (value && opts.onSubmit) opts.onSubmit(value);
      return;
    }
    const before = value;
    if (key === 'back') value = value.slice(0, -1);
    else if (value === '0') value = key; // no leading zeros
    else if (value.length < maxLength) value += key;
    if (value === before) return;
    render();
    if (opts.onChange) opts.onChange(value);
  }

  container.addEventListener('pointerdown', function (event) {
    const button = event.target.closest('.keypad-key');
    if (!button || !enabled) return;
    event.preventDefault();
    button.classList.add('is-pressed');
    held[event.pointerId] = button;
    press(button.getAttribute('data-key'));
  });

  function release(event) {
    const button = held[event.pointerId];
    if (!button) return;
    button.classList.remove('is-pressed');
    delete held[event.pointerId];
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  document.addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    let key = null;
    if (/^[0-9]$/.test(event.key)) key = event.key;
    else if (event.key === 'Backspace' || event.key === 'Delete') key = 'back';
    else if (event.key === 'Enter') key = 'enter';
    // getClientRects() is empty when the keypad or a parent is display: none.
    if (!key || !buttons[key] || !enabled || !container.getClientRects().length) return;
    event.preventDefault();
    if (event.repeat && key !== 'back') return;
    const button = buttons[key];
    button.classList.add('is-pressed');
    setTimeout(function () {
      button.classList.remove('is-pressed');
    }, 120);
    press(key);
  });

  render();

  return {
    get value() {
      return value;
    },
    display: display,
    clear: function () {
      value = '';
      render();
    },
    setEnabled: function (on) {
      enabled = !!on;
      container.classList.toggle('is-disabled', !enabled);
      display.classList.toggle('is-disabled', !enabled);
    },
  };
}
