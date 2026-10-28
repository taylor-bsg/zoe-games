// The squishy dragons for sale, cheapest first. Four are plush versions of
// the dragons in Zoe Spells; the rest are new. Each look is what squishy.js
// draws: colors (body, belly, horn, wing, cheek, spike, eye) and features
// (spikes, crown, stars). The ids are saved with purchases, so never change
// one; names and prices can change.

export const ITEMS = [
  {
    id: 'sprout', name: 'Sprout', price: 50,
    look: { body: '#4cc26e', belly: '#c3f0cf', horn: '#ffe08a', wing: '#2f9e5b', cheek: '#ff8fab',
      spike: '#ffb84d', eye: '#1d2b53', spikes: true },
  },
  {
    id: 'bubblegum', name: 'Bubblegum', price: 75,
    look: { body: '#ff9ec6', belly: '#ffe3ef', horn: '#fff3bf', wing: '#f783ac', cheek: '#ff6b9d',
      spike: '#f783ac', eye: '#1d2b53' },
  },
  {
    id: 'sunny', name: 'Sunny', price: 75,
    look: { body: '#ffd43b', belly: '#fff3bf', horn: '#ff922b', wing: '#fab005', cheek: '#ff922b',
      spike: '#ff922b', eye: '#1d2b53', spikes: true },
  },
  {
    id: 'frosty', name: 'Frosty', price: 100,
    look: { body: '#74c0fc', belly: '#e7f5ff', horn: '#f8f9fa', wing: '#a5d8ff', cheek: '#ffc9de',
      spike: '#ffffff', eye: '#1d2b53', spikes: true },
  },
  {
    id: 'ember', name: 'Ember', price: 150,
    look: { body: '#fa5252', belly: '#ffd8a8', horn: '#343a40', wing: '#ff922b', cheek: '#ff8787',
      spike: '#ffd43b', eye: '#1d2b53', spikes: true },
  },
  {
    id: 'shade', name: 'Shade', price: 200,
    look: { body: '#3b2f63', belly: '#5f4b8b', horn: '#1e1530', wing: '#7048e8', cheek: '#b197fc',
      spike: '#845ef7', eye: '#e5dbff', spikes: true },
  },
  {
    id: 'galaxy', name: 'Galaxy', price: 250,
    look: { body: '#5f3dc4', belly: '#9775fa', horn: '#ffd43b', wing: '#845ef7', cheek: '#f783ac',
      spike: '#ffd43b', eye: '#1d2b53', stars: true },
  },
  {
    id: 'king', name: 'Dragon King', price: 400,
    look: { body: '#fcc419', belly: '#fff3bf', horn: '#f08c00', wing: '#f59f00', cheek: '#ff8787',
      spike: '#f08c00', eye: '#1d2b53', crown: true },
  },
];
