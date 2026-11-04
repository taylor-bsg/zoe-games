# store: Squishy Store

A request from Zoe, passed on by the user, verbatim (2026-10-28):

> Okay now, here comes a request from Zoe. On the main page, she wants to be able to click on a button that leads to a “store” which you can buy items with coins. She requested squishmellows, maybe we can do some cool 3D rendering of squishmellow-like dragons similar to the ones in the game.  Each level should award a number of coins according to difficulty.  Practically speaking, you may want to track “earned” coins and “spent” coins.

## Clarifications

Answers to questions asked before building:

- **Zoe Spells coins:** only for finishing a wall, as one big prize per
  level: 100, 200, 300, and 400 coins for levels 1–4. (Levels 2A and 2B,
  added later, pay 200 each.)
- **Zoe Multiplies coins:** 1 coin per right answer on 10×10, 2 on 15×15.
  (Since 2026-10-30, 10 coins per new record instead, and since 2026-10-31,
  4 coins for every 0.02 s faster; see `01-times-table/SPEC.md`.)
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

> Make the squisheggs sized according to how big the squishdragon is.

Each egg is now scaled by its squishy's size.

> Make one of the dragons have two heads

Galaxy now has two heads, each with its own face and horns. Galaxy got them
because it's one of the pricier squishies and isn't a copy of a Zoe Spells
dragon, while most of the others wear something on the head (glasses,
headphones, a hat, a halo, a crown). It's now full size, with slightly
smaller wings, so it doesn't look smaller than its neighbors and still
fits the view.

> I think we should make the dragon size range go from 50 to 100%
>
> Give them skinny long necks

Sizes now go with price: Sprout, the cheapest, is half the size of Dragon
King, the priciest, and each price step between adds 5%. The view zooms
out about 10% so that Dragon King fits at full size. This replaces the
earlier sizes, including Galaxy's full size. "Them" is Galaxy's two heads,
which were on short necks: they now sit up on long, skinny necks.

Requested by the user, verbatim (2026-10-29):

> Party puff should have a big chinchilla tail

Party Puff's little tail is now a big, bushy one like a chinchilla's. It
curls up behind its back and over to one side, so the cream tip peeks up
beside its head from the front.

Requested by the user, verbatim (2026-10-30):

> It feels like we should charge something for hatching an egg. Maybe 20%? But it stays hatched.

Asked whether an egg should be ready to hatch once Zoe can afford the
squishy or just the fee, the user chose the squishy, as before. Hatching
now costs a fifth of the squishy's price, and a hatched squishy stays out
of its egg even when she can't afford it. Only the button hatches, so
tapping an egg can't spend coins by accident. (The same message asked
about Zoe Multiplies' coins; see `01-times-table/SPEC.md`.)

Requested by the user, verbatim (2026-10-31):

> Let’s add some new squishies, even more expensive. Something gyrados like and something dragonite like.

Asked, the user chose their prices, 600 and 800, and the names Butterscotch
and Riptide. They're original designs that only borrow those creatures'
looks, with original names, since the site is public.

- **Butterscotch** (600): a chubby orange dragon with two thin antennae
  curling forward instead of horns, a big cream belly with stripes across
  it, and teal wings.
- **Riptide** (800): a blue sea serpent coiled on the floor. Its neck rises
  to a head with a white crest and swept-back fins (and long whiskers,
  taken off later at the user's request), and a fierce face: frowning
  brows and an open mouth with two fangs (later a smile, at the user's
  request). A yellow belly runs down its neck in scale bands, and its tail
  curls up at the back with a fin.
- Sizes still go from 50% to 100% by price, in even steps, so the others
  shrank a little; Riptide is the biggest.

Requested by the user, verbatim (2026-10-31):

> Butterscotch should look more like a dragonite

Butterscotch now has that build instead of the round squishy shape: a big
round body with a head on top, a round snout with nostrils and a smile
across it, stubby arms, a thicker tail, and its small teal wings up on its
back. The antennae and the striped belly stay.

Requested by the user, verbatim (2026-10-31):

> Make butterscotch come out of a cube shaped egg.
> Give butterscotch dog ears instead of antennae

Butterscotch's mystery egg is now a soft cube, with rounded edges, spots in
its colors, and the ? on the front face. Its antennae are now long, floppy
dog ears hanging down the sides of its head, in a darker orange (taken off
later at the user's request).

Reported by the user, verbatim (2026-10-31):

> There is a big delay when you get to the store, on a Chromebook. Is this because it pre-renders everything?

It doesn't pre-render: the store only draws the squishy on screen. The
delay was the one-time compile of the 3D program, which the store waited
for before showing anything. On a Mac it takes about 0.15 s, but it's
processor work, and a budget Chromebook's processor and graphics drivers
can take seconds. Now the store shows at once, with the squishy as a big
emoji (🥚 or 🐉) while the 3D view compiles in the background; then the 3D
squishy takes its place. Everything works meanwhile, including hatching.

Asked next, verbatim (2026-10-31):

> Is there some way to make it more incremental, or to do it in the background?

Version 0.7.27 had the main page compile the store's 3D program in the
background, to fill the browser's cache before the store. It made the
store's compile ten times faster on a Mac, but the user reported, verbatim:

> Okay that really did not work. Now at the main page it takes 30 seconds before it is even responsive. And when I do go to the store and go back the 30 seconds seems to start again.

So on that Chromebook the compile takes about 30 s, freezes the whole page
while it runs (it isn't really in the background there), and isn't kept
between pages. Version 0.7.28 removed the warm-up.

To find out why, `store/speed-check.html` timed the compile on that
Chromebook (reached by a temporary "Speed check" link on the main page,
since it can't open other addresses). It has Intel UHD 600 graphics, drawn
in hardware (25 ms a picture, smooth enough), and the page didn't freeze
while compiling. The one 3D program with every squishy's parts took 14.7 s
to compile, 10.7 s without the crease shading, and with only an egg's
parts, 0.8 s. So the time goes into the size of the program, which held
every squishy's parts at once, copied about nine times over by the
compiler.

Version 0.7.30 compiles a separate, small program for each combination of
parts a squishy needs (Sprout, Sunny, Frosty, and Ember share one), when
it's first shown. Its emoji shows until then, and the squishies likely to
come next compile in the background. Every squishy and egg looks the same
as before: compared pixel by pixel, at most 4 single pixels differed, by
5/255.

Rerun on that Chromebook, each program compiled in 0.2–1.3 s: eggs 0.2 s
(0.65 s with sunglasses), most squishies 0.35–0.6 s, Shade and Party Puff
0.8 s, and Riptide, the serpent, 1.3 s. The page didn't freeze. Without the
crease shading, Party Puff's took 0.66 s instead of 0.81 s, too little to
give it up. The temporary "Speed check" link came off the main page in
version 0.7.31; `speed-check.html` stays, unlinked, like `fit-check.html`.

Requested by the user, verbatim (2026-10-31):

> Get rid of riptide’s whiskers

Riptide no longer has whiskers.

Requested by the user, verbatim (2026-10-31):

> Riptide should smile; also his egg should be a sphere

Riptide now smiles: round eyes and a big open smile with a pink tongue and
its two fangs, now little ones. The frowning brows are gone, and it has
rosy cheeks like the other squishies (added to go with the smile). Its
mystery egg is a ball instead of an oval.

Requested by the user, verbatim (2026-11-01):

> Create a new squish dragon which comes from a heart shaped egg and is a love dragon

Asked, the user chose its price, 1000, which makes it the priciest and the
biggest, and its name, Valentine. Valentine is a rose-pink dragon with red
heart-shaped wings, a red heart on the end of its tail, a heart-shaped
belly and cheeks, and little white hearts over its back and sides. Its
mystery egg is a puffy pink heart standing on its point, with little
hearts on it. Sizes still go from 50% to 100% by price, in even steps, so
the others shrank a little.

Requested by the user, verbatim (2026-11-01):

> Get rid of the ears on butterscotch

Butterscotch's floppy dog ears are gone, so nothing is on its round head.

Requested by the user, verbatim (2026-11-01):

> Create a female lawyer squishmellow

Asked, the user chose her price, 500 (between Dragon King and
Butterscotch), and her name, Justice. Justice is a lavender dragon in a
navy skirt suit with a white shirt collar and gold buttons, with long
eyelashes and a hair bun with a pencil through it, and her brown briefcase
stands at her side. Her egg is a plain one in her colors. Sizes still go
from 50% to 100% by price, in even steps, so most of the others shrank a
little. With sixteen squishies, the dots under the name are a little
smaller and closer together, and wrap onto a second line where there isn't
room for one.

Requested by the user, verbatim (2026-11-02):

> Okay, Zoe would like to see a shelf that has all of the squish dragons she has acquired so far.

Asked, the user chose: a "My shelf" button on the main page and one in the
store; only the squishies she has bought, with a count like "5 of 16"; and
tapping one makes it spin around once with a squish and a squeak, and say
its name.

Requested by the user, verbatim (2026-11-03):

> Can we prototype a fun mode for the bookshelf, where there is a donkey Kong like maze pattern to the bookshelf, and a monkey that throws barrels down and the squish mellows jump over them? The squish mellows move up the maze but then take a slide down to the bottom.

A first version, to try and change: a 🐒 button on the shelf turns the
bookcase into a monkey maze, which plays by itself. A monkey at the top
throws barrels that roll down slanted shelves into a basket, while her
squishies climb up, jumping over the barrels, and ride a slide back down.
Tapping a squishy makes it hop and say its name; tapping the monkey makes
it throw a barrel.

Requested by the user, verbatim (2026-11-03):

> The monkey sounds needs an actual recording of a monkey. Also when the barrels hit the squish dragons coming up the ladder, it should cause them to fall upside down to the lower level.

The monkey's call is now a real recording, a chimpanzee at the Leipzig
Zoo, instead of the read-aloud "Ooh ooh, ah ah!". It plays when the maze
opens and when the monkey is tapped. And a barrel rolling past the top of
a ladder now knocks off a squishy climbing it: it falls upside down to
the level below, lies there kicking, flips back up, and waits for the
coast to be clear before climbing again.

Reported by the user, verbatim (2026-11-03):

> On iOS I see no falling monkeys, and some walking monkeys have barrels pass right through them.

Near the ladders, walking squishies didn't jump, and barrels were meant to
roll behind them, which looked just like passing through them. Now they
jump there too, and a squishy reaching the bottom of a ladder waits there,
jumping any barrel about to roll by, before it climbs. A knocked-off
squishy lands beside the ladder, toward the middle of the shelf; barrels
roll up and over it while it's down, and it walks back to the ladder once
it's up. In testing, no barrel passed through a standing, walking, or
climbing squishy, with 12–25 falls a minute with six squishies. (The iPad
may have still had the earlier version, from before falls, which would
explain seeing none; the main page shows the version.)

## Implementation notes

- **Getting there:** a pink "🛍️ Store" button with the coin balance, at the
  top right of the game list next to mute. On narrow screens they wrap under
  the title.
- **Coins:** a gold coin with a star, drawn in SVG (`coins.ICON`), since
  Apple's 🪙 emoji is a silver coin that looks gray when small.
  - Earning shows a floating "+N" and a coin. Zoe Multiplies floats it from
    the coin goal beside the speed score. Zoe Spells floats it from the tally
    after the wall celebration, plays a "ching", and says "You won 200
    coins!".
  - Zoe Spells' start screen shows the level's prize: "Finish the wall to
    win 200" or "Wall prize won: 200 ✓".
- **Store layout:** one squishy at a time, as big as fits, with round
  yellow ◀ ▶ arrows (80px; 64px on phones) floating over the left and right
  edges of the view. The arrows wrap around from the last squishy to
  the first, and the left and right arrow keys work too, for a laptop.
  - Under the squishy (beside it in landscape): the name, a dot for each
    squishy (the one on screen is ringed, owned ones are gold; they wrap
    onto a second line where there isn't room for one), a hint, and the
    buy button.
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
  - **Locked** (never hatched, not enough coins to buy it): a 3D egg that
    rocks gently.
    The name reads "Mystery egg", the button "Need 25 more", and the hint
    "What’s inside? Earn coins to find out!". Tapping the egg squishes it;
    tapping the button wiggles it and says "Play games to earn more
    coins!". The egg's colors and the price are the clues.
  - **Egg size:** each egg is drawn at its squishy's size from `items.js`
    (see the table below), so a smaller squishy hatches from a smaller egg.
  - **Egg colors:** each egg is its squishy's body color, with spots in its
    belly, wing, and spike colors and a big ? on the front: navy, or white
    on a dark egg. Galaxy's egg has gold stars instead of spots. Shade's
    egg wears Shade's pink sunglasses instead of the ?. Butterscotch's egg
    is a cube, Riptide's a ball, and Valentine's a heart, with little hearts
    in its other colors instead of spots.
  - **Ready** (enough coins to buy it, never hatched): the egg wiggles
    excitedly every 1.6 s. The button reads "🥚 Hatch for 10" (a fifth of
    the price) and the hint "It’s ready to hatch! Tap “Hatch” to see
    inside.". Tapping the egg squishes it and wiggles the button, pointing
    to it. The store opens on a ready egg if there is one.
  - **Hatching:** tapping the button pays the fee with a "ching" (the purse
    bounces), and the egg rocks harder and harder, peeping three times, for
    1.1 s. Then it pops open: the squishy appears with a stretch and a
    bounce, a fanfare, and stars, and the hint reads "Meet Sprout! 🎉".
    Taps during the hatching do nothing.
  - **Hatched:** the squishy shows as usual from then on, whatever Zoe's
    coins: "Buy for 50", or "Need 10 more" when hatching left too few.
    Squishies hatched before hatching cost anything stay hatched too.
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
  | Sprout | 50 | 50% | Green, like the level 1 dragon |
  | Bubblegum | 75 | 54% | Pink |
  | Sunny | 75 | 54% | Yellow |
  | Frosty | 100 | 57% | Ice blue, like the level 2 dragon |
  | Ember | 150 | 61% | Red, like the level 3 dragon; bigger wings |
  | Shade | 200 | 64% | Shadow purple, like the level 4 dragon; pink sunglasses |
  | Professor | 225 | 68% | Mint; round glasses and a red bow tie (new) |
  | Galaxy | 250 | 71% | Purple with gold stars; two heads on long, skinny necks, and bigger wings |
  | DJ Bop | 275 | 75% | Cyan with pink spikes; headphones (new) |
  | Party Puff | 300 | 79% | Orange; a striped party hat with a pom-pom, and a big chinchilla tail (new) |
  | Angel | 350 | 82% | Sky blue; a glowing halo and big gold wings (new) |
  | Dragon King | 400 | 86% | Gold; a crown, bigger wings, and a big tail with a ruby ball |
  | Justice | 500 | 89% | Lavender; a lawyer in a navy skirt suit, with eyelashes, a hair bun with a pencil, and a briefcase (new) |
  | Butterscotch | 600 | 93% | Orange; a round body with a head on top, a snout, stubby arms, a striped cream belly, and teal wings; hatches from a cube (new) |
  | Riptide | 800 | 96% | A blue sea serpent with a crest, fins, and a big smile; hatches from a ball (new) |
  | Valentine | 1000 | 100% | Rose pink; red heart wings, a red heart on its tail, a heart-shaped belly and cheeks, and little white hearts; hatches from a heart (new) |

  - Size goes with price, in even steps from 50% for the cheapest to 100%
    for the priciest. The view's zoom leaves room for a full-size Dragon
    King, with its crown, wings, and big tail, and Riptide and Valentine
    fit inside it.
  - All sixteen cost 5,350 coins, plus 1,070 to hatch them. The six Zoe Spells
    walls (levels 1–4, 2A, and 2B) pay 1,400, and Zoe Multiplies pays 5 for
    every 0.01 s faster (0.02 s over 3 s, 0.03 s over 4 s). Both also pay
    1 for every 25 right answers. Zoe Writes pays 2 for each perfect word
    until its sticker (at most 6 a word) and 50 for each full notebook
    page: 2,600 for its four levels.
- **3D** (`squishy.js`): WebGL 1 and one fragment shader that ray-marches
  signed distance shapes melted together. Each dragon has a round body,
  feet, a tail, horns, small wings, and spikes or a crown on some. Galaxy
  has two heads on long necks instead, and Riptide is a sea serpent (see
  Flair parts).
  - It's lit like soft fabric: wrapped light, darker creases, a rim glow,
    and a faint fuzz.
  - The face (eyes, cheeks, a smile) and the belly are painted on, so they
    turn with the body.
  - The camera zooms in as far as the squishy still fits the view's shape
    at any turn, even fully squashed or stretched.
  - Checked: every squishy at full squash, full stretch, and rest, every 6°
    of turn, in every store layout from phone to 12.9-inch iPad. Nothing
    reaches the edge; the closest is 7px, Valentine's tail fully squashed
    on a phone.
  - Squashing and stretching keep the 3D surface exact, with no holes.
  - The view renders at up to 1.25× pixel density and 30 frames a second
    while just spinning (full rate while touched or squishing). It stops
    while the app is in the background.
  - **A program per squishy:** each squishy (and each kind of egg) is
    drawn by a program with only its parts: an egg, the serpent, or a
    dragon with only its own flair (`#define`s in `squishy.js`, chosen by
    its `parts()`). Programs are compiled when first needed, and kept while
    the store is open; squishies with the same parts share one.
  - Until a squishy's program has compiled, its emoji stands in (🐉, or 🥚
    for a mystery egg), and without WebGL, or if the compile fails, for
    good. Where the browser compiles in the background
    (`KHR_parallel_shader_compile`, as Chrome and Safari do), the store
    checks each frame without waiting; elsewhere it first lets the store
    show for a couple of frames, then waits for the compile.
  - **Compiling ahead:** once the squishy on screen is drawn, the store
    compiles, one at a time in the background, the squishy inside the egg
    on screen if it's ready to hatch (so it appears in 3D as it hatches),
    then the next squishy and the one before. An egg that can't hatch yet
    needs only the egg program, which all plain eggs share. (Asked by the
    user, verbatim: "If the egg is not hatched yet, you do not need to
    render it?" Before 0.7.32 it compiled the squishy inside any egg.)
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
  - **Chinchilla tail** (`fluffyTail`): seven puffs, melted smoothly
    together, that grow fatter as they curl up behind the back and over to
    one side. It's the body color with a cream (belly color) tip, which
    peeks up beside the head from the front. It replaces the usual tail.
  - **Chubby build** (`chubby`, Butterscotch): a different build. A big
    round body has a head on top, melted on with no neck, and a round snout
    on the head; stubby arms tip out from the sides. It has no horns or
    ears, and the wings sit up on the back. The face is painted on the
    head and snout: eyes, cheeks, two nostrils, and a smile across the
    snout. The big belly has thin stripes across it.
  - **Sea serpent** (`serpent`, Riptide): its own shape instead of a
    dragon's. A ring lying on the floor is the coil, and a neck in two
    tapering segments rises from its front to an oval head. On the head are
    a crest of three spikes and two swept-back fins. The tail rises from
    the back of the coil to a fin. The face is painted friendly: round
    eyes, rosy cheeks, and a big open dark-red smile with a pink tongue and
    two little fangs. The yellow belly widens down the neck, in scale
    bands. It has no wings, feet, or horns.
  - **Two heads** (`heads: 2`): a lower body with two round heads up on
    long, skinny necks that lean apart. The heads turn a little away from
    each other and tip out. Each has its own painted face, at 47% of the
    usual size, and two small horns; the belly is painted on the body.
    Spikes, crown, glasses, headphones, hat, and halo are placed for one
    head, so a two-headed squishy can't wear them yet.
  - **Lawyer** (`lawyer`, Justice): a suit is painted over her body below
    the face, in the belly color instead of a belly, its top edge rising a
    little toward the sides and back, leaving her feet and tail bare. At
    the front, a white shirt shows in a V between the lapels, which have a
    darker edge, with a white collar point over each lapel and two gold
    buttons below. Three eyelashes curl off the top outer edge of each
    eye. A round hair bun (acc) sits on top of her head, with a pencil
    through it: pink eraser, metal band, yellow paint, bare wood, and lead.
    Her briefcase (acc2) is a rounded box with a handle and a gold clasp on
    each side, standing on the floor at her left side, turned to face
    forward, so it shows when she first appears.
  - **Love dragon** (`hearts`, Valentine): its wings are puffy hearts, in
    the wing color, their points at the shoulders and their lobes out and
    up, facing front and back: big hearts from behind, peeking over the
    shoulders from the front. A smaller puffy heart on the end of the tail
    faces the sides. The belly patch and cheeks are painted as hearts, and
    little hearts (acc color) are printed upright over the back and sides,
    in rows around the body, but not on the face. Each heart's outline is
    an exact 2D heart (after Inigo Quilez's distance functions). The wings
    are placed and sized so they fit the view at any turn, squash, or
    stretch.
  - **Draw cost:** the most elaborate squishy (Shade: sunglasses and spikes)
    takes about 1.3× as long to draw as a plain one. The glasses are only
    worked out near the face, which keeps that down on older iPads. Two
    heads on necks cost little: at the same size, Galaxy draws in 1.0–1.2×
    plain Sprout's time. Riptide and Justice take about 1.0×, Butterscotch
    0.75×, and Valentine 0.8× (measured on a Mac in version 0.8.5).
  - **The egg:** drawn by the same renderer (`egg` in a look), with the
    spots and question mark painted on so they turn with the egg. A tilt
    rocks it about the spot where it touches the floor. `store.js` makes
    each egg's look from its squishy's size and colors; `egg` in `items.js`
    adds parts to it, like Shade's sunglasses, Butterscotch's cube,
    Riptide's ball, or Valentine's heart.
  - **Cube egg** (`cube`): a cube 1.24 across with edges rounded by 0.16.
    As it rocks it rises just enough that its lowest rounded corner stays on
    the floor, worked out for its turn, so it tips onto a corner instead of
    sinking in. Its spots and ? are painted in the cube's own space, so they
    stay put as it rocks; the spots sit where its flat faces cut through
    them, scattered across about two in five places.
  - **Ball egg** (`sphere`): a ball 1.48 across, a little wider than the
    usual egg and not as tall. It doesn't roll away as it rocks: the ball
    stays put and its spots and ? turn about its middle, so it rocks by
    turning in place.
  - **Heart egg** (`heart`): a puffy heart standing on its rounded point,
    about 1.55 tall, 1.75 across, and 0.85 deep: a rounded cone from the
    point up to each round lobe, melted together, less at the point so it
    stays slim. It rocks on its point. Its little hearts are printed like
    Valentine's, in its belly, wing, and acc colors, but none near the ?
    or the point.
  - **Egg glasses:** fitted to the egg's curve. Each lens faces straight
    out from the egg, leaning back with it, and the arms wrap back to its
    sides.
  - **Fit check:** `fit-check.html` (in this folder, not linked from the
    store) draws every squishy, an egg with sunglasses, a cube egg, a ball
    egg, and a heart egg, at full squash, full stretch, and rest, every 6°
    of turn, in every store layout, and reports how close each comes to
    the edge. Run it after changing a size or adding flair. At this
    change, the closest was 1.5% of the view's height (Valentine's tail,
    fully squashed, on a phone), the eggs 19.2%, 11.6%, 17.6%, and 13.9%.
- **Head start:** given once, the first time any page loads after the
  update. It's recorded as a separate "head start" source.
  - Zoe Spells: the wall prize for every level below the highest open one.
  - Zoe Multiplies: 1 or 2 coins for each saved try under 5 s. Only the
    last 3 tries per problem are saved, and wrong tries are saved as 5 s.
- **The shelf** (`shelf.html`, `shelf.js`): a wooden bookcase with
  every squishy she has bought standing on its shelves, in the order she
  bought them, each with its name on the front of its plank.
  - **Getting there:** a purple "🧸 My shelf" button beside the Store
    button on the main page (just 🧸 on phone-sized screens, so the three
    buttons fit in a row), and a 🧸 button at the top right of the store.
    The shelf has 🏠 at the top left and 🛍️ (to the store) at the top right.
  - **Top bar:** "My squishies" and how many of all of them she has,
    like "5 of 16".
  - **Bookcase:** a wooden frame around a cream back, with a plank under
    each row of squishies, all the way across, and empty shelves filling
    the rest. Spots are 21% of the screen's shorter side wide (94–170px),
    as many to a row as fit, centered. When there are more rows than fit,
    the shelves scroll.
  - **Pictures:** each squishy is a still 3D picture, facing
    three-quarters forward as in the store, at its size from `items.js`,
    so the pricier ones are bigger. The store's view leaves room for
    squashing, stretching, and turning, so the shelf zooms in 1.2× and
    leaves out most of the room above and everything below the floor, so
    each squishy stands on its plank with its shadow. One 3D view draws
    them off screen, one after another, and copies each picture in.
  - **Drawing:** a 🐉 stands in until a squishy's program has compiled.
    Where the browser compiles in the background, the shelf compiles one
    program at a time and draws each squishy as soon as its program is
    ready; elsewhere, one squishy a frame, so the page keeps moving.
    Without WebGL, the 🐉s stay. Turning the iPad redraws the pictures at
    the new size.
  - **Tapping one:** it squeaks, says its name, and turns all the way
    around in 1.2 s, easing in and out, with a wobbly squish (0.35 at
    first, bouncing back). A 🐉 stand-in bounces instead.
  - **Empty shelf:** "🧸 No squishies yet!", "Squishies you buy in the
    store will sit here.", and a pink "🛍️ Go to the store" button.
  - **Which ones:** hers are the items bought (`coins.purchases()`, oldest
    first), not ones only hatched.
- **Monkey maze** (`maze.js`, fun mode on the shelf; a prototype):
  - **Getting there:** the 🐒 button at the top right of the shelf (left
    of 🛍️, with a matching space at the left so the count stays in the
    middle) switches to the maze; there it's 🧸, back to the shelves. It
    shows only when she has a squishy. `shelf.html?fun=1` opens in the
    maze, for testing.
  - **The maze:** the bookcase's back with six levels of wooden planks: the
    floor, four shelves slanting one way and the next alternately, each
    open at its low end, and the top. The monkey (🐒) sits on its own ledge
    at the top left, next to a pile of three barrels, with an opening
    beside it. Wooden ladders join the levels at the far ends from the
    openings, and a pink slide winds down the right side, from the top to
    the floor. A basket (🧺) at the bottom left catches the barrels.
  - **Barrels:** every 2.6–4.4 s the monkey holds one up for half a second,
    then tosses it down through the opening onto the top slanted shelf. It
    rolls to the shelf's open end, drops to the next shelf, rolls back the
    other way, and so on, into the basket. Six are already on their way
    when the maze opens.
  - **Squishies:** all of hers, spread evenly around the way, which goes
    along the floor from the slide, up each ladder and along each shelf
    (so they always walk toward the barrels), along the top past the
    monkey, and down the slide. They hop along as they walk, sway as they
    climb, and lean into the slide's turns. Sizes are in units of a
    full-size squishy's width: 95% of a level's height, or less on narrow
    screens; each is drawn with its shelf picture (mirrored when walking
    left), so the pricier ones are bigger.
  - **Jumping:** a squishy jumps when a barrel coming its way will reach it
    in half a jump (0.55 s, 0.42 units high), so the barrel passes under it
    at the top; the jump is timed by when they'll meet, so a late frame
    doesn't spoil it. That works anywhere on a shelf, including right at a
    ladder: a squishy reaching the bottom of a ladder waits there while a
    barrel is about to roll past (low enough to hit it as it starts up),
    jumps it, then climbs. A squishy doesn't jump for a barrel that will be
    rolling over a fallen squishy where they meet (it's up in the air
    there). A barrel that still touches a squishy (one it had no time to
    jump) squashes it with a squeak and rolls up over it.
  - **Checked by counting:** a test-only copy counted every time a barrel's
    drawn circle touched a squishy's round body without a jump, squash, or
    fall to show for it. Over a minute each on an iPad sideways and upright,
    a phone, and with all sixteen, there were none, except once, a squishy
    in mid-tumble crossing a barrel.
  - **Knocked off a ladder:** a barrel rolling along the shelf at the top
    of a ladder knocks off a squishy climbing it if the squishy's body
    (half a unit tall at full size, so smaller ones less) is up where the
    barrel passes. With a soft "uh-oh" (`sound.wrong()`), it drops to the
    level below, turning upside down as it falls and landing 1.1 units
    from the ladder, toward the middle of the shelf (away from where
    barrels drop onto that shelf, so they pass the ladder first). It lands
    on its head with a squeak and a squash, lies there kicking for 0.5 s,
    flips back onto its feet (0.35 s), and walks back to the ladder. While
    it's down, barrels coming along roll up and over it (0.62 units up
    across it, rising and falling within 0.65 units of it); walking back,
    it waits right under one that's rolling over. The first try up a
    ladder is blind, but after a fall it waits at the bottom until no
    barrel will pass the top while it's up there: each barrel's way down is
    known, so it looks ahead at all of them, and at the monkey's next
    throw. With six squishies, 12–25 falls a minute depending on the
    screen, and none fell twice at the same ladder in a row.
  - **Speeds:** walking 1.3 units a second, barrels 2.1, climbing 0.6
    levels a second; the slide takes 3.2 s, slow at the top and fast in
    the middle.
  - **Sounds:** a soft "hup" for a jump (at most one every 0.35 s, so a
    crowd doesn't chatter) and a slide whistle down the slide
    (`sound.hop()` and `sound.whee()`). Tapping a squishy squeaks and says
    its name. The monkey calls out with a real recording (`sound.monkey()`)
    when the maze opens and when it's tapped: a chimpanzee at the Leipzig
    Zoo, recorded by Bidone, freesound.org sound 67361 (CC0, no rights
    reserved), trimmed to its 2.85 s call with short fades, at a steady
    level, as a 27 KB mono AAC file (`shared/sounds/monkey.m4a`).
  - **Drawing:** a 2D canvas over the bookcase, redrawn every frame (not
    while the page is hidden): the planks, ladders, and slide are drawn
    once for each size, and emoji once into little pictures, so a frame
    is mostly copying pictures. Everything moves by the clock, so where
    each squishy and barrel is depends only on the time.
- **Saved data:** under `zoe-games:store`: `hatched`, the ids of the
  squishies whose eggs Zoe has hatched. Coins are under `zoe-games:coins`:
  - `earned`: source → coins. The sources are `01-times-table`,
    `02-spelling`, `03-writing`, and `head start`.
  - `spent`: one `{ item, price, at }` per purchase. Hatching an egg is one
    too, with the item `hatch:` plus the squishy's id (e.g. `hatch:sprout`).
    A squishy counts as hatched if either list has it.
  - `headStart`: true once the head start is given.
  - The balance is earned minus spent. Every change re-reads storage first,
    so pages never overwrite each other's coins.
- **Zoe Spells prize:** paid once per finished wall (`paid` in its saved
  data). A wall that slips and is finished again doesn't pay twice.
  Clearing a wall with "Hold to clear the wall" makes its prize winnable
  again, since finishing it means answering every word again.
