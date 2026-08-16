# NCT Discography Tracker

A browsable, filterable tracker for the full NCT discography — NCT U, NCT 127,
NCT Dream, WayV, NCT Wish, NCT DoJaeJung, NCT JNJM, SuperM, and solo releases —
with private personal notes on each release.

It's a static site: plain HTML/CSS/JS, no build step, no backend.

## Structure

- `index.html` — the page shell.
- `css/styles.css` — all styling.
- `js/data.js` — the discography dataset (`DATA`, plus a few debut-lineup
  constants). This is the file to edit when adding or correcting a release.
- `js/app.js` — filtering, sorting, search, the member picker, and the
  personal-notes feature.
- `scripts/check-freshness.mjs` — used by the scheduled workflow below; not
  needed to run the site itself.

## Running it locally

No build step — just serve the folder:

```
python3 -m http.server 8000
```

then open `http://localhost:8000/`.

## Personal notes

Each release's expand panel (▸) includes a private notes box. Notes are saved
to `localStorage` in the visitor's own browser only — there's no account
system and no server, so nobody else ever sees them, and they don't sync
across devices. The footer has "export as file" / "import from file" so
notes can be backed up or moved to another browser.

## Adding or correcting a release

Edit `js/data.js`. Each entry in the `DATA` array looks like:

```js
{d:"2024-02-26",u:"Solo",t:"Tap",ty:"EP",la:"Korean",m:["Taeyong"],
 n:"2nd EP, #1 iTunes in 33 regions",
 cv:"https://…cover-art…jpg",
 tl:[{"t":"★TAP","url":"https://genius.com/…"}, "Moon Tour", …],
 credits:{"Taeyong":["lyrics","composer"]}}
```

- `d` — release date (`YYYY-MM-DD`, or `YYYY`/`YYYY-MM` with `ap:true` if only
  an approximate date is known).
- `u` — one of the unit names in `UNITS` in `js/app.js`.
- `t` / `ty` / `la` / `m` / `n` — title, release type, language(s), members
  who performed on it, and a short note.
- `cv` — cover art URL (optional; falls back to a ♪ placeholder).
- `tl` — tracklist (optional). Each track is either a plain string or
  `{t, url, isNew}`; prefix the title track with `★`.
- `credits` — optional map of member → `["lyrics", "composer"]` for
  KOMCA-verified writing/composing credits.

There's no live feed to a streaming API here — this is a hand-curated
dataset, kept accurate by whoever maintains the repo.

## Staying current

A scheduled workflow (`.github/workflows/freshness-check.yml`) runs every
Monday, checks how old the newest release in `js/data.js` is, and opens (or
comments on) a GitHub issue labeled `discography-freshness` if it's been more
than 30 days — a nudge to go check for anything new, not an automatic
updater. You can also trigger it manually from the Actions tab
("Discography freshness check" → Run workflow).

## Deploying

`.github/workflows/deploy.yml` publishes the site to GitHub Pages on every
push to `main`. To turn it on:

1. In the repo's **Settings → Pages**, set the source to **GitHub Actions**.
2. Merge/push this branch to `main` (or rename it to `main` if this is a
   fresh repo with nothing else on it yet).
3. The `Deploy site to GitHub Pages` workflow will run and publish the site;
   the URL shows up in that workflow run's summary and in Settings → Pages.

You can also deploy this anywhere else that serves static files (Netlify,
Vercel, Cloudflare Pages, S3, etc.) — there's nothing GitHub-Pages-specific
about the site itself, only about the included deploy workflow.
