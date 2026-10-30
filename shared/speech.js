// Reads text aloud with the device's built-in voice (the Web Speech API), so
// there are no recordings and no network.
//
//   import * as speech from '../shared/speech.js?v=0.7.12';
//   startButton.addEventListener('click', () => { speech.speak('Hello!'); });
//   speech.stop();
//
// iOS only starts speaking from a tap, so make the first speak() in a click
// handler (the Start button); later calls work any time. Speech is quiet
// while sounds are muted (the launcher's speaker button).

import * as sound from './sound.js?v=0.7.12';

export function isSupported() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

// Stops anything being said and says text instead.
export function speak(text) {
  if (!isSupported() || sound.isMuted()) return;
  const synth = window.speechSynthesis;
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9; // a little slower than usual
  if (synth.speaking || synth.pending) {
    synth.cancel();
    // iOS can drop a speak() that comes right after cancel().
    setTimeout(function () {
      synth.speak(utterance);
    }, 80);
  } else {
    synth.speak(utterance);
  }
}

export function stop() {
  if (isSupported()) window.speechSynthesis.cancel();
}
