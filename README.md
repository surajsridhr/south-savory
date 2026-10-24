# South Savory

A phone-first order book for South Savory, a home kitchen in Bengaluru that takes orders over WhatsApp. It does four things: set the menu, take orders, mark them handed over, and settle payment.

Four kinds of order, one way of working:

- **Daily lunch**: a menu for today or tomorrow, picked from a grouped dish list. Mondays are always off.
- **Batter**: priced per kg, with the weight chosen when the order is taken. Paddu has an optional topping.
- **Special drops**: festivals, ragi malt, lehya and other one-off runs, each with its own collection date.
- **Custom orders**: a customer's own menu from the lunch list.

Every order has a name, DM or group, a "handed over" tick and a paid tick. Unpaid amounts carry forward, and change owed back to a customer is tracked until it's given.

## In this repo

| Path | What it is |
| --- | --- |
| `site/public/index.html` | The app: one HTML file, no build step |
| `site/functions/` | Cloudflare Pages Functions: a shared password, and the sync both phones read and write |
| `site/schema.sql` | The D1 database table |
| `site/DEPLOY.md` | How to put it online |
| `user-flows-v2.md` | The user flows the app is built from |
| `outputs/tests/` | Playwright checks: every flow and money figure, and two phones syncing |
| `screenshots/v2/` | The app at 375×812, light and dark |
| `south-savory-tally.html` | The first version of the app, kept for its history |
| `south_savory_*.csv`, `*.json`, `South_Savory_demand_analysis.md` | Anonymised order history (households as codes) and the demand analysis behind the first version |

## Running it

Open `site/public/index.html` in a browser to use it on one device. For two phones sharing one list, see `site/DEPLOY.md`.

Tests: serve the repo root on port 8899 and run `node outputs/tests/v2_flows.mjs`; for sync, run `npx wrangler pages dev --port 8788` in `site/` and then `node outputs/tests/v2_sync.mjs`.
