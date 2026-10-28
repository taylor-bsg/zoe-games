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
- **Store layout:** a big view of one squishy (name, a hint, and a buy
  button) and a shelf of all eight as cards (picture, name, price, or "✓
  Mine"). Landscape puts them side by side; portrait puts the shelf under
  the big view. "My coins" is in the top bar, and "Earned … · Spent …" sits
  at the bottom.
- **Big view:** the squishy spins slowly. A drag turns it, and it starts
  spinning again 2.5 s after the drag ends. A tap squishes it: a wobbly
  squash that bounces back, with a squeaky-toy sound.
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
  - The big view renders at up to 1.5× pixel density and 30 frames a second
    while just spinning (full rate while touched or squishing). It stops
    while the app is in the background.
  - The shelf pictures are drawn once with the same renderer and copied into
    images.
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
