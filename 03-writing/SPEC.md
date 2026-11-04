# 03-writing: Zoe Writes

The user's request, verbatim (2026-10-31):

> Okay let’s think about a third game, Zoe Writes. It will have fill in the blanks and help with spelling. What do you recommend?

Proposed in reply, as the first of two versions (the other was silly story
fill-ins):

- A sentence appears with a blank and is read aloud, like in Zoe Spells.
  Below it is one box per letter. She types the missing word on a big
  on-screen keyboard.
- Letters are checked as she types: right letters turn green and stay; a
  wrong letter wiggles and clears, with no penalty.
- The help is fill-in-the-blank too, and fades as she learns the word: for
  a new or often-missed word, most letters are given and she fills in the
  tricky part (be _ _ eve); then only the first letter is given; then
  none.
- Stuck (two wrong tries on a letter)? The right letter appears faintly to
  copy. A word she needed help with comes back later as "Look, cover,
  write": the word shows for a few seconds, hides, and she writes it from
  memory.
- The words: the ones she missed in Zoe Spells first, then words from the
  Zoe Spells levels she has open.

The user's reply, verbatim:

> We can try the first version, but it should use  the words from Zoe spells, have levels 1,2,2a,2b to match. On chrome book, it can use the real keyboard. Otherwise the device keyboard? Any suggestions about coins? 2 coin per 100% answer? Make notebook with stickers sounds okay .

## Clarifications

Answers to questions asked before building:

- **Keyboard:** a big built-in keyboard on the iPad, not the iPad's own,
  which covers about half the screen and can suggest or autocorrect the
  answer. A real keyboard (the Chromebook's) works too.
- **Coins:** 2 for each perfect word (no wrong letters, no hints), until
  that word has its sticker, so rewriting known words can't farm coins.
- **Sticker:** a word earns its sticker when she writes it perfectly from
  memory (no letters given).
- **Levels:** 1, 2, 2A, and 2B, each open in Zoe Writes once it's open in
  Zoe Spells, so she writes words she has already seen.

Requested by the user, verbatim (2026-11-03):

> Give 50 points for finishing a Zoe writes level

Points are coins. A level is finished when its notebook page is full: all
100 of its words have their stickers. That pays 50 coins, once per level.

## Implementation notes

- **Launcher tile:** ✏️ "Zoe Writes", "Write the missing word!".
- **Words:** Zoe Spells' word lists (`../02-spelling/words-*.js`), with
  their sentences. Changing a word there changes it here too. The levels
  open as in Zoe Spells: level 1 always, 2, 2A, and 2B once Zoe Spells has
  them open (its `unlocked` is 2 or more). `?level=2a` opens a level for
  the visit, for testing.
- **Stages:** each word has a stage, saved: 0 most letters given, 1 the
  first letter given (none for words of one or two letters), 2 from
  memory, 3 its sticker. A perfect answer (no wrong letters, no hints)
  moves it up one stage and pays 2 coins, so a word pays at most 6. Any
  other answer leaves its stage as it was.
- **The tricky part:** with most letters given, the blanks are the letters
  Zoe Spells' wrong spellings of the word get wrong (changed, dropped, or
  next to an added letter), the most often wrong first, up to half the
  letters. For "believe", the "ie".
- **Words at a time:** she works on 8 words of the level at once, so each
  comes back every few turns. When one earns its sticker, a new word joins:
  the words she missed most in Zoe Spells first, then in the list's order.
  Picks are random among the 8, never the same word twice in a row.
- **Review:** about one turn in eight, a word that already has its sticker
  comes back, from memory, with no coins and no change.
- **Hints:** two wrong tries on a letter make it appear faintly in its box,
  to copy. A word that needed a hint comes back two words later as "Look,
  cover, write": the word shows in its boxes for 3 s ("Look carefully!"),
  then hides, and she writes it from memory. That turn is practice: no
  coins and no change of stage.
- **Typing:** a letter goes into the box with the blue outline. A right
  letter turns green, and the outline moves on; a wrong one flashes orange
  in the box, wiggles, and clears, with a soft "uh-oh". Apostrophes and
  spaces are typed too (that’s, a lot), since the wrong spellings test
  them; any apostrophe key works. Capitals fill in by themselves
  (Christmas, I).
- **Keyboard:** QWERTY in three rows, the second ending in an apostrophe
  and the third in a wide space bar, keys acting on touch-down like the
  number pad. It shows on touch screens; on a computer (no touch, such as
  the Chromebook) the real keyboard is used and the on-screen one is
  hidden. `?keyboard=1` shows it anyway, for testing.
- **Speech:** says the word, then the sentence with the word in it, as in
  Zoe Spells. 🔊 replays it.
- **Finishing a word:** the blank in the sentence fills in, with a ding.
  A perfect one says "Perfect!" (or similar), with stars, and the coins
  float up with a "ching". The next word comes 1.4 s later.
- **Stickers:** each word has its own emoji sticker (100 per level, a
  different order in each level). A new sticker pops up big ("New
  sticker!") with the royal trumpet, and the next word waits 2.6 s. When
  all 100 in a level are stickers, the notebook is full: confetti, and
  the big sticker's card says "Your notebook is full! You won 50 🪙".
- **Full-page prize:** 50 coins the first time a level's page fills,
  paid with the word's own 2 coins, as the last sticker is earned. With
  the confetti, it says "Your notebook is full! You won 50 coins!", and
  the coins float up from the sticker count with a "ching"; the next word
  waits 5.5 s, to hear it. A page that was already full before the prize
  existed is paid, quietly, the next time Zoe Writes opens.
- **Start screen:** the level's notebook page, ruled like paper, with a
  space for each of its 100 words and the stickers earned so far; the
  title, "Write the missing word!", and what the level can win: "Perfect
  words win 2 🪙" and "A full page wins 50 🪙" (or "Full page won: 50 🪙
  ✓"); the level buttons (a locked one says to open it in Zoe Spells
  first); and Start.
  The top bar counts the level's stickers.
- **Saved data:** under `zoe-games:03-writing`: `stages` (word → 0–3, for
  every word started; no word is in two levels), `level` (the level last
  picked: 1, 2, `2a`, or `2b`), and `paid` (level id → true once its
  full-page prize is paid). It reads Zoe Spells' saved data (`unlocked`,
  `missed`) without changing it.
