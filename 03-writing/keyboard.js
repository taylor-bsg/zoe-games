// A big on-screen letter keyboard for writing words on a touch screen,
// instead of the device's own keyboard, which covers half the screen and
// suggests or autocorrects words. A real keyboard works too, everywhere.
//
//   import { createKeyboard } from './keyboard.js?v=0.8.8';
//   const keys = createKeyboard(container, { onKey: function (ch) {} });
//   keys.setEnabled(false);
//
// onKey gets a lowercase letter, ’ for any apostrophe, or ' ' for space.
// QWERTY in three rows, the second ending in an apostrophe and the third in
// a wide space bar. Keys act on touch-down, like the number pad. The keys
// show only on touch screens (no mouse or trackpad), or with ?keyboard=1.

const ROWS = ['qwertyuiop', 'asdfghjkl’', 'zxcvbnm '];

export function createKeyboard(container, options) {
  const opts = options || {};
  let enabled = true;
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const shown = coarse || /[?&]keyboard=1/.test(location.search);

  function send(ch) {
    if (enabled && opts.onKey) opts.onKey(ch);
  }

  container.className = 'keyboard';
  container.hidden = !shown;
  ROWS.forEach(function (row) {
    const line = document.createElement('div');
    line.className = 'keyboard-row';
    Array.prototype.forEach.call(row, function (ch) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'keyboard-key' + (ch === ' ' ? ' keyboard-space' : '');
      key.textContent = ch === ' ' ? 'space' : ch;
      key.setAttribute('aria-label', ch === ' ' ? 'space' : ch === '’' ? 'apostrophe' : ch);
      key.addEventListener('pointerdown', function (event) {
        event.preventDefault(); // no focus, no double-tap zoom
        key.classList.add('is-pressed');
        send(ch);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
        key.addEventListener(type, function () {
          key.classList.remove('is-pressed');
        });
      });
      line.appendChild(key);
    });
    container.appendChild(line);
  });

  document.addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const k = event.key;
    if (k === ' ') {
      event.preventDefault(); // no scrolling, and no pressing a focused button
      send(' ');
    } else if (k === "'" || k === '’' || k === '‘' || k === '`') {
      send('’');
    } else if (k && k.length === 1 && /[a-z]/i.test(k)) {
      send(k.toLowerCase());
    }
  });

  return {
    shown: shown,
    setEnabled: function (on) {
      enabled = on;
      container.classList.toggle('is-disabled', !on);
    },
  };
}
