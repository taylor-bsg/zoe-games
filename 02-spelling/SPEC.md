# 02-spelling: Zoe Spells

The user's spec, verbatim (2026-10-27). "That" in the first line is the word
list below.

> Okay let’s start with that. For the game, let’s have a girl wizard with a wand. She has a castle wall with a hundred bricks, each corresponds to a word. There is a dragon behind the wall. Each time she gets it right, a lightning bolt shoots out and hits one brick and increments its color.  If she gets it wrong the lightning bolt bounces off the brick and the correct answer is highlighted for 2 seconds, and the brick color is decremented.  For the game, it should display the correct spelling and the wrong spellings in random order, and she should try to hit the button with the correct spelling.  A trumpet sound should appear when a brick is at the maximum increment. Let’s have the brick value start at 0 and go to 2. Any questions?

Word list: "100 Most Frequently Misspelled Words Across Eight Grade Levels"
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
  versions. They're all in `words.js`, to review and edit.
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
  synthesized zap and the ding. 0.16 s later the brick pops up one color.
  Turning gold adds the trumpet and a star burst from the brick. The next word
  comes after 1.3 s.
- **Wrong answer:** the tapped button turns orange and wiggles, the gap shows
  the right word, and the right button glows green. The bolt hits the brick
  and a second bolt bounces off, up and away, with the zap and the soft
  "uh-oh". The brick drops one color, but not below gray. The next word comes
  after 2 s.
- **Tally:** "Gold bricks 12 / 100" in the top bar.
- **Dragon:** waits with its horns showing between the battlements and peeks
  over every 8–16 s. When the last brick turns gold, it flies away with a
  fanfare, confetti, and "The wall is all gold! The dragon flew away!". It
  stays away while the wall is all gold, and comes back if a gold brick
  slips.
- **Clearing:** a 1.5 s hold, the same as Times Tables. Everything goes back
  to gray and the dragon returns.
- **Saved data:** under `zoe-games:02-spelling`: `levels` (word → 0–2). Unknown
  values count as 0.
