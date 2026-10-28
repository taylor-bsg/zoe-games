// Coins: earned by playing games, spent in the store (store/). Shared by
// every page.
//
//   import * as coins from '../shared/coins.js?v=0.7.4';
//   coins.earn('01-times-table', 2);  // returns the new balance
//   coins.balance();                  // earned minus spent
//   coins.spend('sprout', 50);        // false if it's owned or she can't afford it
//   coins.owns('sprout');
//   coins.totals();                   // { earned, spent, balance }
//   el.innerHTML = '12 ' + coins.ICON; // a little gold coin, sized to the text
//
// Earned coins are kept per source (each game id, plus a one-time head
// start), and spending as a list of purchases, so a parent can see where
// coins came from and went. Everything is under one storage key and re-read
// before every change, so pages never overwrite each other's coins.

import * as storage from './storage.js?v=0.7.4';

const KEY = 'coins';

// A gold coin with a star, 1em across, sitting on the text baseline. (The 🪙
// emoji is a silver coin that looks like a gray dot when small.)
export const ICON =
  '<svg viewBox="0 0 20 20" width="1em" height="1em" aria-hidden="true" ' +
  'style="vertical-align:-0.14em;flex:none">' +
  '<circle cx="10" cy="10" r="9.3" fill="#f59f00"/>' +
  '<circle cx="10" cy="10" r="7.6" fill="#ffd43b" stroke="#fab005" stroke-width="1"/>' +
  '<path d="M10 5.3l1.4 2.9 3.1.4-2.3 2.2.6 3.1L10 12.4l-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z" ' +
  'fill="#f08c00"/></svg>';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function amount(value) {
  return typeof value === 'number' && value > 0 ? value : 0;
}

function read() {
  const data = storage.load(KEY, { earned: {}, spent: [], headStart: false });
  if (!isObject(data.earned)) data.earned = {};
  if (!Array.isArray(data.spent)) data.spent = [];
  data.spent = data.spent.filter(function (buy) {
    return isObject(buy) && typeof buy.item === 'string';
  });
  return data;
}

function sumEarned(data) {
  return Object.keys(data.earned).reduce(function (sum, source) {
    return sum + amount(data.earned[source]);
  }, 0);
}

function sumSpent(data) {
  return data.spent.reduce(function (sum, buy) {
    return sum + amount(buy.price);
  }, 0);
}

export function totals() {
  const data = read();
  const earned = sumEarned(data);
  const spent = sumSpent(data);
  return { earned: earned, spent: spent, balance: earned - spent };
}

export function balance() {
  return totals().balance;
}

// Adds coins from a source (a game id). Returns the new balance.
export function earn(source, coins) {
  const data = read();
  if (amount(coins)) {
    data.earned[source] = amount(data.earned[source]) + coins;
    storage.save(KEY, data);
  }
  return sumEarned(data) - sumSpent(data);
}

export function owns(item) {
  return read().spent.some(function (buy) {
    return buy.item === item;
  });
}

// Buys an item once. Returns whether the purchase happened.
export function spend(item, price) {
  const data = read();
  const owned = data.spent.some(function (buy) {
    return buy.item === item;
  });
  if (owned || sumEarned(data) - sumSpent(data) < price) return false;
  data.spent.push({ item: item, price: price, at: Date.now() });
  return storage.save(KEY, data);
}

// One time: coins for progress made before coins existed, at the rates the
// games pay now. Zoe Spells pays 100 times the level for each wall finished
// (every level below the highest open one), and Times Tables 1 coin per
// saved right answer, 2 for problems beyond 10 × 10. Its saved tries are
// the last 3 per problem; wrong ones are saved as 5 s, and so are right ones
// that took 5 s or more, so only tries under 5 s count. This reads those
// games' saved data directly; it's a one-time migration.
function grantHeadStart() {
  const data = read();
  if (data.headStart) return;
  let coins = 0;
  const spells = storage.load('02-spelling', {});
  const unlocked = typeof spells.unlocked === 'number' ? spells.unlocked : 1;
  for (let level = 1; level < unlocked; level++) coins += 100 * level;
  const tables = storage.load('01-times-table', {});
  if (isObject(tables.times)) {
    Object.keys(tables.times).forEach(function (key) {
      const match = /^(\d+)x(\d+)$/.exec(key);
      const tries = tables.times[key];
      if (!match || !Array.isArray(tries)) return;
      const rate = Number(match[1]) > 10 || Number(match[2]) > 10 ? 2 : 1;
      tries.forEach(function (seconds) {
        if (typeof seconds === 'number' && seconds > 0 && seconds < 5) coins += rate;
      });
    });
  }
  data.headStart = true;
  if (coins) data.earned['head start'] = coins;
  storage.save(KEY, data);
}

grantHeadStart();
