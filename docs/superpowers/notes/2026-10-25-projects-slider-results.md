# Projects slider: results

Date: 2026-10-25. Branch: `restructure`. Spec: `docs/superpowers/specs/2026-10-25-projects-slider-design.md`. Plan: `docs/superpowers/plans/2026-10-25-projects-slider.md`.
Nothing is pushed and nothing is live. This file is public once merged. It holds no private notes, no client names and no logins.

## What was built

The Projects shelf with its looping videos is replaced by a slider. One project is selected in the middle, its neighbors are separate cards to
each side running to the window edge, and arrows, five dots, the Left, Right, Home and End keys and a swipe move through them, wrapping from the
last to the first and back. Under the picture the page shows the project's title and status, **What it does**, **Built with**, **Where it stands**
and one button: **Ask for access** (an email to the CV address with the project in the subject), **Visit** (a public demo, new tab) or **See how it is
built** (the case view of this website). A planned project has no button. The selection survives a visit to the case view.

- The picture is an HD still when a real screenshot exists (this website: the Home page, 1600 by 1000) and otherwise the drawn diagram.
- There is no video anywhere. `check.mjs` fails on any `<video`, any `autoplay`, any video file under `img/projects/`, a still over 250,000 bytes,
  a thumb over 80,000, or a page of images over 3,000,000.
- The case view of this website has three stills: the opening (Fig. 1), the CV board (Fig. 2) and the Trip globe (Fig. 3), all 1600 by 1000.
- The Home band keeps its three compact tiles, with a small still for this website.
- Without JavaScript a plain list shows every project with all its fields and its link (`node scripts/projects-list.mjs` regenerates it).
- Removed: the filter chips, the shelf, `js/clips.js`, the loop and poster files, the video rules. The loop maker (`render.mjs`, the stage page,
  the scene engine, the in-browser recorder, the scenes and their tests) was deleted later the same day at the owner's request; `capture.mjs`
  and `still.mjs` stay, and the save-path guard now allows only WebP stills under `img/projects/<id>/`.

## Numbers

| Measure | Result |
| --- | --- |
| Tests | 471 pass |
| `img/projects/site/` | `home.webp` 167 KB, `home-thumb.webp` 40 KB, `opening.webp` 179 KB, `screen-cv.webp` 143 KB, `screen-trip.webp` 135 KB |
| Case view images | about 0.5 MB (limit 3 MB); the loops it replaced were about 1.1 MB |
| `projects-slider.js` | one classic script, loaded after `projects.js` |

## Checked in a real Chrome (headless, `scripts/lib/cdp.mjs`)

Dark at 1280, paper at 1280, a phone at 375 and 1280 with reduced motion: next and previous by mouse click, wrap from the last to the first and back,
the keys, a dot, a click on a neighbor card, a mouse drag as a swipe, the selection kept across the case view and back, the right button and link
for each project (an access email for the car broker, "See how it is built" for this website, none for a planned project), no console errors, no
sideways scroll. The pure parts and the wiring are covered by Node tests (`projects-slider.test.mjs`, `projects-slider-dom.test.mjs`); three
mutations of the wiring (no timer reset, no jump switch, a swipe that is also a click) each fail a test.

## The words to correct (the owner)

The "built with" and "where it stands" lines are drafts from the project folders on this PC and what the owner said. Each is one line in
`js/projects.js`; after editing run `node scripts/projects-list.mjs` and the tests. The one line of this website now says "these projects"
instead of "this shelf", and the case view says "this projects page".

| Project | Built with | Where it stands |
| --- | --- | --- |
| Car broker template | Next.js, React and TypeScript, Tailwind CSS, Supabase for the database and sign-in, and Resend for email. | Live as a demo on invented data. The operator dashboard is behind a login. |
| This website | Plain HTML, CSS and JavaScript, with three.js and GSAP for the 3D. No framework, no build step. | Live. You are on it, and each feature starts as a written spec that Claude builds. |
| Voice organizer | The Claude app on my phone and Notion, with a written set of instructions. Nothing to host. | Built and in testing on my own phone. It is not public. |
| Broker template for any market | The same stack as the car broker: Next.js, TypeScript, Tailwind CSS and Supabase. | Planned. It starts once the car version is complete. |
| Quote marketplace | Plain HTML, CSS and JavaScript, with Node functions behind a sign-in. | In testing on invented data, and being made generic for many kinds of business. |

## Rulings

- `slideHtml` and `sliderHtml` live in `js/projects-slider.js` (they need `slideOffsets`); the panel, the action and the plain list stay in `js/projects.js`.
- `js/clips.js` and the shelf wiring were removed in Task 3, not Task 5, because `projects.js` no longer called them.
- `scripts/projects-list.mjs` was added to regenerate the plain list, like `trip-list.mjs`.
- The loop maker was kept first (deleting working tools is the owner's call) and deleted when he said so.
- The car broker has both a **Visit** button (its public demo, `https://mdesigns-broker-demo.vercel.app`) and **Ask for access** (the private
  dashboard), so a project may have two buttons (`projectActions`), and the validator allows `access` together with `href`. The demo is public and
  runs on invented data; its real home page is the slide (`capture.mjs car-broker`).

## Not verified, needs a real device

- Swiping the slider on an iPhone and on a real touch screen (the check used a mouse drag; the page asks the browser for vertical scrolling with
  `touch-action: pan-y`).
- How the arrows sit over the neighbor cards on a very narrow phone (375 wide was checked).
- The access email opening the owner's mail app from LinkedIn's in-app browser.

## Fresh review (2026-10-25)

A fresh reviewer read the range `a8742db..HEAD` (the footer, the album, the capture tools and the slider), ran the suite and drove the page in a real
Chrome. Result: no Critical, three Important, fifteen smaller points. Important findings and the smaller ones I raised to Important by effect were
fixed in one pass, each with a test written first and seen failing:

| Finding | Fix | Proof |
| --- | --- | --- |
| A key press with focus on the panel link rebuilt the panel and dropped focus to the page | Keys act only on the slider, its arrows and dots, not on the panel (this also stops Home and End taking over the panel link) | `projects-slider-dom.test.mjs`; real Chrome: focus stays on the link |
| With 4, 6 or 8 projects, cards flew across the stage on a far jump | Jump every card that would move against the direction of travel (3 or more projects); two projects just swap | `projects-slider.test.mjs` (all counts 3 to 8, every move); real Chrome: no card moves the wrong way |
| Paper footer text fell to 4.03:1 on a ridge row | New `--footer-ink` token (paper `#5c5547`, dark the same as mute) | `chrome.test.mjs` computes the worst pixel for both themes (4.5 for text, 7 for links) |
| A drag started on the stage and released outside swallowed the next dot click | A press clears any stale drag | `projects-slider-dom.test.mjs` |
| A mouse swipe on the website's picture started the browser's image drag | `draggable="false"` on slide images | `projects.test.mjs`; real Chrome: the swipe moves the slider |
| `touch-action: pan-y` could block pinch zoom on the picture | `touch-action: pan-y pinch-zoom` | `projects-page.test.mjs` |

### Deferred (not fixed; none breaks the page today)

1. The arrows sit over the edges of the main picture at tablet widths (about 700 to 860 px) and a little on phones. Needs a look on a real iPad.
2. `overflow-x: clip` has no fallback for Safari before 16, where the page could scroll sideways on an old iPhone.
3. With two or three projects the motion is plainer (two swap; with three one card vanishes on one side and appears on the other).
4. Without JavaScript the empty slider is still a tab stop, and the header line still mentions arrows.
5. The validator accepts a few bad shapes: `figure.items` that is not a list, `access` together with `case`, `image.w` of 0, a non-string `alt`.
6. The access email body uses `%0A` for line breaks; the standard asks for `%0D%0A`. Most mail apps cope.
7. Tests: `noscriptListHtml` escaping is not asserted, and many CSS tests pin exact text rather than behavior.
8. Dead code: `.pill[aria-pressed]` and `.pill.is-on` in `base.css`, the status branch of `filterProjects`, the `'shelf'` name and `.shelf-list` class,
   `currentProject()` (used only by tests). The loop maker part of this item is done: it was deleted, and `savepath.mjs` no longer allows video files.
9. Dev tools: `cdp.mjs` can leave its temporary profile folder behind (Windows keeps files locked for a moment), does not stop if the browser
   crashes, and would drive an old browser if its port is taken; `webpUnder` writes over the destination on every attempt; `still.mjs`
   defaults to a 200 KB limit while `check.mjs` allows 250 KB for a still. (The `render.mjs` temp-folder leak went with the tool.)
10. The loop videos (about 2.8 MB) live in the branch history; squash-merging `restructure` keeps them out of `main`.

## Later

- Real screenshots for the organizer (the owner's phone) and the marketplace (once its generic version has a demo), replacing their drawn diagrams.
  `capture.mjs` drives a clean Chrome and cannot reuse a signed-in session; public pages only, or a Chrome profile the owner signs in to once.
- A public `href` on any other project that gets a demo anyone can open; its button then reads Visit.
- The owner tests the swipe on his iPhone when he is home. The site is not online, so he reaches it from the PC: run `node scripts/serve.mjs --host`
  and open the LAN address it prints on the phone (same Wi-Fi).
