// Per-game save/load on localStorage.
//
//   import * as storage from '../shared/storage.js?v=0.6.0';
//   const progress = storage.load('01-times-table', { stars: 0 });
//   progress.stars += 1;
//   storage.save('01-times-table', progress);
//
// Each game saves one plain object under its id (the folder name). Keys get a
// "zoe-games:" prefix because everything else on the same domain shares this
// localStorage. Storage can be unavailable, full, or wiped at any time, so
// nothing here throws: load() falls back to the defaults, and save() returns
// false when it can't write.

const PREFIX = 'zoe-games:';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Returns a fresh copy of defaults with any saved fields laid over it, so a
// game always gets every field it expects, including fields added after the
// data was saved.
export function load(gameId, defaults) {
  const data = JSON.parse(JSON.stringify(defaults || {}));
  try {
    const saved = JSON.parse(window.localStorage.getItem(PREFIX + gameId));
    if (isPlainObject(saved)) Object.assign(data, saved);
  } catch (e) {
    // Missing, unreadable, or blocked storage: start from the defaults.
  }
  return data;
}

// Saves data (a plain object) for gameId. Returns whether it worked.
export function save(gameId, data) {
  try {
    window.localStorage.setItem(PREFIX + gameId, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

// Forgets everything saved for gameId.
export function clear(gameId) {
  try {
    window.localStorage.removeItem(PREFIX + gameId);
  } catch (e) {
    // Nothing saved, or storage is blocked; either way it's gone.
  }
}
