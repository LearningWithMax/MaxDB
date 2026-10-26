# Projects slider: design

Date: 2026-10-25. Branch: `restructure`. Status: approved by the owner in chat (2026-10-25). Nothing is pushed and nothing is live.
This file is public once merged. It holds no private notes and no client names.

## Why

The Projects shelf showed tiles with silent looping videos. The owner found the loops messy, and the research (portfolios of well-known
developers, designers and indie makers) found that almost none lead with autoplaying video: the common pattern is a name, one line and one
still, with a link to the live thing when there is one. WCAG 2.2.2 also asks for a pause control on auto-starting motion longer than 5 seconds,
which the loops did not have. So the loops go, and the shelf becomes a slider.

## What the visitor sees

- The Projects page has a header and a slider. One project is selected, in the middle, large. Its neighbors sit smaller on each side, partly
  behind it. Arrows on both sides, the keyboard's left and right keys, five dots and a swipe on phones move to the next or previous project.
  After the last project comes the first again (a full circle).
- Under the picture, the information of the selected project changes with it:
  - its short title and its status badge (Live, Building and testing, Planned),
  - **What it does** (the one line),
  - **Built with**,
  - **Where it stands**,
  - one button: **Ask for access** (an email to the owner with the project name in the subject), **Visit** (a public demo, new tab) or
    **See how it is built** (the case view). A planned project has no button.
- The picture of a project is an HD still (WebP) when a real screenshot exists, otherwise the drawn diagram that the shelf already used.
- No video anywhere on the site. Nothing moves by itself: the slider changes only when the visitor asks. With reduced motion the changes are
  instant.
- This website keeps its case view (`#projects/site`) behind the button. Its Fig. 1 is a still of the opening, Fig. 2 the CV board, Fig. 3 the Trip globe.
- The Home band (three compact tiles) stays, with a small still instead of a clip.

## Access on request

A project that is live or in testing behind a login can show "Ask for access". The button is a `mailto:` link, so the site needs no form and
no backend. The demo login is given on a call. A login is never written on the page or in the repo (the repo is public).
The address is the one already on the CV.

## Data (js/projects.js, public)

Each entry: `id`, `title`, `status`, `order`, `oneLine` (what it does, up to 140 characters), `builtWith` (up to 120), `stands` (up to 140),
then either `image` (`src` and `thumb` WebP paths, `w`, `h`, `alt`) or `figure` (a drawn diagram), never both. Optional: `href` (a public https
demo, live only), `case` (an id with a case view, live only), `access: 'request'` (live or building only; not planned).
No `loop`, no `caseLoop`: the validator rejects them. Private projects are simply absent, as before.

## Behavior and accessibility

- The slider is a group with `aria-roledescription="carousel"` and a label. The selected slide is the only one that is not `aria-hidden`. The panel
  is a polite live region, and it changes only when the visitor acts.
- Arrow buttons and dots are real buttons with names. Left, Right, Home and End work when focus is in the slider. Swipe needs a 45 px horizontal move.
- A click on a neighboring slide selects it. The selection is kept while the visitor reads a case view and comes back.
- Without JavaScript, a plain list shows every project with all its fields and its link (the noscript list, checked against the builder).
- Colors come from `css/tokens.css` only; the picture frame is the fixed dark board look in both themes.

## Files

- `js/projects.js`: data, validation, pure builders (`panelHtml`, `slideHtml`, `sliderHtml`, `noscriptListHtml`, the Home band), `projectAction`.
- `js/projects-slider.js` (new, loaded after `projects.js`): `slideOffsets`, `stepIndex`, the DOM wiring.
- `css/projects.css`: the slider and panel; the shelf, filter chips and clip styles go.
- `index.html`: the slider slot, the header text, the noscript list, the case view without a clip slot, one script tag less (`clips.js`) and one more.
- Removed: `js/clips.js`, its test, the loop media under `img/projects/site/`, the clip and loop rules in `scripts/lib/project-rules.mjs`.
- First kept, then deleted the same day at the owner's request: the loop maker (`scripts/clips/render.mjs`, `stage.html`, scenes) and its tests.
  `capture.mjs` and `still.mjs` make the stills.

## Out of scope

Explore mode on Trip, the car broker real screenshots (they need the demo URL and the owner), any form or backend, a status filter (five
projects do not need one), and a deep link to a single slide.

## Content to approve

The "built with" and "where it stands" lines in the first version are drafted from the project folders on this PC and the owner's earlier
statements. The owner corrects them; each is one line in `js/projects.js`.
