# Sharp stills for the Projects page

Date: 2026-10-25. Branch: `restructure`. Nothing is pushed. This file is public once merged and holds no private notes.

The first loops and screens were made from screenshots of the app's browser pane (about 800 px wide) and recorded by the browser's own
MediaRecorder, and they were soft. The owner then dropped the loops altogether (see `2026-10-25-projects-slider-results.md`), and the loop maker
(`render.mjs`, the stage page, the scene engine, the in-browser recorder, the scenes and their tests) was deleted at his request. What remains is
the part that mattered: a real Chrome renders a real page at any size, so a still is exactly as sharp as you ask for.

## The route (free, local, no packages)

Needs Chrome or Edge, and ffmpeg (`winget install Gyan.FFmpeg --source winget`; plain `winget install Gyan.FFmpeg` can fail on the Microsoft
Store source's certificate, `--source winget` avoids it).

1. Take lossless PNGs, 2560 by 1600 (1280 by 800 CSS pixels at 2x), into `scripts/clips/captures/<id>/` (git-ignored):
   - `node scripts/serve.mjs`, then `node scripts/clips/capture.mjs site` for this website (the gate, the bead letters, Home, the CV, the board,
     the Trip globe);
   - `node scripts/clips/capture.mjs car-broker` for the public pages of the car broker demo (`--url` to point it elsewhere). It drives a clean
     Chrome, so it cannot sign in: public pages only, with the cookie banner declined.
2. Make a WebP of one: `node scripts/clips/still.mjs captures/site/05-board.png img/projects/site/screen-cv.webp --w 1600 --h 1000 [--limit 250000]`.
   It picks the highest quality that fits the limit, creates a new project's folder, and only writes WebP files under `img/projects/<id>/`
   (the save-path guard, `scripts/lib/savepath.mjs`).

The pure parts are tested: `scripts/ffmpeg.test.mjs` (ffmpeg lookup and the WebP command line), `scripts/cdp.test.mjs` (Chrome lookup),
`scripts/savepath.test.mjs`.

## Numbers

| File | Size |
| --- | --- |
| `img/projects/site/home.webp` (1600 by 1000) and `home-thumb.webp` (800 by 500) | 167 KB and 40 KB |
| `img/projects/site/opening.webp`, `screen-cv.webp`, `screen-trip.webp` (1600 by 1000, the case view) | 179, 143 and 135 KB |
| `img/projects/car-broker/home.webp` and `home-thumb.webp` | 47 KB and 20 KB |

`check.mjs` allows a still 250,000 bytes, a thumb 80,000 and 3,000,000 of images per view.

## Notes

- The headless Chrome uses SwiftShader, so the WebGL scenes (the opening, the globe) render, only slowly. The capture script waits for them.
- `capture.mjs site` sets `mdb-opening` in the session so the opening is skipped except for the two shots that need it.
- The page time ("tel aviv 14:00") and the globe's flight position are whatever they were when the shot was taken.
