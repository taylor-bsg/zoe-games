// The squishy dragons for sale, cheapest first. Four are plush versions of
// the dragons in Zoe Spells; the rest are new. Size goes with price: 0.5 for
// the cheapest, 0.05 more for each price step, and 1 for the priciest. The
// pricier ones get flair too. Each look is what squishy.js draws: colors,
// size, and parts (see its header). Until Zoe can afford a squishy, the
// store shows a mystery egg in its size and colors; egg (optional) adds
// parts to that egg, like Shade's sunglasses. The ids are saved with
// purchases, so never change one; names, prices, and looks can change.
// Every look must fit the view at full squash and stretch: after changing a
// size or adding flair, check it as described in SPEC.md.

export const ITEMS = [
  {
    id: 'sprout', name: 'Sprout', price: 50,
    look: { size: 0.5, body: '#4cc26e', belly: '#c3f0cf', horn: '#ffe08a', wing: '#2f9e5b',
      cheek: '#ff8fab', spike: '#ffb84d', eye: '#1d2b53', spikes: true },
  },
  {
    id: 'bubblegum', name: 'Bubblegum', price: 75,
    look: { size: 0.55, body: '#ff9ec6', belly: '#ffe3ef', horn: '#fff3bf', wing: '#f783ac',
      cheek: '#ff6b9d', spike: '#f783ac', eye: '#1d2b53' },
  },
  {
    id: 'sunny', name: 'Sunny', price: 75,
    look: { size: 0.55, body: '#ffd43b', belly: '#fff3bf', horn: '#ff922b', wing: '#fab005',
      cheek: '#ff922b', spike: '#ff922b', eye: '#1d2b53', spikes: true },
  },
  {
    id: 'frosty', name: 'Frosty', price: 100,
    look: { size: 0.6, body: '#74c0fc', belly: '#e7f5ff', horn: '#f8f9fa', wing: '#a5d8ff',
      cheek: '#ffc9de', spike: '#ffffff', eye: '#1d2b53', spikes: true },
  },
  {
    id: 'ember', name: 'Ember', price: 150,
    look: { size: 0.65, body: '#fa5252', belly: '#ffd8a8', horn: '#343a40', wing: '#ff922b',
      cheek: '#ff8787', spike: '#ffd43b', eye: '#1d2b53', spikes: true, wings: 1.3 },
  },
  {
    id: 'shade', name: 'Shade', price: 200,
    look: { size: 0.7, body: '#3b2f63', belly: '#5f4b8b', horn: '#1e1530', wing: '#7048e8',
      cheek: '#b197fc', spike: '#845ef7', eye: '#e5dbff', spikes: true,
      glasses: 'sun', acc: '#f783ac', acc2: '#141218' },
    egg: { glasses: 'sun' },
  },
  {
    id: 'professor', name: 'Professor', price: 225,
    look: { size: 0.75, body: '#63e6be', belly: '#e6fcf5', horn: '#fff3bf', wing: '#20c997',
      cheek: '#ffa8a8', spike: '#20c997', eye: '#1d2b53',
      glasses: 'round', bowtie: true, acc: '#6b3f24', acc2: '#e03131' },
  },
  {
    id: 'galaxy', name: 'Galaxy', price: 250,
    look: { size: 0.8, body: '#5f3dc4', belly: '#9775fa', horn: '#ffd43b', wing: '#845ef7',
      cheek: '#f783ac', spike: '#ffd43b', eye: '#1d2b53', stars: true, wings: 1.3, heads: 2 },
  },
  {
    id: 'dj', name: 'DJ Bop', price: 275,
    look: { size: 0.85, body: '#3bc9db', belly: '#e3fafc', horn: '#fff3bf', wing: '#1098ad',
      cheek: '#ff8fab', spike: '#f06595', eye: '#1d2b53', spikes: true,
      headphones: true, acc: '#343a40', acc2: '#f06595' },
  },
  {
    id: 'party', name: 'Party Puff', price: 300,
    look: { size: 0.9, body: '#ffa94d', belly: '#fff4e6', horn: '#fff3bf', wing: '#f76707',
      cheek: '#ff6b6b', spike: '#f76707', eye: '#1d2b53',
      hat: true, acc: '#cc5de8', acc2: '#ffd43b' },
  },
  {
    id: 'angel', name: 'Angel', price: 350,
    look: { size: 0.95, body: '#a5d8ff', belly: '#ffffff', horn: '#ffe066', wing: '#ffe8a3',
      cheek: '#ffc9de', spike: '#ffffff', eye: '#1d2b53', wings: 1.6, halo: true, acc: '#ffd43b' },
  },
  {
    id: 'king', name: 'Dragon King', price: 400,
    look: { size: 1, body: '#fcc419', belly: '#fff3bf', horn: '#f08c00', wing: '#f59f00',
      cheek: '#ff8787', spike: '#f08c00', eye: '#1d2b53', crown: true,
      wings: 1.25, tail: 1.35, tailTip: true, acc2: '#e03131' },
  },
];
