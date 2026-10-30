# CLAUDE.md

Guide for working on this repo.

## What this is

A single-user keto PWA for one Samsung phone: the 7-day plan by weekday, meal photos checked against it by one model
call, and the weekly shopping list. Built in the same style as KeepVoice (`~/zoot/projects/keepvoice`). Static files:
no build step, no bundler, no dependencies. Hosted on Vercel as a static site, connected to the public GitHub repo
`yourdesigncoza/ketosnap`: a push to `main` deploys to production.

Backend: Supabase project `ketosnap` (ref `yzwrywrrcdfzcrahdcgl`, eu-west-1) in its own **free** organisation
`KetoSnap`, kept apart from the paid org so it costs nothing. It holds the `meals` table, the private `photos` bucket
and the `check-meal` edge function, which keeps the OpenRouter key as the secret `OPENROUTER_KEY`. Sign-ups are off;
the one user was created with the admin API. A free project pauses after 7 days without use; restore it from the
dashboard (data is kept).

## Commands

```
python3 -m http.server 8766        # local dev server (camera needs localhost or HTTPS)
node --check app.js cloud.js       # the only "build" check there is
git push origin main               # ship the app (Vercel deploys main)
vercel deploy --prod --yes         # manual deploy of the working folder, uncommitted files included

set -a; . ./.env; set +a           # load secrets for the commands below
supabase db push -p "$supabase_db_password"                                         # apply supabase/migrations
supabase functions deploy check-meal --project-ref yzwrywrrcdfzcrahdcgl --use-api   # ship the function
supabase secrets set OPENROUTER_KEY="$openrouter_key" --project-ref yzwrywrrcdfzcrahdcgl
python3 -I tools/meal-photos.py make <dir> <photo id>            # a new meal photo candidate, about US$0.07
python3 -I tools/meal-photos.py save <photo id>=<dir>/<file>.png  # into img/meals/, 960 px JPEG
```

A new dish in `plan.js` needs its photo: add its description to `DISHES` in `tools/meal-photos.py`, make a few
candidates, look at each (nothing red that reads as chilli, no bread), then save the best. All ten share one style
prompt so the cards look like one set; stock photos never matched the plan's plates.

`.env` (git- and Vercel-ignored) holds `openrouter_key`, `supabase_db_password`, `ketosnap_email` and
`ketosnap_password` (the app login).

Reading the meal log (bypasses row level security, so keep the key out of files):

```
SK=$(supabase projects api-keys --project-ref yzwrywrrcdfzcrahdcgl --reveal --output-format json \
  | python3 -c "import sys,json; print([k['api_key'] for k in json.load(sys.stdin)['keys'] if k['type']=='secret'][0])")
curl -s -H "apikey: $SK" "https://yzwrywrrcdfzcrahdcgl.supabase.co/rest/v1/meals?deleted=is.false&order=date,created&select=date,slot,text,status,result"
```

There are no tests. Verify in a browser at phone width (412x915). `window.KetoSnap` exposes `state`, `entries()`,
`addEntry(fields)`, `handlePhoto(file)`, `analyze(entry)`, `tidy(result)`, `planDay(date)`, `autoSlot(date)`,
`push()`, `pull()`, `sync()`, `weekNumbers(monday)`, `weekBrief(monday, comment)`, `writeReview(monday)`,
`streak(date)`, `render()`; `window.KetoCloud` is the Supabase client. To test anything that syncs or calls the model
without touching the live account, stay signed out and swap `KetoCloud`'s methods (`saveMeal`, `putPhoto`,
`dropPhoto`, `dropMeal`, `meals`, `getPhoto`, `checkMeal`) for stand-ins in the page; `KetoCloud.user` can then be
faked. To test a prompt for real, send the captured messages straight to OpenRouter with the function's `MODEL`.
Testing against the live project writes to the real account: remove test rows with the app's Delete (see Gotchas).
When testing with Playwright, a reload needs a changed query string (`/?r=2#today`): going to the same URL with a
different hash only fires `hashchange` and keeps the old script in memory.

## Shipping a change

- Every deploy needs a bump of `KS_VERSION` in `version.js`. `sw.js` imports it for the cache name and `app.js` shows
  it in Settings and toasts "Updated to x" (`ketosnap.seen`). Online phones get new files anyway (network-first);
  the bump is what updates the worker, renames the cache (dropping old offline copies) and changes the shown version.
- Any new static file must be added to `ASSETS` in `sw.js` or it will not be available offline. Meal photos are the
  exception: `sw.js` imports `plan.js` and caches every photo the plan names. A named photo that does not exist makes
  the worker's install fail, so the phone never updates: check `img/meals/` has them all before shipping.
- Vercel serves every file in this folder that `.vercelignore` does not list, and the repo is public. Any file that
  is not part of the app (notes, scripts, docs) goes into `.vercelignore`; anything private goes into `.gitignore` too.
- The worker is network-first with `cache: 'no-cache'` (so the browser's HTTP cache never serves stale files), falls
  back to the cache offline, and calls `skipWaiting` + `clients.claim`; `app.js` reloads on `controllerchange`.

## Architecture

- `plan.js` sets `self.KETO_PLAN`: the days (Monday first), each with `meals: [[label, text, photo] x3]` and `todo`
  (strings, or `[text, recipe id]`), the `guides` (portions, hunger, snacks, drinks, cut out, go easy, first week;
  all sent to the model), the `recipes` (not sent), the shopping groups, the carb target and `photo(id)`, the one
  place that turns a photo id into its path. It is the only copy of the plan in the app. The shared plan page
  (published online, local copy `~/zoot/projects/thisandthat/keto/keto-week.html`) mirrors it: change both.
- `app.js` is one IIFE, read top to bottom:
  1. **State** `{ ticks, gone, stale, pulled }` in `localStorage['ketosnap.v1']`. `ticks` is the shopping list, keyed
     by item name; `gone` holds deletes not yet sent; `stale` holds server photos to delete after a weekly review;
     `pulled` is the newest server `updated` already merged.
  2. **Meals** in IndexedDB (`ketosnap` / `entries`), loaded into `entries` on start. An entry is
     `{ id, date, slot: 0|1|2|'extra', auto, created, updated, text, photo: Blob|null, status, result, error, dirty,
     photoKey }`. `status` is `waiting` (signed out or offline, retried on open and on `online`), `checking` (memory
     only), `done` or `failed` (manual "Check again"). Every change goes through `store()`, which bumps `updated`, sets
     `dirty` and calls `sync()`. Day notes (`slot: 'note'`, id `note-<date>`) and weekly reviews (`slot: 'review'`,
     id `review-<Monday>`, status `draft` or `done`) are entries too, so they store and sync with the same code;
     `entriesOn()` returns meals only (`isMeal`). The `meals` table's slot check allows both (second migration).
  3. **Dates**: Monday is Day 1 (`dayIndex`). A photo goes to the meal due by the clock today (before 11 breakfast,
     before 16 lunch, then dinner); a second photo for a filled meal is an extra. On past days it goes to the first
     open meal. `auto: true` lets the model re-file it (a coffee at lunchtime becomes an extra); picking a meal
     yourself (hero button, meal row, "This was" chips) sets `auto: false`.
  4. **The model**: the app builds the prompt (the day's plan and every guide from `plan.js`) and posts the messages
     to the `check-meal` function, which checks the caller is signed in, adds the model (`MODEL` in
     `supabase/functions/check-meal/index.ts`), `response_format: json_object` and temperature 0, and returns the
     parsed JSON. `tidy()` trims it to `{ food, meal, title, items, verdict, notes, net_carbs, tip }` and turns em
     dashes into commas.
  5. **Sync**: the phone is the working copy. `push()` sends `gone` deletes (row marked `deleted`, photo removed),
     then dirty meals (photo first, to `photos/<user id>/<meal id>.jpg`, then an upsert). `pull()` fetches rows with
     `updated > pulled`, oldest first; the newer `updated` wins and a dirty local meal is never overwritten.
     `catchUp()` (start, sign-in, `online`) runs pull, push, then checks waiting meals.
  6. **Notes, review, streak**: weeks run Monday to Sunday. From Monday, Today shows last week's card (numbers from
     `weekNumbers`, his day notes, a comment box). "Write my review" is one model call (`REVIEW_SYSTEM` +
     `weekBrief`) through the same function; the answer `{ wins, slips, focus, cheer }` is the review's `result`.
     Writing it also runs `retirePhotos()`: each checked photo of that week becomes a 120 px thumbnail in
     `result.stamp`, the photo leaves IndexedDB, and its server copy goes into `stale` for `push()` to delete after
     the row is saved. Once written, Today shows the week's focus with the review folded under it; History lists every
     review. `streak()` counts good days (three meals checked, none off plan, carbs at or under `carbHigh`).
  7. **UI**: hash routing (`#today`, `#week`, `#shop`, `#history`, `#day/YYYY-MM-DD`), DOM built with `el()` (children
     may be nested arrays), full re-render on every change; `render()` keeps the cursor in a text box it redraws.
     The meal sheet is one `<dialog>` re-rendered by `refresh()` while a check runs. `fold()` is the one open/close
     section (recipes, reviews) and remembers which are open across redraws.
  8. **Backup** (Menu, a spare beside sync): `exportBackup()` writes one JSON file (`ticks` plus every meal, photos as
     data URLs) and shares or downloads it. `importBackup()` merges by meal id, skipping ids already present, and
     clears `photoKey` so imported meals and photos go up on the next sync.

## Conventions worth keeping

- The user is ~60 and reads on a phone: base type 18px, rows 18px, tap targets 44px+. Do not shrink them.
- Light theme only (he found the old dark one hard to read). Colours are tokens on `:root` in `style.css`: stone
  page, white cards, olive for "on plan" and "do this next", apricot for "close", tomato for "off plan".
- Plan meals show as dish cards (`dishCard()` in `app.js`): the meal written over its photo, a pale olive card when
  there is no photo. Today's "Next up" is one big card; Week swipes sideways through each day's three.
- A to-do that needs cooking is `[text, recipe id]` and shows a "How to make it" dropdown from `PLAN.recipes`. He has
  never baked: recipes assume zero kitchen knowledge, air fryer first (his preference), °C, SA terms.
- Never use em dashes in any text, in the UI or in the model's answers.
- The code is public. Keep personal health details out of the prompt and the plan; the plan page is shown to
  other people too.
- Dialogs close when the backdrop is tapped (phones have no Esc). Keep that when adding dialogs.
- Fonts are self-hosted (`fonts/outfit-latin.woff2`); do not switch to a CDN.
- Simplicity is a stated requirement (see KeepVoice): one model call, no parsers, no extra settings.
- `cloud.js` talks to Supabase with plain `fetch` (auth, REST, storage, functions); no supabase-js. The publishable
  key in it is public by design; row level security limits every row and photo to `auth.uid()`.

## Gotchas

- `supabase projects api-keys` masks the secret key unless you pass `--reveal`.
- Helper agents share the Playwright browser. Fake meals pushed into `entries()` for screenshots become real the moment
  that browser is signed in and anything calls `store()` (a check, a move): they sync to the live account and reach
  the phone. Keep the test browser signed out, and remove a leaked row with the app's Delete (it marks the row
  `deleted`, so phones drop it on their next pull), not a SQL delete.
- To sign a test browser out, remove `localStorage['ketosnap.session']`. The app's Sign out calls `/auth/v1/logout`,
  which ends every session for the account, the phone's too.
- CLI 2.108 `supabase config push` applied the auth settings, then failed with
  `LegacyConfigPushStorageReadNetworkError` reading the storage config. Check `/auth/v1/settings` after a push.
- The function runs with `verify_jwt = false` (`supabase/config.toml`) and checks the caller itself via
  `/auth/v1/user`, so the public key alone gets a 401.
