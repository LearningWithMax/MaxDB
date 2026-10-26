# Max Duffaud Bibas, personal site

Live: https://learningwithmax.github.io/MaxDB/

A CV, a world map of where I've lived and travelled, and (soon) a portfolio of the things I build.
Plain HTML, CSS and JavaScript. No framework, no build step, no backend.

## Run it locally

```bash
node scripts/serve.mjs
```

Then open http://localhost:5317. Needs Node 18 or newer, nothing to install.

## Check your changes

```bash
node scripts/check.mjs
```

Parses every script and confirms every file the site references exists.

## Structure

```
index.html     page markup (Home, Deep Dive, World Map) and the inline map SVG
css/           base (theme + nav), home, cv, map, widgets, story
js/            data, vlog, popups, consent, nav, map  (loaded in that order)
img/           nutshell sticker, country photos, certificates
scripts/       local server and the check script
originals/     full-size photos, not committed
```

## Deploying

Hosted on GitHub Pages, served straight from the root of `main`. A push to `main` goes live in about a minute.
Work happens on branches and is merged into `main` when it is ready.

`v1-single-file` is a tag for the original one-file version of the site.
