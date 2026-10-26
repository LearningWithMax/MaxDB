# Art direction brief: Paper and metal, dark first

Status: draft for owner approval. Date: 2026-10-21. Branch: `restructure` (nothing here is live).
The owner chose style B (Paper and metal) with dark as the primary look. The earlier draft of this file described style A (Night terminal); it is in git history and is replaced by this one.
Once approved, this replaces section 8 (Visual language) of `2026-10-18-master-site-design.md`. The pages, the content and the motion pieces do not change.

## 1. What the look has to do

- Look credible first and memorable second. A recruiter reads it in 30 seconds, a LinkedIn visitor reacts to it in 3.
- Feel like a printed page that has a night terminal inside it: serif for people words, monospace for machine words, and the three motion pieces (opening, flip board, globe) as lit objects on the page.
- Look handmade, not templated: every object is captioned like a figure in a book, and the details are real (the clock, the walnut sticker, the plate numbers).
- Dark is the primary look: warm night paper. Paper is the same system in daylight, with grain and a faint warm glow.

## 2. Principles

1. Plates and figures. Every object (the board, the globe, a project loop) gets a caption: `Fig. 1.`, `Plate 1.`. The reader is looking at exhibits.
2. Three voices. Serif (Instrument Serif) for names, titles and lens words. Monospace (JetBrains Mono) for labels, nav, years, the clock and captions. Condensed capitals (Roboto Condensed) only inside the board objects.
3. One star per screen. Everything else is calm, flat and ruled.
4. Gold is scarce: the star outline, the active filled chip, focus rings. Never a large fill.
5. The lens colors appear only where a lens is named.
6. Real text carries the content; placeholders never stand in for a fact.

## 3. Color

Tokens live in one file (`css/tokens.css`) as CSS variables. Dark is the default. Paper is `:root[data-theme="light"]` (the stored value stays `light`).

| Token | Dark (primary) | Paper | Use |
| --- | --- | --- | --- |
| `--bg` | `#15130f` | `#f2ece1` | Page |
| `--panel` | `#1c1a15` | `#f8f3e9` | Cards, popups |
| `--ink` | `#f2ece1` | `#16130e` | Names, headings, the ruled top line |
| `--text-2` | `#cfc6b4` | `#3d3829` | Body text |
| `--mute` | `#968d7c` | `#6a6355` | Labels, captions, mono text |
| `--rule` | `#322e26` | `#cdc3ae` | Hairlines, card borders |
| `--gold` | `#d9ae4c` | `#a47a16` | Star outline, focus, active accents |
| `--gold-text` | `#d9ae4c` | `#8a640f` | Gold used as text |
| `--gunmetal` | `#9aa3b0` | `#4b5059` | The italic surname, Operations |
| `--teal` | `#3fcf8d` | `#0d7040` | Chemistry & R&D |
| `--orange` | `#ff7a4d` | `#b8431f` | Customer-Facing (as text; the dot may use `#d9532a`) |

Contrast against `--bg` (WCAG): dark ink 15.8, text-2 11.0, mute 5.7, gold 8.9, teal 9.3, gunmetal 7.3, orange 7.2. Paper ink 15.8, text-2 9.9, mute 5.1, gold-text 4.6, teal 5.2, gunmetal 6.9, orange text 4.6; paper gold for lines and outlines 3.3 (non-text needs 3).
The objects stay dark in both themes: the flip board and strip (`#101012`), the opening, the gate and the Trip scene. They are things on the page, not the page.

### Grain and the paper glow

- Both themes carry a very faint paper grain. It is one small tiled noise image used as the page background, so it costs nothing per frame. No full-screen blend-mode layers, no fixed overlays.
- Paper mode adds a faint warm glow, as if lit from behind: a radial wash behind the name (`rgba(226,180,84,.24)` fading out by about 72 percent), a smaller one at the top right (`.12`), a soft halo around the dark objects (`0 0 70px rgba(226,180,84,.34)`) and around cards (`0 0 34px rgba(226,180,84,.16)` plus a 1px white inner highlight).
- All of it is static CSS: no animation, no blur filters. On a small phone only the first wash is kept if scrolling ever stutters.
- Dark mode has no glow. Depth comes from the objects' deep shadows, their 1px edge, and the gold star outline.

## 4. Type

Self-hosted, no outside font requests. All four families are free to use (SIL Open Font License), latin subset only.

| Role | Face | Setting |
| --- | --- | --- |
| The name | Instrument Serif, regular and italic | `clamp(64px, 13.4vw, 178px)`, line 0.84, tracking -0.025em; the surname in italic `--gunmetal`. On phones, two or three lines at about 84px |
| Headings, lens words, project titles | Instrument Serif | 24 to 54px, no tracking |
| Big numerals (stats) | Instrument Serif | 52 to 64px |
| Labels, nav, years, clock, captions | JetBrains Mono 400 (700 for emphasis) | 11 to 12px, lowercase, tracking 0.03em, `--mute` |
| Inside the board objects | Roboto Condensed 700 | Uppercase, tracking 0.18em |
| Body | Inter 400 and 600 | Sentence case, `clamp(14px, 1.5vw, 18px)`, line 1.5 to 1.55, `--text-2` |

No em dashes, American spelling, straight quotes, in every string. Weight of fonts is measured when they are vendored; the target is 120 KB or less in total, loaded with `font-display: swap`, with only Roboto Condensed 700 preloaded (the gate button uses it).

## 5. Layout and spacing

- Content width 1100 to 1200px, side padding 48px on desktop and 18px on phones.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 72.
- Hairlines are 1px `--rule`; the top rule of a ruled list (lens words, stats, experience) is 1px `--ink`.
- Corners: objects 12px, cards 6px, pills fully round. The star is a 1.5px `--gold` outline offset 4px.
- The flip board and strip object is tilted -1.1deg on desktop and -0.7deg on phones, with a deep shadow.
- Breakpoints: 700px (phone) and 1000px (tablet).

## 6. Components

- **Banner:** the balloon logo still (gold for the blended view, then the lens finish) on the left; lowercase mono nav `home / cv / projects / trip` with the active page underlined; the mono clock `tel aviv 21:04` (updates each minute); the theme toggle (a half-filled circle). On phones: logo and toggle on one row, the four nav words on a second row, the clock hidden.
- **Hero:** a mono kicker (`Israel (Central) · open to remote`), the two-line name, one plain line of facts in Inter, then the lens list.
- **Lens list:** a ruled list of numbered serif words (`01 Chemistry and R&D`) each with a colored dot, each linking to `#cv/<lens>`.
- **Preview cards (Home):** every section of Home that stands for a real page is a preview, not the thing itself. A preview is a framed picture, a caption (`Fig. n.` or `Plate n.`), a mono call to action in a gold-outlined pill, and one link around the whole card. It never runs live 3D and is not interactive on its own; the real board and the real globe exist only on their own pages. Hover brightens the frame to `--gold`.
- **Departures preview:** the near-black tilted object with the walnut sticker pinned to its top right corner. It shows three of the seven jobs (the most recent: year, place and the one-line note, as real text) and a last row `4 MORE JOBS · OPEN THE CV →`. Static, not a flipping board. Caption `Fig. 1. Three of seven jobs.` The card opens the CV, where the real flip board lives.
- **Trip preview:** one still frame of the real globe at a stop, with the route drawn on it, a `follow the route →` pill and the caption `Plate 1. The route, Caracas to Yashresh.` The card opens the Trip page. The still is rendered from Fable's globe scene (one image of about 80 KB); a short silent loop can replace it later without changing the page.
- **Projects preview:** three silent loops, an `all projects →` pill, and each tile opens its own project.
- **Flip board (CV):** unchanged engine. It is the same object, with the star outline and the same caption.
- **Stats:** a ruled two-by-two of big serif numerals with mono labels.
- **Pills:** outlined mono pills. The active one is filled (`--ink` background, `--bg` text). A primary action has a gold outline.
- **Cards** (certificates, skills, education): `--panel`, 1px `--rule`, 6px corners.
- **Experience:** a ruled table: mono year in a left column, the serif job title, then the bullets.
- **Projects:** the featured loop with the star outline and a `Plate 1.` caption, then four tiles with serif titles and a mono status. Loops are silent and non-interactive.
- **Trip:** a dark window object on the page, caption `Fig. 2.`, always a night scene in both themes.
- **Popups and album:** `--panel` surfaces with the same hairlines; the album keeps its flag strip.
- **Footer:** hairline on top, mono, email, LinkedIn and the visitor log left, copyright right.

## 7. Motion language

- Interface transitions 160 to 240 ms, ease-out. Page changes fade in 200 ms. A theme change crossfades color over 250 ms.
- The opening, the gate, the board and the globe keep the timings already approved. Nothing else moves on its own: no parallax, no scroll-jacking, no looping decoration. The walnut sticker keeps its single small wobble on load.
- Opening release (owner, 2026-10-23): the spheres float up and out like balloons, as in Fable's original, and the page is underneath. As they leave, the banner slides down from the top, slowly (about 1.2 s, ease-out). Then everything else fades in where it stands (about 0.8 s, staggered about 80 ms). The banner is the only thing that moves: the name does not glide into place. In paper mode it is the same, onto warm paper instead of night paper. Reduced motion: no slide, a plain fade. This replaces the sphere-to-logo glide and the hero settle of the earlier spec.
- Hover and focus: ruled list rows and pills brighten their border to `--gold`; focus rings are 2px `--gold` with a 3px offset.
- Reduced motion: every transition above becomes instant, loops show their still frame, and the opening and flips follow the rules in the spec.

## 8. Theme behavior

- The first visit is dark whatever the system setting says. The choice is stored under `mdb-theme`.
- The toggle in the banner switches dark and paper. The long press on the logo still works as the hidden toggle.
- The opening is always dark. At the release the page background becomes the active theme's `--bg`, so in paper mode the curtain lifts onto warm paper.

## 9. What changes in the build

Replaced: the `index.html` layout markup and every stylesheet, rebuilt from the approved wireframes with placeholder text first, then the existing content. Kept: the routes, the lens system, the opening controller, the board and globe modules, the checks, the tests, the vendored libraries and the content. Added: `css/tokens.css`, the self-hosted fonts, the grain tile, the clock, the lens list and the preview cards.
The plan for this is a separate document (the new shell). Nothing is built until this brief and that plan are approved.

## 10. Acceptance

- Every text color meets the table above in both themes. The page works at 375px and 1280px in both themes.
- Before the gate: HTML, CSS and classic scripts together at or under 150 KB compressed (measured now: 69 KB). Fonts load after, with swap, and total 120 KB or less.
- No outside requests for fonts or images. Reduced motion verified in a real browser.
- The grain and the paper glow add no animation and no per-frame cost; a phone scrolls them without stutter.

## 11. Open

- Whether the Trip preview later becomes a short silent loop instead of a still frame (default: still).
- Whether the clock stays (default: yes, hidden on phones).
- Paper glow strength: the values above are a starting point; tune on screen.
- The italic gunmetal surname on every page, or only on Home and the CV header (default: every page header).
