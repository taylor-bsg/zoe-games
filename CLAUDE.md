# CLAUDE.md

Small learning games for Zoe, a kid who plays them on an iPad. Each game is
its own folder, built from a spec the user writes. The site is public at
https://taylor-bsg.github.io/zoe-games/.

## Decisions

- **Stack:** plain HTML, CSS, and JavaScript ES modules. No framework, no
  build step, no package.json, no npm dependencies. If a game ever needs a
  library (e.g. Phaser), ask the user first, then vendor one pinned file into
  the repo.
- **No external requests:** no CDNs, web fonts, analytics, or remote images.
  Everything ships in the repo. Pictures are emoji or inline SVG; sounds are
  synthesized.
- **Hosting:** GitHub Pages serves the root of `main` at
  https://taylor-bsg.github.io/zoe-games/. The site lives under `/zoe-games/`,
  so every URL is relative (`../shared/base.css`, `01-times-table/`), never
  starting with `/`.
- `.nojekyll` (empty) makes Pages serve files as-is.
- **No service worker yet;** offline support comes later.
- **Home Screen app:** every page links the root `manifest.webmanifest`
  (`display: standalone`, `start_url` and `scope` `"./"`) and
  `icons/apple-touch-icon.png`, so Add to Home Screen gives an icon that opens
  like an app, without Safari's toolbars. There's no back button there, so
  every game screen has a Home button.
- **Icons** are placeholders (a gold star with a "Z" on the site's gradient)
  drawn with a CoreGraphics script. Replacements must be opaque PNGs:
  `apple-touch-icon.png` 180×180, `icon-192.png`, `icon-512.png`.

## Layout

```
index.html            launcher: one big tile per game, mute toggle, version in a corner
games.js              registry: id (= folder name), title, emoji, description
version.js            version string, shown small on the launcher
manifest.webmanifest
icons/                apple-touch-icon.png (180), icon-192.png, icon-512.png
shared/base.css       layout, type, buttons, keypad styles, iPad fixes
shared/keypad.js      big on-screen number pad
shared/sound.js       Web Audio effects, unlock, mute
shared/storage.js     per-game save/load
shared/celebrate.js   confetti/star burst
template/             minimal working game to copy for new games; not in games.js
NN-skill/             one folder per game: SPEC.md, index.html, game.js
```

## Rules for future work

- Each game folder (`NN-skill`, e.g. `01-times-table`) has `SPEC.md` (the
  source of truth, written by the user), `index.html`, and `game.js`, and is
  registered in `games.js`.
- **New game workflow:**
  1. Read `SPEC.md`. If the spec arrives in chat, first save it verbatim as
     `NN-skill/SPEC.md`.
  2. Ask the user about anything behavioral it leaves open (what counts as
     right, difficulty, rewards, when a session ends). Don't guess those.
  3. Copy `template/index.html` and `template/game.js` into the folder,
     keeping the user's `SPEC.md`. Set `GAME_ID` to the folder name and change
     the title.
  4. Build the game.
  5. Register it in `games.js`.
  6. Bump `version.js`: minor for a new game, patch for a fix.
  7. Commit as `NN-skill: summary`.
- For small presentation choices the spec doesn't cover (colors, emoji,
  wording, layout, timings), decide and list them under "Implementation notes"
  at the end of that game's `SPEC.md`.
- **Default feel,** unless a spec says otherwise: immediate feedback;
  encouraging and gentle on wrong answers (soft sound, orange rather than red,
  "try again" wording, no lost progress); big readable text.
- **Keep `shared/` APIs backward-compatible.** Additions are fine. If
  something must change, update and recheck every game.
- **The site is public:** no personal details about Zoe (last name, photos,
  school, location), including in specs, comments, and commit messages.
- **Avoid the newest web APIs;** the iPad may not run the latest iPadOS.
  Target Safari 15 (iPadOS 15). Anything newer needs a fallback, the way
  `base.css` puts `100vh` before `100dvh`. Examples that need a guard:
  `:has()`, `<dialog>`, CSS nesting, container queries, `Array.prototype.at`,
  `structuredClone`, view transitions.
- **Test before committing** (see Testing): the game in portrait and
  landscape, `/template/` after any change to `shared/`, and the launcher.

## How a game page works

Start from a copy of `template/`. The pattern:

- `<head>` has the same meta tags and links as `template/index.html`: the
  viewport with `viewport-fit=cover`, `format-detection` off, the
  `apple-mobile-web-app-*` tags, `theme-color`, `../manifest.webmanifest`,
  `../icons/apple-touch-icon.png`, and `../shared/base.css`. CSS for one game
  only goes in a `<style>` there.
- `<body ontouchstart="">`: iOS applies `:active` press styles only when the
  page has a touch listener.
- One `.page.fit` (exactly one screen, never scrolls) holds a `.topbar`, with
  the Home button (`href="../"`) on the left, and `.screen` sections (start,
  play, done) switched with the `hidden` attribute.
- The Start button's click handler calls `sound.unlock()`. iOS plays nothing
  until a tap does this, and `pointerdown` doesn't count.
- Answers come from `createKeypad`, never an `<input>`: the iPad keyboard
  covers too much of the screen.
- Right answer: `is-correct` on the answer, `sound.correct()`, `stars(el)`.
  Wrong answer: `is-wrong`, `sound.wrong()`, a kind message, then a retry.
  End of a round: `sound.celebrate()` and `confetti()`.
- Progress: `storage.load(GAME_ID, defaults)` at startup and
  `storage.save(GAME_ID, data)` whenever it changes.

## Shared pieces

Each file's header comment documents its API. In brief:

- **base.css:** palette and sizes as CSS variables (`--sun`, `--green`,
  `--ink`, `--tap` = 64px, `--key`); `ui-rounded` system font first; `.page`
  (100dvh with safe-area padding, portrait and landscape), `.page.fit`,
  `.topbar`, `.screen`, `.card`, `.big-emoji`; buttons `.btn`, `.btn-big`,
  `.btn-icon`, `.btn-white`, `.btn-green`, all at least 64px; keypad styles;
  feedback classes `.is-correct` and `.is-wrong`. iPad fixes:
  `touch-action: manipulation`; no text selection, long-press callouts, drag,
  or tap highlight; `overscroll-behavior: none`. Nothing depends on hover.
  Text on the colored background is white; light surfaces use `--ink`.
- **keypad.js:** `createKeypad(container, { display, maxLength, digitsOnly,
  onSubmit, onChange })` returns `{ value, clear(), setEnabled(on), display }`.
  Digits 0-9, backspace, a check key that submits, and an answer display;
  keys at least 72px; acts on `pointerdown`; also takes digits, Backspace,
  and Enter from a physical keyboard. `digitsOnly` drops backspace and the
  check key, for games that check answers in `onChange` as they're typed.
- **sound.js:** `unlock()`, `correct()`, `wrong()`, `celebrate()` (a
  fanfare), `cheer()` (crowd, claps, and "woo!"s), `trumpet()` (a royal
  fanfare), `isMuted()`, `setMuted(on)`. Synthesized with Web Audio, no audio files.
  Mute is site-wide and remembered; the launcher has the toggle.
- **storage.js:** `load(gameId, defaults)` returns the defaults overlaid with
  any saved fields; `save(gameId, data)`; `clear(gameId)`. One JSON object per
  game under `zoe-games:<gameId>` in localStorage, all inside try/catch. Games
  must work when nothing is saved, and saved data can vanish. Also, the Home
  Screen app and Safari keep separate storage.
- **celebrate.js:** `stars(elementOrPoint)` for a small burst, `confetti()`
  for a big party, and `zip(emoji?)`, which sends a random cute animal
  zipping across the screen. All three are overlays that ignore taps and
  remove themselves.

## Testing

From the repo root:

```
python3 -m http.server
```

- On the computer, open http://localhost:8000/. The keypad also takes number
  keys, Backspace, and Enter.
- On the iPad, on the same Wi-Fi, open `http://<computer's local IP>:8000/` in
  Safari. On a Mac, `ipconfig getifaddr en0` prints the IP. Allow incoming
  connections if macOS asks.
- `/template/` exercises every shared piece.
- After a push, Pages takes a minute or two to deploy, and the iPad may keep
  cached files for about 10 minutes. The version on the launcher shows which
  version it has.
