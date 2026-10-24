# Putting South Savory online

The site is a Cloudflare Pages project with a D1 database, both on the free plan.
One shared password protects the page and the data. Each phone types it once.

```
site/
  public/index.html        the app
  functions/_middleware.js the password check, in front of everything
  functions/api/sync.js    the shared list both phones read and write
  schema.sql               the database table
  wrangler.toml            project name and database link
```

## First time (run from this `site` folder)

1. Sign in to Cloudflare. A browser window opens; approve it.
   `npx wrangler login`
2. Create the database, then paste the `database_id` it prints into `wrangler.toml`.
   `npx wrangler d1 create south-savory`
3. Create the table.
   `npx wrangler d1 execute south-savory --remote --file schema.sql`
4. Create the site.
   `npx wrangler pages project create south-savory --production-branch main`
5. Set the kitchen password. It asks you to type it; it is never stored in these files.
   `npx wrangler pages secret put APP_PASSWORD --project-name south-savory`
6. Put the site live.
   `npx wrangler pages deploy`

The address is printed at the end, for example `https://south-savory.pages.dev`.
Open it on both phones, enter the password, and add it to the home screen.

## After a change to the app

`npx wrangler pages deploy`

## Changing the password

Run step 5 again, then step 6. Every phone will ask for the new one.

## Moving data from the old app

Open the old app, History, Export backup. On the new site, History, Bring in old app data.
Do it on one phone only; the other phone picks it up.

## Testing on this Mac

`npx wrangler d1 execute south-savory --local --file schema.sql` once, then
`npx wrangler pages dev --port 8788`, with `APP_PASSWORD=...` in `.dev.vars` (not uploaded).
