# store: Squishy Store

A request from Zoe, passed on by the user, verbatim (2026-10-28):

> Okay now, here comes a request from Zoe. On the main page, she wants to be able to click on a button that leads to a “store” which you can buy items with coins. She requested squishmellows, maybe we can do some cool 3D rendering of squishmellow-like dragons similar to the ones in the game.  Each level should award a number of coins according to difficulty.  Practically speaking, you may want to track “earned” coins and “spent” coins.

## Clarifications

Answers to questions asked before building:

- **Zoe Spells coins:** only for finishing a wall, as one big prize per
  level: 100, 200, 300, and 400 coins for levels 1–4.
- **Times Tables coins:** 1 coin per right answer on 10×10, 2 on 15×15.
- **3D:** real 3D, with no library.
- **Head start:** yes. Progress from before coins existed counts once, at the
  same rates.

Stated before building: "Squishmallows" is a brand name and this site is
public, so the store sells original squishy plush dragons modeled on the
game's dragons, called squishy dragons.

## Changes

Requested by the user, verbatim (2026-10-28):

> The store is cute but crowded. Instead of having all of the critters at the bottom have arrow buttons to go to the next critter. Then you can display the critter much larger.

The shelf of all eight is gone. One squishy fills the store, with ◀ ▶ arrows
to the others, and it's drawn about twice as tall as before.

> Make it so the swiping down on it stretches/compresses it proportionally to the swipe distance

Swiping down squashes the squishy in step with the finger, and swiping up
stretches it. Letting go springs it back with a jiggle. Sideways swipes
still spin it.

## Implementation notes

- **Getting there:** a pink "🛍️ Store" button with the coin balance, at the
  top right of the game list next to mute. On narrow screens they wrap under
  the title.
- **Coins:** a gold coin with a star, drawn in SVG (`coins.ICON`), since
  Apple's 🪙 emoji is a silver coin that looks gray when small.
  - Earning shows a floating "+N" and a coin. Times Tables floats it from
    the answer box. Zoe Spells floats it from the tally after the wall
    celebration, plays a "ching", and says "You won 200 coins!".
  - Zoe Spells' start screen shows the level's prize: "Finish the wall to
    win 200" or "Wall prize won: 200 ✓".
- **Store layout:** one squishy at a time, as big as fits, with round
  yellow ◀ ▶ arrows (80px; 64px on phones) floating over the left and right
  edges of the view. The arrows wrap around from the last squishy to
  the first, and the left and right arrow keys work too, for a laptop.
  - Under the squishy (beside it in landscape): the name, a dot for each of
    the eight (the one on screen is ringed, owned ones are gold), a hint,
    and the buy button.
  - "My coins" is in the top bar, and "Earned … · Spent …" sits at the
    bottom.
  - A new squishy hops in with a little wobble, facing three-quarters
    forward.
- **Big view:** the squishy spins slowly, and these work on it:
  - **Sideways swipe:** turns it. It starts spinning again 2.5 s after the
    swipe ends.
  - **Swipe down:** squashes it in step with the finger. Swiping half the
    view's height squashes it fully, to about 0.75× tall and wider, and it
    goes no further.
  - **Swipe up:** stretches it the same way, to at most about 1.17× tall.
  - **Letting go:** it springs back with a wobbly jiggle, and squeaks if it
    was squashed or stretched more than a little.
  - **Tap:** a quick squish that bounces back, with the squeak.
  - **Which gesture:** the first 10px of a swipe decide whether it spins or
    squashes. The hint reads "Swipe sideways to spin, down to squish!".
- **Buying:** "Buy for 75" when there are enough coins, then a "ching",
  the fanfare, confetti, a squish, and "You got Bubblegum! 🎉". The button
  then reads "💖 It’s yours!", and tapping it squishes.
  - Without enough coins, it reads "Need 25 more"; tapping it wiggles the
    button and says "Play games to earn more coins!".
  - Each squishy can be bought once. The store opens on the first one Zoe
    doesn't own yet.
- **Squishies** (`items.js`):

  | Squishy | Coins | Look |
  | --- | --- | --- |
  | Sprout | 50 | Green, like the level 1 dragon |
  | Bubblegum | 75 | Pink |
  | Sunny | 75 | Yellow |
  | Frosty | 100 | Ice blue, like the level 2 dragon |
  | Ember | 150 | Red with dark horns, like the level 3 dragon |
  | Shade | 200 | Shadow purple with glowing eyes, like the level 4 dragon |
  | Galaxy | 250 | Purple with gold stars |
  | Dragon King | 400 | Gold, with a crown |

  All eight cost 1,300 coins. The four Zoe Spells walls pay 1,000.
- **3D** (`squishy.js`): WebGL 1 and one fragment shader that ray-marches
  signed distance shapes melted together. Each dragon has a round body,
  feet, a tail, horns, small wings, and spikes or a crown on some.
  - It's lit like soft fabric: wrapped light, darker creases, a rim glow,
    and a faint fuzz.
  - The face (eyes, cheeks, a smile) and the belly are painted on, so they
    turn with the body.
  - The camera zooms in as far as the squishy still fits the view's shape
    at any turn, even fully squashed or stretched.
  - Checked: every squishy at full squash, full stretch, and rest, every 6°
    of turn, in every store layout from phone to 12.9-inch iPad. Nothing
    reaches the edge; the closest is 7px, on a phone.
  - Squashing and stretching keep the 3D surface exact, with no holes.
  - The view renders at up to 1.25× pixel density and 30 frames a second
    while just spinning (full rate while touched or squishing). It stops
    while the app is in the background.
  - Without WebGL, a 🐉 stands in.
- **Head start:** given once, the first time any page loads after the
  update. It's recorded as a separate "head start" source.
  - Zoe Spells: the wall prize for every level below the highest open one.
  - Times Tables: 1 or 2 coins for each saved try under 5 s. Only the last 3
    tries per problem are saved, and wrong tries are saved as 5 s.
- **Saved data:** under `zoe-games:coins`:
  - `earned`: source → coins. The sources are `01-times-table`,
    `02-spelling`, and `head start`.
  - `spent`: one `{ item, price, at }` per purchase.
  - `headStart`: true once the head start is given.
  - The balance is earned minus spent. Every change re-reads storage first,
    so pages never overwrite each other's coins.
- **Zoe Spells prize:** paid once per finished wall (`paid` in its saved
  data). A wall that slips and is finished again doesn't pay twice.
  Clearing a wall with "Hold to clear the wall" makes its prize winnable
  again, since finishing it means answering every word again.
