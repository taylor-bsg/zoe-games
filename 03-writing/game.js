// Zoe Writes: write the missing word in a sentence. Help fades as Zoe learns
// each word (most letters given, then just the first, then none), and a word
// she writes perfectly from memory earns a sticker in her notebook. The words
// are Zoe Spells', in its levels 1, 2, 2A, and 2B. See SPEC.md. Play never
// ends; the Home button is the way out.

import * as sound from '../shared/sound.js?v=0.8.3';
import * as speech from '../shared/speech.js?v=0.8.3';
import * as storage from '../shared/storage.js?v=0.8.3';
import * as coins from '../shared/coins.js?v=0.8.3';
import { stars, confetti, coins as floatCoins } from '../shared/celebrate.js?v=0.8.3';
import { createKeyboard } from './keyboard.js?v=0.8.3';
import { WORDS as WORDS_1 } from '../02-spelling/words-1.js?v=0.8.3';
import { WORDS as WORDS_2 } from '../02-spelling/words-2.js?v=0.8.3';
import { WORDS as WORDS_2A } from '../02-spelling/words-2a.js?v=0.8.3';
import { WORDS as WORDS_2B } from '../02-spelling/words-2b.js?v=0.8.3';

const GAME_ID = '03-writing'; // the folder name; also the save key
// The levels, with Zoe Spells' ids and the Zoe Spells level that must be
// open (its unlocked) for each, and where in STICKERS each level starts.
const LEVELS = [
  { id: 1, label: '1', opens: 1, words: WORDS_1, stickers: 0 },
  { id: 2, label: '2', opens: 2, words: WORDS_2, stickers: 25 },
  { id: '2a', label: '2A', opens: 2, words: WORDS_2A, stickers: 50 },
  { id: '2b', label: '2B', opens: 2, words: WORDS_2B, stickers: 75 },
];
const STICKER = 3; // a word's stages: 0 most letters given, 1 the first, 2 none, 3 its sticker
const PAY = 2; // coins for a perfect word, until its sticker
const LEARNING = 8; // words being learned at a time
const HINT_AFTER = 2; // wrong tries at a letter before it shows faintly
const LOOK_AGAIN_AFTER = 2; // words before one that needed a hint comes back
const LOOK_MS = 3000; // how long "Look, cover, write" shows the word
const REVIEW = 1 / 8; // share of turns that review a word with its sticker
const NEXT_AFTER = 1400; // ms before the next word
const NEXT_AFTER_STICKER = 2600;
const NEXT_AFTER_FULL = 4500; // after the last sticker of a level
const WRONG_MS = 450; // how long a wrong letter shows
const PRAISE = ['Perfect!', 'Perfect! ✨', 'Wow, perfect!', 'Super speller!'];
// 100 stickers, one for each word of a level; each level starts elsewhere.
const STICKERS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐤', '🦆', '🦉',
  '🦄', '🐝', '🐞', '🦋', '🐌', '🐢', '🐙', '🦀', '🐠', '🐬',
  '🐳', '🦈', '🦒', '🐘', '🦛', '🦘', '🦔', '🦜', '🦩', '🦕',
  '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑',
  '🍍', '🥥', '🥝', '🥕', '🌽', '🍄', '🥨', '🧀', '🍕', '🍩',
  '🍪', '🎂', '🧁', '🍭', '🍦', '🌈', '⭐', '🌙', '🌞', '⛄',
  '🌸', '🌻', '🌼', '🌷', '🍀', '🌵', '🌴', '🍁', '🌊', '🔥',
  '🎈', '🎁', '🎀', '🪁', '⚽', '🏀', '🎨', '🎸', '🚀', '🚂',
  '🚲', '⛵', '🎠', '🏰', '👑', '💎', '🔮', '🧸', '🪄', '📚',
];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function $(id) {
  return document.getElementById(id);
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// The level with this id (a number, or '2a' or '2b' in any case), or null.
function byId(id) {
  const key = String(id).toLowerCase();
  return LEVELS.filter(function (info) {
    return String(info.id) === key;
  })[0] || null;
}

// stages: word -> its stage (see STICKER), for every word started; no word
// is in two levels. level: the id of the level last picked.
const saved = storage.load(GAME_ID, { stages: {}, level: 1 });
if (!isObject(saved.stages)) saved.stages = {};
// From Zoe Spells, read only: the levels open there, and the words missed.
const spells = storage.load('02-spelling', { unlocked: 1, missed: {} });
const spellsOpen = typeof spells.unlocked === 'number' ? spells.unlocked : 1;
const missed = isObject(spells.missed) ? spells.missed : {};
// For testing, game/?level=2a opens that level for this visit.
const preview = byId((/[?&]level=(\w+)/.exec(location.search) || [])[1]);

function isOpen(info) {
  return spellsOpen >= info.opens || info === preview;
}

if (!byId(saved.level) || !isOpen(byId(saved.level))) saved.level = 1;

let level = LEVELS[0]; // the level on screen
let turn = 0; // words asked since Start
let current = null; // the word being written (see next)
let accepting = false; // taking letters
let lookAgain = []; // { entry, due }: words that needed a hint, coming back
let timer = 0;
let wrongTimer = 0;
let introTimer = 0;
const keyboard = createKeyboard($('keyboard'), { onKey: type });

function stageOf(word) {
  const s = saved.stages[word];
  return s === 0 || s === 1 || s === 2 || s === 3 ? s : -1; // -1: not started
}

function stickerCount(info) {
  return info.words.filter(function (entry) {
    return stageOf(entry.word) === STICKER;
  }).length;
}

function stickerOf(info, k) {
  return STICKERS[(k + info.stickers) % STICKERS.length];
}

// A letter as compared: lowercase, and any apostrophe as ’.
function plain(ch) {
  return /['‘’`]/.test(ch) ? '’' : ch.toLowerCase();
}

const blanksOf = {};

// The tricky part of a word, as letter positions: the letters its wrong
// spellings in Zoe Spells get wrong (changed, dropped, or next to an added
// letter), the most often wrong first, up to half of them.
function tricky(entry) {
  if (blanksOf[entry.word]) return blanksOf[entry.word];
  const word = Array.from(entry.word).map(plain);
  const n = word.length;
  const counts = word.map(function () {
    return 0;
  });
  (entry.wrong || []).forEach(function (spelling) {
    const wrong = Array.from(spelling).map(plain);
    const m = wrong.length;
    // The fewest changes from the word to the wrong spelling, then one way
    // back through them.
    const d = [];
    for (let i = 0; i <= n; i++) {
      d.push([]);
      for (let j = 0; j <= m; j++) {
        if (i === 0) d[i].push(j);
        else if (j === 0) d[i].push(i);
        else d[i].push(Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (word[i - 1] === wrong[j - 1] ? 0 : 1)));
      }
    }
    const marked = word.map(function () {
      return false;
    });
    let i = n;
    let j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (word[i - 1] === wrong[j - 1] ? 0 : 1)) {
        if (word[i - 1] !== wrong[j - 1]) marked[i - 1] = true; // changed
        i--;
        j--;
      } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
        marked[i - 1] = true; // dropped
        i--;
      } else { // added, between word[i - 1] and word[i]
        if (i > 0) marked[i - 1] = true;
        if (i < n) marked[i] = true;
        j--;
      }
    }
    marked.forEach(function (on, k) {
      if (on) counts[k] += 1;
    });
  });
  const order = counts.map(function (count, k) {
    return k;
  }).filter(function (k) {
    return counts[k] > 0;
  });
  order.sort(function (a, b) {
    return counts[b] - counts[a] || a - b;
  });
  const blanks = order.slice(0, Math.max(1, Math.ceil(n / 2)));
  blanksOf[entry.word] = blanks.length ? blanks : [Math.floor(n / 2)];
  return blanksOf[entry.word];
}

// The words being learned in this level: every one started and without its
// sticker yet, topped up to LEARNING with new ones, the most missed in Zoe
// Spells first, then in the list's order.
function learning() {
  const set = level.words.filter(function (entry) {
    const s = stageOf(entry.word);
    return s >= 0 && s < STICKER;
  });
  if (set.length < LEARNING) {
    const misses = function (entry) {
      const m = missed[entry.word];
      return isObject(m) && m.count > 0 ? m.count : 0;
    };
    const fresh = level.words.map(function (entry, k) {
      return { entry: entry, k: k };
    }).filter(function (item) {
      return stageOf(item.entry.word) < 0;
    });
    fresh.sort(function (a, b) {
      return misses(b.entry) - misses(a.entry) || a.k - b.k;
    });
    while (set.length < LEARNING && fresh.length) {
      const entry = fresh.shift().entry;
      saved.stages[entry.word] = 0;
      set.push(entry);
    }
    storage.save(GAME_ID, saved);
  }
  return set;
}

// The next word and how it's asked: a word that needed a hint, when it's
// due, as "Look, cover, write"; now and then a word with its sticker, to
// review; otherwise a word being learned. Never the same word twice in a row.
function choose() {
  turn += 1;
  if (lookAgain.length && lookAgain[0].due <= turn) return { entry: lookAgain.shift().entry, mode: 'look' };
  const last = current && current.entry;
  const set = learning().filter(function (entry) {
    return entry !== last;
  });
  const done = level.words.filter(function (entry) {
    return stageOf(entry.word) === STICKER && entry !== last;
  });
  if (done.length && (!set.length || Math.random() < REVIEW)) return { entry: pick(done), mode: 'review' };
  if (set.length) return { entry: pick(set), mode: 'learn' };
  return { entry: last || level.words[0], mode: 'review' };
}

function tell(text, kind) {
  const message = $('message');
  message.textContent = text;
  message.className = kind ? 'message ' + kind : 'message';
}

// Says the word, then the sentence with the word in it.
function say() {
  if (!current) return;
  const entry = current.entry;
  speech.speak(entry.word + '. ' + entry.sentence.replace('___', entry.word));
}

function showSentence(filled) {
  const parts = current.entry.sentence.split('___');
  const sentence = $('sentence');
  const gap = document.createElement('span');
  gap.className = filled ? 'gap is-filled' : 'gap';
  if (filled) gap.textContent = current.entry.word;
  else gap.innerHTML = '&nbsp;';
  sentence.innerHTML = '';
  sentence.appendChild(document.createTextNode(parts[0]));
  sentence.appendChild(gap);
  sentence.appendChild(document.createTextNode(parts[1] || ''));
}

// Where the next letter goes, or -1 when the word is written.
function cursor() {
  return current.filled.indexOf(false);
}

// The boxes: given letters, letters written, a wrong letter for a moment, a
// hint, and the outline where the next letter goes. With look, the whole
// word, to look at. A space shows as a dot.
function showBoxes(look) {
  const boxes = $('boxes');
  const here = accepting ? cursor() : -1;
  boxes.innerHTML = '';
  current.chars.forEach(function (ch, k) {
    const box = document.createElement('span');
    let kind = '';
    let text = '';
    if (look) {
      kind = ' is-look';
      text = ch;
    } else if (current.given[k]) {
      kind = ' is-given';
      text = ch;
    } else if (current.filled[k]) {
      kind = ' is-right';
      text = ch;
    } else if (k === current.wrongAt) {
      kind = ' is-wrong';
      text = current.wrongCh;
    } else if (current.ghost[k]) {
      kind = ' is-ghost';
      text = ch;
    }
    box.className = 'box' + kind + (k === here ? ' is-here' : '');
    box.textContent = text === ' ' ? '·' : text;
    boxes.appendChild(box);
  });
  fitBoxes();
}

// Boxes as big as fit the card's width: up to 72px above the on-screen
// keyboard, 96px without it, with smaller gaps for a long word on a phone.
function fitBoxes() {
  if (!current) return;
  const n = current.chars.length;
  const width = $('writing').clientWidth - 48; // the card's padding
  const gap = Math.max(3, Math.min(8, Math.floor(width / n / 8)));
  const most = keyboard.shown ? 72 : 96;
  const size = Math.max(16, Math.min(most, Math.floor((width - gap * (n - 1)) / n)));
  $('boxes').style.setProperty('--box', size + 'px');
  $('boxes').style.setProperty('--box-gap', gap + 'px');
}

function showTally() {
  $('tally-label').textContent = 'Level ' + level.label + ' stickers';
  $('tally').textContent = stickerCount(level) + ' / ' + level.words.length;
}

function next() {
  clearTimeout(timer);
  $('sticker-pop').hidden = true;
  const choice = choose();
  const entry = choice.entry;
  const chars = Array.from(entry.word);
  const stage = choice.mode === 'learn' ? stageOf(entry.word) : 2; // look and review: from memory
  const blanks = stage === 0 ? tricky(entry) : [];
  const given = chars.map(function (ch, k) {
    if (stage === 0) return blanks.indexOf(k) < 0;
    return stage === 1 && k === 0 && chars.length > 2;
  });
  current = {
    entry: entry,
    mode: choice.mode,
    chars: chars,
    given: given,
    filled: given.slice(),
    ghost: chars.map(function () {
      return false;
    }),
    wrongAt: -1,
    wrongCh: '',
    tries: 0, // wrong tries at this letter
    mistakes: 0,
    hinted: false,
  };
  showSentence(false);
  say();
  if (choice.mode === 'look') { // Look, cover, write
    accepting = false;
    keyboard.setEnabled(false);
    showBoxes(true);
    tell('Look carefully!', 'look');
    timer = setTimeout(function () {
      accepting = true;
      keyboard.setEnabled(true);
      showBoxes(false);
      tell('Now write it from memory!', 'look');
    }, LOOK_MS);
  } else {
    accepting = true;
    keyboard.setEnabled(true);
    showBoxes(false);
    tell(choice.mode === 'review' ? 'Write it from memory!' : 'Write the missing word!', '');
  }
}

// A key: the right letter fills its box; a wrong one shows for a moment, and
// two wrong tries at a letter show it faintly, to copy.
function type(ch) {
  if (!accepting || !current) return;
  const k = cursor();
  if (k < 0) return;
  if (plain(ch) === plain(current.chars[k])) {
    current.filled[k] = true;
    current.tries = 0;
    current.wrongAt = -1;
    if (cursor() < 0) finish();
    else showBoxes(false);
    return;
  }
  current.mistakes += 1;
  current.tries += 1;
  if (current.tries >= HINT_AFTER) {
    current.ghost[k] = true;
    current.hinted = true;
  }
  current.wrongAt = k;
  current.wrongCh = ch === ' ' ? '·' : ch;
  sound.wrong();
  showBoxes(false);
  tell(current.ghost[k] ? 'Copy the gray letter!' : 'Not that one. Try again!', 'oops');
  clearTimeout(wrongTimer);
  wrongTimer = setTimeout(function () {
    if (current && current.wrongAt === k) {
      current.wrongAt = -1;
      showBoxes(false);
    }
  }, WRONG_MS);
}

// The word is written. A perfect one (no wrong letters, no hints) moves the
// word up a stage and pays, until its sticker; one that needed a hint comes
// back as "Look, cover, write".
function finish() {
  accepting = false;
  clearTimeout(wrongTimer);
  current.wrongAt = -1;
  keyboard.setEnabled(false);
  showSentence(true);
  showBoxes(false);
  sound.correct();
  const entry = current.entry;
  const perfect = current.mistakes === 0 && !current.hinted;
  let wait = NEXT_AFTER;
  if (current.hinted && !lookAgain.some(function (item) {
    return item.entry === entry;
  })) {
    lookAgain.push({ entry: entry, due: turn + LOOK_AGAIN_AFTER + 1 });
  }
  if (current.mode === 'learn' && perfect) {
    const stage = stageOf(entry.word) + 1;
    saved.stages[entry.word] = stage;
    storage.save(GAME_ID, saved);
    coins.earn(GAME_ID, PAY);
    stars($('boxes'));
    tell(pick(PRAISE), 'good');
    setTimeout(function () {
      sound.coin();
      floatCoins($('boxes'), PAY);
    }, 350);
    if (stage === STICKER) {
      const full = stickerCount(level) === level.words.length;
      wait = full ? NEXT_AFTER_FULL : NEXT_AFTER_STICKER;
      setTimeout(function () {
        newSticker(entry, full);
      }, 700);
    }
  } else if (perfect) {
    tell(current.mode === 'look' ? 'You remembered it!' : 'Still perfect! ⭐', 'good');
  } else {
    tell(current.hinted ? 'You got it! It will come back soon.' : 'You got it!', 'good');
  }
  showTally();
  timer = setTimeout(next, wait);
}

function newSticker(entry, full) {
  $('sticker-big').textContent = stickerOf(level, level.words.indexOf(entry));
  $('sticker-pop').hidden = false;
  sound.trumpet();
  stars($('sticker-big'));
  if (full) {
    setTimeout(function () {
      sound.celebrate();
      confetti();
      tell('Your level ' + level.label + ' notebook is full!', 'good');
    }, 1400);
  }
}

// The start screen's notebook page: a space for each of the level's words,
// with its sticker once earned, each tilted a little.
function showNotebook() {
  const grid = $('stickers');
  grid.innerHTML = '';
  level.words.forEach(function (entry, k) {
    const slot = document.createElement('span');
    if (stageOf(entry.word) === STICKER) {
      slot.className = 'slot has-sticker';
      slot.textContent = stickerOf(level, k);
      slot.style.setProperty('--tilt', (((k * 37) % 13) - 6) + 'deg');
    } else {
      slot.className = 'slot';
    }
    grid.appendChild(slot);
  });
  fitNotebook();
}

// The sticker grid, as big a square as fits the page.
function fitNotebook() {
  const grid = $('stickers');
  const book = $('notebook');
  grid.style.width = '0px';
  grid.style.height = '0px';
  const size = Math.max(100, Math.min(book.clientWidth, book.clientHeight) - 32);
  grid.style.width = size + 'px';
  grid.style.height = size + 'px';
  grid.style.setProperty('--emoji', Math.floor((size / 10) * 0.62) + 'px');
}

function pop(element, kind) {
  element.classList.remove(kind);
  void element.getBoundingClientRect(); // restarts the animation
  element.classList.add(kind);
}

const levelButtons = Array.prototype.slice.call(document.querySelectorAll('.level-button'));

function showLevelButtons() {
  levelButtons.forEach(function (button) {
    const info = byId(button.getAttribute('data-level'));
    const open = isOpen(info);
    button.textContent = open ? info.label : '🔒';
    button.setAttribute('aria-label', 'Level ' + info.label + (open ? '' : ', locked'));
    button.classList.toggle('is-locked', !open);
    button.setAttribute('aria-pressed', String(info === level));
  });
}

function showLevel(info) {
  level = info;
  showTally();
  showNotebook();
  showLevelButtons();
}

function pickLevel(button) {
  const info = byId(button.getAttribute('data-level'));
  if (!isOpen(info)) { // locked: say how to open it
    pop(button, 'is-nudged');
    $('intro-text').textContent = 'Open level ' + info.label + ' in Zoe Spells first!';
    clearTimeout(introTimer);
    introTimer = setTimeout(function () {
      $('intro-text').textContent = 'Write the missing word!';
    }, 3000);
    return;
  }
  if (info !== preview) {
    saved.level = info.id;
    storage.save(GAME_ID, saved);
  }
  showLevel(info);
}

function start() {
  sound.unlock(); // this tap is what lets iOS play sound and speak
  if (document.activeElement) document.activeElement.blur(); // so the space bar can't press it
  $('start').hidden = true;
  $('play').hidden = false;
  turn = 0;
  lookAgain = [];
  current = null;
  next();
}

levelButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    pickLevel(button);
  });
});
$('start-button').addEventListener('click', start);
$('say-again').addEventListener('click', function () {
  this.blur();
  say();
});
window.addEventListener('resize', function () {
  if (!$('play').hidden) fitBoxes();
  else fitNotebook();
});
document.addEventListener('visibilitychange', function () {
  if (document.hidden) speech.stop();
});

$('prize').innerHTML = 'Perfect words win ' + PAY + ' ' + coins.ICON;
showLevel(preview || byId(saved.level));
