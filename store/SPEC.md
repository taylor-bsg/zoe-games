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

> I think you can add more diversity. The cheaper ones can be a little smaller. Give some random flair to the more expensive ones: glasses, a bigger tail, bigger wings , headphones, etc

Squishies now come in sizes by price, and the pricier ones get flair:
glasses, sunglasses, headphones, a party hat, a halo, a bow tie, bigger
wings, and a big tail with a ball on the tip. Four new squishies show the
flair off. The existing eight keep their names and prices.

> Make it so you can’t see the squish unless you have enough money or you own it

A squishy Zoe doesn't own and can't afford is now a mystery egg. When she
first has enough coins for one, its egg is ready to hatch: tapping it
reveals the squishy, which can then be bought.

> The color of the egg should match the inside squishiness. The shade one should have sunglasses.

Each egg now comes in its squishy's colors, so the colors hint at what's
inside. Shade's egg wears Shade's pink sunglasses instead of the question
mark.

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
- **Mystery eggs:** what the store shows for each squishy depends on its
  state.
  - **Locked** (not owned, not enough coins): a 3D egg that rocks gently.
    The name reads "Mystery egg", the button "Need 25 more", and the hint
    "What’s inside? Earn coins to find out!". Tapping the egg squishes it;
    tapping the button wiggles it and says "Play games to earn more
    coins!". The egg's colors and the price are the clues.
  - **Egg colors:** each egg is its squishy's body color, with spots in its
    belly, wing, and spike colors and a big ? on the front: navy, or white
    on a dark egg. Galaxy's egg has gold stars instead of spots. Shade's
    egg wears Shade's pink sunglasses instead of the ?.
  - **Ready** (enough coins, never hatched): the egg wiggles excitedly every
    1.6 s. The button reads "🥚 Hatch it!" and the hint "It’s ready to hatch!
    Tap it!". The store opens on a ready egg if there is one.
  - **Hatching:** a tap on the egg or the button makes it rock harder and
    harder, peeping three times, for 1.1 s. Then it pops open: the squishy
    appears with a stretch and a bounce, a fanfare, and stars, and the hint
    reads "Meet Sprout! 🎉". Hatching waits for a tap partly because iOS
    only plays sound after one.
  - **Hatched** (enough coins): the squishy shows as usual and can be bought.
    If spending later leaves too few coins, it's a locked egg again (as
    asked). When there are enough again, it shows without hatching.
  - **Owned:** always visible.
- **Buying:** "Buy for 75" when there are enough coins, then a "ching",
  the fanfare, confetti, a squish, and "You got Bubblegum! 🎉". The button
  then reads "💖 It’s yours!", and tapping it squishes.
  - Without enough coins, it reads "Need 25 more"; tapping it wiggles the
    button and says "Play games to earn more coins!".
  - Each squishy can be bought once. The store opens on the first one Zoe
    doesn't own yet.
- **Squishies** (`items.js`). Size is relative to the largest.

  | Squishy | Coins | Size | Look and flair |
  | --- | --- | --- | --- |
  | Sprout | 50 | 82% | Green, like the level 1 dragon |
  | Bubblegum | 75 | 85% | Pink |
  | Sunny | 75 | 85% | Yellow |
  | Frosty | 100 | 90% | Ice blue, like the level 2 dragon |
  | Ember | 150 | 94% | Red, like the level 3 dragon; bigger wings |
  | Shade | 200 | 96% | Shadow purple, like the level 4 dragon; pink sunglasses |
  | Professor | 225 | 100% | Mint; round glasses and a red bow tie (new) |
  | Galaxy | 250 | 90% | Purple with gold stars; big wings |
  | DJ Bop | 275 | 100% | Cyan with pink spikes; headphones (new) |
  | Party Puff | 300 | 87% | Orange; a striped party hat with a pom-pom (new) |
  | Angel | 350 | 88% | Sky blue; a glowing halo and big gold wings (new) |
  | Dragon King | 400 | 90% | Gold; a crown, bigger wings, and a big tail with a ruby ball |

  - Squishies with big flair (wings, hats, tails) are a little smaller, so
    the flair still fits the view; the flair makes them look grander anyway.
  - All twelve cost 2,450 coins. The four Zoe Spells walls pay 1,000.
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
  - Without WebGL, a 🐉 stands in (a 🥚 for a mystery egg).
  - Every squishy is drawn with the same zoom, so their sizes compare. The
    zoom is set so the largest still fits; each squishy's size in
    `items.js` keeps it inside. A big tail curves up behind, which keeps it
    longer without pushing past the edges.
  - **Flair parts:** glasses are rings over the painted eyes, turned to
    follow the head, with a bridge and arms. Sunglasses add dark lenses that
    hide the eyes. Headphones are a band over the top, in front of the
    horns, and two cups. The party hat is striped, with a white pom-pom. The
    halo is a tilted ring that glows. The bow tie is two bows and a knot
    under the smile.
  - **Draw cost:** the most elaborate squishy (Shade: sunglasses and spikes)
    takes about 1.3× as long to draw as a plain one. The glasses are only
    worked out near the face, which keeps that down on older iPads.
  - **The egg:** drawn by the same renderer (`egg` in a look), with the
    spots and question mark painted on so they turn with the egg. A tilt
    rocks it about the spot where it touches the floor. `store.js` makes
    each egg's look from its squishy's colors; `egg` in `items.js` adds
    parts to it, like Shade's sunglasses.
  - **Egg glasses:** fitted to the egg's curve. Each lens faces straight
    out from the egg, leaning back with it, and the arms wrap back to its
    sides.
  - **Fit check:** `fit-check.html` (in this folder, not linked from the
    store) draws every squishy, and an egg with sunglasses, at full squash,
    full stretch, and rest, every 6° of turn, in every store layout, and
    reports how close each comes to the edge. Run it after changing a size
    or adding flair. At this change, the closest was 1.3% of the view's
    height (Professor and DJ Bop, fully stretched), and the egg 16.2%.
- **Head start:** given once, the first time any page loads after the
  update. It's recorded as a separate "head start" source.
  - Zoe Spells: the wall prize for every level below the highest open one.
  - Times Tables: 1 or 2 coins for each saved try under 5 s. Only the last 3
    tries per problem are saved, and wrong tries are saved as 5 s.
- **Saved data:** under `zoe-games:store`: `hatched`, the ids of the
  squishies whose eggs Zoe has hatched. Coins are under `zoe-games:coins`:
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
