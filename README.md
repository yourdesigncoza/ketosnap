# KetoSnap

A keto week in your pocket: the plan for each day, a photo check of every meal, and the weekly shop.
Static PWA on Vercel with a small Supabase project behind it: meals and photos are kept on the phone and backed
up to Supabase once you sign in, and meal checks run through a Supabase function that holds the model key.

- **Today**: what to do today (cook extra, move meat from the freezer), the next meal to eat, and each meal you logged
  with its verdict: on plan, close, or off plan. A running net-carb total against the 20 to 30 g target.
- **Snap**: the green camera button. The photo is shrunk on the phone and one model call compares it with the plan
  for that meal: what is on the plate, how it differs, roughly how many net carbs. No photo? Type what you ate.
- **Week**: Monday (Day 1) to Sunday (Day 7), every meal with portions, plus the portion guide and the rules.
- **Shopping**: the weekly list with quantities. Tick items into the trolley; tap to put one back.
  "Start next week's list" clears the ticks.
- **History**: every day you logged and every weekly review. Tap a day to see or add its meals.
- **Notes**: a box on each day for anything that affected it: feeling ill, no spin, a party, your weight.
- **Weekly review**: from Monday, Today offers last week's review: the numbers, your notes and room for a comment.
  Tap **Write my review** for what went well, what pulled you off plan and one thing to focus on next week. Writing
  it also clears that week's photos and keeps small thumbnails. The focus stays on Today all week, and a streak
  counts your good days in a row.

## Install on the phone

1. Open the app link in **Chrome**.
2. Menu (⋮) → **Install app**, or Chrome's own "Add to Home screen".
3. Tap **Sign in** on Today (or Menu → **Settings**) and sign in with your email and password.
   Meals snapped before signing in are kept and get checked once you are in. There are no sign-ups: the one
   account was made by hand.

## Backup

Signed in, every meal and photo is copied to Supabase as you go. After a reinstall, signing in brings them back.
Menu → **Export backup** also saves (or shares) one JSON file with every meal and photo.
**Import backup** merges it back in by meal, so importing the same file twice changes nothing.

## Updates

The app updates itself the next time it is opened online. Settings shows the installed version and has a
**Check for update** button.

## Run locally

```
python3 -m http.server 8766
```

The camera needs HTTPS or `localhost`.
