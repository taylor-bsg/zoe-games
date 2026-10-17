# Zoe's Games

Small learning games for Zoe, made for an iPad. Plain HTML, CSS, and
JavaScript: no build step, and nothing loaded from other sites.

**Play: https://taylor-bsg.github.io/zoe-games/**

## Put it on the iPad's Home Screen

1. Open the link above in **Safari** on the iPad.
2. Tap **Share** (the square with an arrow), then **Add to Home Screen**, then
   **Add**.
3. Open it from the new star icon. It runs full screen like an app, without
   Safari's toolbars. Every game has a 🏠 button to get back to the list.

Add it from the main page, not from inside a game, so the icon opens the game
list. The Home Screen app keeps its own saved progress, separate from Safari's.

Sound follows the iPad's volume and silent mode. The speaker button on the
main page mutes every game.

## Test locally

```
cd zoe-games
python3 -m http.server
```

Open http://localhost:8000/ on the computer; the keypad also takes number
keys, Backspace, and Enter. To try it on the iPad before pushing, connect both
to the same Wi-Fi, get the computer's IP address (on a Mac:
`ipconfig getifaddr en0`), and open `http://<that address>:8000/` in Safari on
the iPad.

[template/](https://taylor-bsg.github.io/zoe-games/template/) is a tiny adding
game that exercises the shared keypad, sounds, celebrations, and saved
progress.

## Add a game

1. Write a spec: copy `template/SPEC.md` into a new folder named `NN-skill`
   (e.g. `01-times-table/SPEC.md`) and fill it in, or paste it to Claude.
2. Claude follows [CLAUDE.md](CLAUDE.md): asks about anything the spec leaves
   open, builds the game from `template/`, adds it to `games.js`, bumps
   `version.js`, and commits.
3. Push to `main`. GitHub Pages updates within a few minutes. The version
   number in the corner of the main page shows which version the iPad has.

## What's where

- `index.html`: the game list. `games.js`: which games it shows.
  `version.js`: the version number.
- `shared/`: styles, keypad, sounds, saving, and celebrations used by every
  game.
- `template/`: the starting point for new games.
- `NN-skill/`: one folder per game, each with its `SPEC.md`.
