# 01-times-table: Times Tables

The user's spec, verbatim (2026-10-17):

> Let’s add a first game, that tests multiplication up to 12x12. The UI can act similarly to the template, but with some changes:
>
> - you should not have to hit the enter button
> - scoring should be a configurable grid, either 10x10 or 15x15 (advanced mode), which shows graphically the average time for each problem over the last 5 times you got that problem. If an answer is wrong, the question has never been answered, or the time is more than 5 seconds, it is scored as 5 seconds. The uptime goal is to get < 5s for the last 5 times. It will use a flame schema, where white is < 5s and orange is 50s.
> - the score should keep history over multiple plays
> - there will also be a metric which is the geomean of all of scores. When that improves there should be a cheering noise and a random cute icon that zips across the screen.
> - there should be an exit button that takes you back to the game selection screen, there is no notion of a game = 10 turns or anything like that
> - the problem selected should be randomly selected, where each problem is weighted by its current score.

## Clarifications

Answers to questions asked before building (2026-10-17):

- Grid sizes: 10×10 (normal) and 15×15 (advanced). This replaces the "up to
  12x12" in the first line.
- Colors: orange at 5 s (wrong, never answered, or slow), through yellow, to
  pure white at 1 s or faster.
- After a wrong answer: show the right answer briefly, then move on.
- Cheer: when the geomean beats its best ever by a step, roughly every 10
  good answers at first and rarer as Zoe gets faster. Small improvements
  don't count.

Stated before building, with no objection:

- Answers check themselves as they're typed. An answer is right once its
  last digit matches, and wrong as soon as a digit can't lead to it. There is
  no Enter (✓) or backspace key.
- Each ordered problem has its own cell: 7 × 8 (row 7, column 8) and 8 × 7
  are separate.
- A cell's score is the average of its last 5 attempts. Missing attempts
  count as 5 s.
- History is shared by both grid sizes. The size switch is on the start
  screen.
- The grid stays visible while playing, with the current problem's cell
  outlined.
- The geomean shows in the top bar. 🏠 exits to the game list.
- Problems are picked at random, weighted by score, and the same problem
  never comes twice in a row.
- The clock restarts if the iPad leaves the game mid-problem.

## Implementation notes

- **Launcher tile:** ✖️ "Times Tables", "Multiply fast!".
- **Start screen:** a title card ("Answer fast to turn the grid white!"),
  the grid, the two size buttons (the chosen one is dark), and Start. The
  Start tap also unlocks sound.
- **Layout:** the problem card spans the top. The grid, the largest square
  that fits, sits left of the keypad in both orientations. Portrait gets a
  taller card and bigger problem text.
- **Grid:** labels 1–N along the top and left. Cells are color only, with no
  numbers. A cell pops when its color changes.
- **Colors:** linear in RGB from white (1 s or faster) to yellow `#ffe04d`
  (3 s) to orange `#ff8a00` (5 s).
- **Keypad:** digits only, with 0 centered on the bottom row.
- **Timing:** runs from when the problem appears to the last right digit,
  saved to 0.01 s with a minimum of 0.1 s. The message shows the real time
  (e.g. "Nice! 2.3 s"), even when it's over 5 s and scored as 5.
- **Right answer:** green box, ding, star burst, and praise with the time.
  The next problem comes after 0.7 s.
- **Wrong answer:** orange wiggle, the soft "uh-oh", and "Almost! Remember
  this one." After 0.5 s the right answer appears in a soft yellow box. The
  next problem comes 2.3 s after the mistake.
- **Speed display:** the geomean, as "⏱ 4.37 s" in the top bar. It's
  computed over the current grid size.
- **Cheer step:** a new record means speed ≤ last cheer × exp(−1.25 / cells),
  about 1.2% on 10×10 and 0.6% on 15×15. That's about ten 2 s answers on
  fresh cells; in testing, 2 s answers gave a cheer every 8–10. The first
  mark for a size is the speed when play first starts at that size.
- **Cheer:** "New record! 2.1 s" in purple, and the speed turns gold for
  2 s. A synthesized cheer plays (crowd, claps, two "woo!"s, sparkles). A
  random animal (one of 24 Apple emoji) zips across on a wavy path in
  1.4–1.8 s, trailing stars.
- **Saved data:** under `zoe-games:01-times-table`: `size`; `times` ('AxB' →
  the last 5 scores in seconds); and `best` (size → speed at the last cheer).
  Unreadable values are ignored.
