# 02-spelling: Zoe Spells

The user's spec, verbatim (2026-10-27). "That" in the first line is the word
list below.

> Okay let’s start with that. For the game, let’s have a girl wizard with a wand. She has a castle wall with a hundred bricks, each corresponds to a word. There is a dragon behind the wall. Each time she gets it right, a lightning bolt shoots out and hits one brick and increments its color.  If she gets it wrong the lightning bolt bounces off the brick and the correct answer is highlighted for 2 seconds, and the brick color is decremented.  For the game, it should display the correct spelling and the wrong spellings in random order, and she should try to hit the button with the correct spelling.  A trumpet sound should appear when a brick is at the maximum increment. Let’s have the brick value start at 0 and go to 2. Any questions?

Level 1 word list: "100 Most Frequently Misspelled Words Across Eight Grade Levels"
(Cramer and Cipielewski, 1995, from 18,599 compositions by children in
grades 1–8), as distributed by Read Naturally:
https://files.readnaturally.com/about-us/blog/a-strategy-for-frequently-misspelled-words-free-resources

## Clarifications

Answers to questions asked before building (2026-10-27):

- **Prompt:** each word comes in a short sentence with a gap, read aloud by
  the iPad's voice, with a button to hear it again.
- **Choices:** 4 buttons, the right spelling and three wrong ones.
- **Dragon:** the wall keeps it out. It peeks over now and then, and when all
  100 bricks are gold it flies away, with a big celebration.
- **Next word:** weighted toward weak bricks. Gray (0) words are 9 times and
  blue (1) words 4 times as likely as gold (2). Gold words still come up now
  and then, and the same word never comes twice in a row.

Stated before building, with no objection:

- **Wrong choices:** realistic kid mistakes. For sound-alike words they're
  the other real words, and words that need a capital get lowercase
  versions. They're all in `words-1.js` (and `words-2.js` for level 2), to
  review and edit.
- **The wall:** 10 rows of 10 bricks in staggered brickwork. The bricks
  don't show their words, and the current word's brick is outlined. Colors:
  0 gray stone, 1 blue, 2 gold.
- **Trumpet:** plays when a brick first turns gold, not every time a gold
  brick is answered again.
- **Wrong answer:** the bolt bounces off, the right button glows for 2 s,
  and the brick steps down, never below 0.
- **Play:** endless. 🏠 exits, progress is saved, and "Hold to clear the
  wall" is on the start screen. There's no timer, so no pause button or speed
  score.

## Changes

Requested by the user, verbatim (2026-10-27):

> One more change, start the bricks at the middle setting so you only have to do it more than twice if you get it wrong

Bricks now start at level 1 (blue). One right answer turns a brick gold
(with the trumpet), and a wrong one drops it to gray, from where it takes
two right answers. Clearing the wall puts every brick back to blue.

> How about make it more of a rolling thunder  sound

The lightning's sound is now a crack, a sizzle, and a deep boom, then
thunder rolling away for about 2 s in uneven swells, each softer than the
last. The next word comes 1.6 s after a right answer (it was 1.3 s), so the
thunder has died down before the voice reads the next sentence.

> The current game plays the same sound when you go from 0->1 as 1->0. It should play the positive sound when going from 0 to 1

The thunder played on every answer and drowned out the short ding and
"uh-oh". Now only right answers get thunder, slightly softer. The positive
sound comes just after the crack: the ding when a brick goes gray to blue,
and the trumpet (instead of the ding) when it turns gold. A miss gets no
thunder, just a small crack and a springy "boing" as the bolt bounces off,
then the soft "uh-oh".

> Yeah the thunder does not sound good
> The thunder sounds more like the ocean and lasts too long.

The smooth swells of low noise sounded like waves. The thunder is now a
sharp crack and a short boom that rattles at random every few hundredths
of a second as it dies away, about 0.75 s in all. The boom is distorted so
small speakers can play its overtones, with a deep tone underneath for
headphones. The next word now comes 1.4 s after a right answer.

> With the middle setting as default, it takes too long to get the unfinished answers. Let’s boost it to the 3rd power

Words are now weighted by (3 − level)³ instead of squared: gray 27, blue
8, gold 1. This replaces the 9 / 4 / 1 weights in Clarifications above.
With 90 gold bricks and 10 blue, an unfinished word now comes up about
47% of the time (31% when squared).

From player testing, verbatim:

> Okay some feedback from player testing!
> 1. Rather than pausing for 2 seconds, the game should require they select until they get it right.
> 2. The game should maintain a set of wrong questions, so that in future, we can periodically re-ask them.

Clarified:

- **Wrong picks:** each one steps the brick down, never below gray. Finding
  the right spelling afterwards doesn't raise it.
- **Retries:** wrong picks are crossed out so they can't be tapped again.
  There's no 2 s reveal of the answer any more.
- **The missed set:** it's only kept for now, for a future level; nothing
  re-asks it yet. Words never leave it.

> Have it wait for three seconds after the right answer is selected after a wrong answer, before continuing

After a miss, once Zoe taps the right spelling, the next word now comes 3 s
later (it was 1.4 s), so there's time to look at the right spelling.
First-try right answers still move on after 1.4 s.

## Level 2

Requested by the user, verbatim (2026-10-27):

> Okay let’s add the next level. In the next level, it should be a different looking dragon. And we need to pick another set of 100 words.

Clarified:

- **Words:** England's national curriculum word list for years 3 and 4
  (ages 7–9, Department for Education, English Appendix 1: Spelling, Open
  Government Licence). Its 8 words already in level 1 (believe, caught,
  different, favourite, heard, probably, thought, through) are swapped for 8
  second forms the list gives with other headwords (accidentally, actually,
  business, eighth, occasionally, possession, although, women). centre is
  spelled center. They're in `words-2.js`, in the list's order.
- **Unlocking:** level 2 opens when level 1's wall is all gold. After that,
  Zoe can switch between the levels.
- **Dragon:** an ice dragon. Pale blue, with frosty white spikes, and it
  puffs snowflakes when it peeks over the wall.

## Level 3

Requested by the user, verbatim (2026-10-28):

> Okay let’s add level 3, fire dragon. Use the next word list.

- **Words:** "the next word list" is England's national curriculum word list
  for years 5 and 6 (ages 9–11, same source and licence as level 2). Its one
  word already in level 1, especially, is swapped for a second form the list
  gives, immediately (from "immediate(ly)"). Five words get US spellings:
  criticize, marvelous, neighbor, program, recognize. They're in `words-3.js`,
  in the list's order. No wrong choice is a British spelling.
- **Unlocking:** stated, with the same rule as level 2: level 3 opens when
  level 2's wall is all gold.
- **Dragon:** a fire dragon. Red, with dark horns, a flame-shaped crest,
  red-and-orange wings, and smoke puffs when it peeks over the wall.

## Level 4

Requested by the user, verbatim (2026-10-28), after choosing sound-alikes
from the options offered:

> Shadow dragon, this time, instead of going gold, the tiles should turn see-thru. Sound alikes is good. Yes final level is review but we have more levels to go.

- **Words:** sound-alikes from the homophone lists in England's national
  curriculum for ages 6–7, 7–9, and 9–11 (same source and licence). They
  hold 107 words not already in levels 1–3. The British-only pairs
  (licence/license, practice/practise, draft/draught) are left out, and so
  are the 7 most obscure: prophecy, prophesy, assent, dissent, farther,
  further, precede. Those can still appear as wrong choices. Each sentence
  decides which sound-alike is right, and the word's sound-alike partner is
  always among the wrong choices. They're in `words-4.js`.
- **Bricks:** they go gray → green → see-through, instead of gold (green
  since the change below; it was blue at first).
- **Unlocking (stated):** level 4 opens when level 3's wall is all gold.
- **Speech (stated):** sound-alikes sound the same on their own, so the voice
  reads just the sentence, without the word first.
- **The final level** will be a review of Zoe's missed words, after more
  levels.

## Later changes

Requested by the user, verbatim (2026-10-28):

> The brick color is the same as the background color. Maybe fix that.
>
> Only change it in level 4.  Let’s make it green.

Level 4's middle bricks, where new bricks start, were blue, nearly the same
as the page's blue sky that see-through bricks show. They're now green,
`#2f9e44`, so level 4 goes gray → green → see-through. Levels 1–3 keep
blue. The green is darker than the gray stone, so the two stay apart even
for color-blind eyes.

## Coins

Added with the Squishy Store (see `store/SPEC.md`), by the user's choice:
coins only for finishing a wall, 100 times the level (100, 200, 300, 400).

- **Paying:** the prize is paid once per finished wall, and recorded in
  `paid` (level → true) in the saved data. A wall that slips and is
  finished again doesn't pay twice. Clearing a wall makes its prize
  winnable again.
- **Finishing:** the celebration says "You won 200 coins!", and the prize
  floats up from the tally with a "ching".
- **Start screen:** shows "Finish the wall to win 200" or "Wall prize won:
  200 ✓".
- **Old saves:** walls finished before coins existed are marked paid. The
  store's one-time head start covered them.

## Implementation notes

- **Launcher tile:** 🪄 "Zoe Spells", "Zap the right spelling!".
- **Art:** drawn in SVG, because Apple's mage emoji is an older woman. A girl
  wizard with a starry purple hat and robe, brown braids, and a star-tipped
  wand; a friendly green dragon; a grassy hill and two clouds.
- **Layout:** landscape puts the scene on the left, with the sentence card
  and a column of four answers on the right. Portrait stacks the sentence,
  the scene, and a 2×2 grid of answers.
- **Wall:** rows fill from the bottom in the study's order, so the bottom row
  holds its ten most-misspelled words. A darker half brick (no word)
  finishes each row, with battlements on top.
- **Speech:** says the word, then the sentence with the word in it ("because.
  I wore a coat because it was cold."), at 0.9× speed in the iPad's default
  US English voice. 🔊 replays it. It stops when Zoe answers or leaves the
  app, and the launcher's mute silences it too.
- **Right answer:** the gap fills with the word in green and the button turns
  green. The wand flashes and a lightning bolt zaps the brick, with a
  synthesized crack and a short rattling boom. The ding follows 0.12 s later
  (3-5 dB above the boom), or the trumpet if the brick turns gold. 0.16 s later the brick pops up one color.
  Turning gold adds a star burst from the brick. The next word comes after
  1.4 s.
- **Wrong pick:** the bolt hits the brick and bounces off, up and away, with
  a small crack and a "boing" (no thunder), then the soft "uh-oh" 0.3 s
  later. The brick drops one color, but not below gray. The tapped button
  wiggles orange, then turns gray and crossed out, and can't be tapped
  again. The word stays until Zoe taps the right spelling. Finding it after a
  miss fills the gap in green and plays the ding, with no lightning since
  the brick doesn't climb. The next word comes 3 s later.
- **Bricks:** gray stone (missed, level 0), blue (start, level 1; green in
  level 4), gold (level 2; see-through in level 4), with dark mortar between
  them.
- **Tally:** "Level 1 gold bricks 12 / 100" in the top bar.
- **Dragon:** waits with its horns showing between the battlements and peeks
  over every 8–16 s. When the last brick turns gold, it flies away with a
  fanfare, confetti, and "The wall is all gold! The dragon flew away!". It
  stays away while the wall is all gold, and comes back if a gold brick
  slips.
- **Clearing:** a 1.5 s hold, the same as Times Tables. Every brick goes back
  to blue (green in level 4) and the dragon returns.
- **Levels:** "Level" followed by one round button per level sits above
  Start; the level on screen is dark. The buttons are at least 64px wide and
  wrap to a new row when more levels don't fit. In landscape, "Level" sits
  above them. A locked level shows 🔒.
  Tapping it wiggles the button and says, for example, "Make every brick in
  level 2 gold to open level 3!" for 3 s. The top bar reads "Level 3 gold
  bricks", and the start line says "Level 3: keep the fire dragon out!". The
  game reopens on the level last picked.
- **Opening the next level:** the last gold brick of a level brings the usual
  celebration with "The wall is all gold! The ice dragon flew away! Level 3
  is open!". 4.6 s later the start screen comes back with the new level
  picked. Finishing level 3, or re-finishing an earlier level, just carries
  on with the next word.
- **Ice dragon:** drawn in SVG like the first, so it peeks and flies away the
  same way. It has a pale blue head with white frost speckles on the cheeks,
  big blue eyes, a little fang, long white horns swept back, a crown of
  white spikes, and pale wings with icicle edges and white trim. When it
  peeks, outlined snowflakes puff from its nostrils and drift out to each
  side.
- **Fire dragon:** drawn the same way. It has a red head with pink scales on
  the cheeks, amber eyes under arched brows, a golden snout, a grin with two
  little fangs, dark curved horns, a yellow flame-shaped crest, and dark red
  wings with orange insides. When it peeks, gray smoke puffs and orange
  embers drift out from its nostrils to each side.
- **Shadow dragon:** drawn the same way. It has a dark purple head with
  big lavender eyes that glow, a soft purple smile, sharp dark horns with
  purple edges, and tattered dark wings with purple trim. When it peeks,
  purple shadow wisps puff from its nostrils. Unlike the others, it has a
  whole body (with a curled tail) hidden behind the wall, so see-through
  bricks show it lurking there. The more bricks clear, the more of it shows.
- **See-through bricks:** glass panes with a faint white tint and a light
  edge. Level 4's wall has no mortar backing, and each solid brick carries
  its own mortar edge, so the sky and the dragon show through. Turning a
  brick see-through plays the trumpet and bursts stars, like turning gold.
  The top bar reads "Level 4 see-through bricks". When all 100 are clear:
  "The wall is all see-through! The shadow dragon flew away!", and the
  empty sky shows through the glass. "see-through" uses a non-breaking
  hyphen so lines don't break inside it.
- **Scenery:** the hill is green for level 1, snowy (white and pale blue) for
  level 2, rusty volcanic rock for level 3, and moonlit slate blue for
  level 4. Sounds and everything else work the same on every level.
- **Clearing:** on any level, clearing affects only that level's bricks. Open
  levels and the missed-word record stay.
- **Testing:** in Safari, `…/02-spelling/?level=2` (or `=3`, `=4`) opens
  that level for the visit, even when it's locked, without unlocking it.
- **Saved data:** under `zoe-games:02-spelling`:
  - `levels`: word → 0–2, for the words of both levels (no word is in both).
    Unanswered words, and any unreadable values, count as 1.
  - `unlocked`: the highest open level (1–4). On load, a finished wall
    opens the next level, for saves from before that level existed.
  - `wall`: the level last picked.
  - `missed`: word → `{ count, last, picked }`. That's the number of wrong
    picks, the time of the last one (ms since 1970), and how often each wrong
    spelling was picked. It covers both levels' words and is for the future
    review level. "Hold to clear the wall" keeps it, and nothing removes words
    from it.
