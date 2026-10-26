# Proofreading pass, 2026-10-25

A fresh reader went through every piece of visitor text on the branch `restructure`: all of `index.html` (Home, the CV in its four readings, Trip with
its plain stop list, Projects with its plain list and case view, the popups, the consent banner, the footer, the guestbook), `js/*.js`, `modules/*`
text, and the SEO block. It changed nothing and reported. I checked each finding against the files before acting.
This file is public once merged. It holds no private notes.

## Fixed (and pinned by `scripts/proofread.test.mjs`)

| Where | Was | Now |
| --- | --- | --- |
| Home, France story | "...at the molecular level, I'm French, so this one..." | "...at the molecular level. I'm French, so this one..." |
| CV, three entries | "reproductive farms" (Spanish "granjas reproductoras") | "breeder farms" |
| CV, chemistry headline | "QC/QA" (everywhere else it is "QA/QC") | "QA/QC" |
| CV skills | "(Lean/5S)" (everywhere else "Lean / 5S") | "(Lean / 5S)" |
| Map, United Kingdom | "Visited, England, Scotland and Wales." | "Visited England, Scotland and Wales." |
| Map, France album | "...take pride seriously, arguing about food..." | "...take pride seriously. Arguing about food..." |
| Trip page hint (my text) | "Press play, or pick a stop." (the flight already plays) | "Watch the flight, or pick a stop." |
| Projects (my text) | "What it does" and "Where it stands" repeated one sentence for the organizer, the broker template and the marketplace | the one line no longer repeats the status; "Where it stands" carries it |

All seven jobs agree across the four CV readings, the departure board, the Home rows, the Trip stop list and the education block (titles, places and
dates). Five countries, four languages and the Intelcia wording are consistent everywhere. "Fig. 2." on the Trip page is deliberate (the art direction
brief numbers it that way).

## Decided by the owner (2026-10-25), done

- **Consent banner:** now "This site uses Google Analytics to count visits and see which pages people open. I do not sell any data."
- **Home stat:** "30+ Countries visited" (he has visited 34; the map marks 32; the "across 5 continents" part was dropped later, see the wording batch below).
- **Home stat "Years in, still climbing":** computed from March 2019 (7 today, 8 from March 2027) by `yearsSince` in `js/clock.js`, so it never goes stale.
- **Cann.Edenn duty:** "waste output" in all three readings.

## Wording batch, decided and done (2026-10-25, pinned by `scripts/proofread.test.mjs`)

| Where | Was | Now |
| --- | --- | --- |
| CV profile | "trusted to represent international brands solo at a major trade show early on" | "trusted to handle a key client solo at a major trade show early on" (the entries describe one key client) |
| Home stat | "Countries visited across 5 continents" | "Countries visited" |
| CV, three bullets | "broiler/layer installations" | "broiler and layer facilities" |
| CV, customer-facing profile | "technical-commercial professional" | "technical professional" |
| CV, Avicampo place | "(Nationwide + Int'l)" | "(nationwide and international)" |
| CV, two bullets | "Brazil (SIAVS, São Paulo)" | "Brazil (SIAVS trade show, São Paulo)" |
| Home kicker and CV | "Israel (Central)" | "Central Israel" |
| Guestbook joke | "two words after the copyright" | "at the end of the copyright" |
| CV, three places | "cylinder mixing" (the owner: French "mélangeur externe") | "open mill mixing" |
| Trip stop 1 | "Born and raised. The route starts here." (said "born" three times) | "The route starts here." |
| Nutshell line | "I've been promoted fast everywhere I've worked, I just don't sit still." | "I went from Operator to Team Lead within months." (a fact the CV backs) |
| CV bullets | "commercial staff / meetings / quotations / team / operations" | "sales ..." (job titles keep "Commercial", e.g. "Commercial Technician") |
| CV bullet | "ongoing commercial projects" | "ongoing client projects" |
| Map captions | "Sunset in the Jungle", "Oyster Parks" | "Sunset in the jungle", "Oyster beds" |

## Still open (waiting for the owner)

1. **Which countries are missing from the map** (34 visited against 32 marked). Not urgent now that the label says only "Countries visited".
2. **"Nadia Prfrancois"** in the guestbook looks like a typo. Left alone by agreement.

## Possible wording improvements (optional; the CV voice is his)

- Comma splices in his voice, left as written: "Website under construction, some things may still change."; "Most people just read the CV, you get the version behind it."; "I use AI on the daily, I trust it but always check its work."
- "Acco" is "Acre" in English.
- Unexpanded abbreviations a recruiter may not know: ICPF, ESBN.
- "Automated checks run before every change" (the case view) is true by habit, not enforced by a hook or CI.

## For Fable (his files, reported only)

- `modules/globe-data.js`: the label says "Czechia" while everything else says "Czech Republic"; the file still holds "Placeholder: the owner writes this line." in its default data. Neither shows today, because the site passes its own stops.
