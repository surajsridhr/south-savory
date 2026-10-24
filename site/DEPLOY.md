# Putting South Savory online

South Savory runs as a Cloudflare Worker with a D1 database, both on the free plan.
The code lives on GitHub; Cloudflare Workers Builds deploys it on every push to `main`.
One shared password protects the page and the data. Each phone types it once.

```
wrangler.toml              Worker name, the app folder, the database link
site/public/index.html     the app
site/src/worker.js         password first, then the shared list or the app
site/src/auth.js           the password check and login screen
site/src/sync.js           the shared list both phones read and write
site/schema.sql            the database table
```

## Already done (24 Oct 2026)

- Database `south-savory` created and its table set up.
- Worker `south-savory` connected to `github.com/surajsridhr/south-savory`
  (deploy command `npx wrangler deploy`, root directory `/`).

## Set the kitchen password (once)

From the repo folder. It asks you to type it; it is never stored in these files.

`npx wrangler secret put APP_PASSWORD`

Until it's set, the site says "The site password isn't set yet."

## After a change to the app

Push to `main`. Cloudflare deploys it within a minute.

## Changing the password

Run the command above again. Every phone will ask for the new one.

## Moving data from the old app

Open the old app, History, Export backup. On the new site, History, Bring in old app data.
Do it on one phone only; the other phone picks it up.

## Testing on this Mac

`npx wrangler d1 execute south-savory --local --file site/schema.sql` once, then
`npx wrangler dev --port 8788`, with `APP_PASSWORD=...` in `.dev.vars` (not uploaded),
then `node outputs/tests/v2_sync.mjs`.
