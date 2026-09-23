# Game prep

Run-of-show material: GM screens, monster cards, player handouts.

**These live here, not in `public/`, on purpose.**

`public/` is the Vite `publicDir` for *both* apps ([platform/vite.config.ts](../../platform/vite.config.ts)
sets `publicDir: '../public'`, and the legacy root app uses it by default).
Everything in it is copied verbatim into `dist/` and served at a guessable
URL — so a GM screen dropped in `public/assets/themes/<show>/` is a public
download at:

```
https://app.themisadventuringparty.com/assets/themes/<show>/<file>
```

For a show whose format is a surprise monster reveal, that's a spoiler leak.
These files were sitting in `public/` untracked; they were moved here in
Sept 2026 so they get version history without being published.

`docs/` is not part of either build, so nothing here ships.

## If you actually want something downloadable

Put it in `public/` deliberately and link to it from a page, so the intent is
visible in code review. An unreferenced binary in `public/` is almost always
an accident.
