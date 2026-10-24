# South Savory — user flows (v2)

Status: **signed off by Suraj on 24 Oct 2026.** Everything below is his answers from the interview. First version built: `site/public/index.html`, live at south-savory.suraj-kreative.workers.dev. Costing (C1–C8) agreed 25 Oct 2026, not built yet.

No post generation. You write the WhatsApp message yourself.

The app does four things: **create the menu, take orders, mark delivery, settle.**

## Who uses it

- You and your sister. She has **full edit across all four categories**, same as you.
- If you both edit the same order at once, **last save wins** (very unlikely).
- **Hosting:** Cloudflare Pages, deployed from your existing GitHub repo, with a password on the site. Data in a shared database (Supabase-style) so both phones see the same orders.
- **No login in phase 1.** It's a personal tool on a link you don't share. Separate logins for each of you come in a later phase.

## Prices

**Every price is editable**, including pre-filled and computed ones (rates, topping, pair prices), so you can keep up with rising costs.

## Menu lists

Every category has its own menu list: lunch, batter, drops. Custom orders pick from the lunch list.

- A new item (name + price) can be added from **two places**: while setting a day's menu (saved to the list in the same step), or from the menu list itself.
- Starting lists are pulled from the old app's items and sorted into categories. They are not exhaustive; add more any time.

### Last posted

Instead of a repeat warning, items show a small "last posted" date so you can see how often something goes out. Never a flag, never a block.

- **Lunch** — shown only if the item went out within the last month; otherwise nothing.
- **Batter** — always shown.
- **Drops** — not shown.
- Custom orders don't count as posted.

## Shared spine

Same in all four categories. Only "create" differs.

1. **Create** — what's on offer, and at what price
2. **Orders** — name, items, quantity, DM or group
3. **Delivery** — tick each person as handed over. One tick covers the whole order; there are no partial deliveries.
4. **Settle** — mark paid; unpaid carries forward until cleared
   - Payments are always **full and final** — one paid tick, no partial amounts.
   - If a customer **overpays**, note "change due ₹X" on the order. It stays in History → Change to give until ticked as given.

While taking orders you always see: a count per item, and the money total.

Names are typed by hand, no recall. For grouping (e.g. who owes), names match **ignoring capital letters and extra spaces** only. "Priya" and "Priya K" stay separate people.

## 1. Lunch — daily

**Create**
- Choose the date first: **today or tomorrow**.
- Pick items from the menu list, grouped: Curries / Palyas / Rice items / Ragi ball and menthya ball / Chapathi.
- Each item carries its standing price. Editing a price on a day's menu changes **that day only**. To change it permanently, edit it in the menu list.

**Combos**
- No combos in the menu list. Old combos are broken into their individual dishes.
- A combo is set up **fresh on each day's menu** (never saved for reuse) as a **priced set of dishes** (e.g. Combo 2: rice, sambar, palya — at the combo price you post).
- An order for a combo is charged the combo price. Everything the kitchen and delivery side see shows only the dishes — never "Combo 2", and no portion tag (you pack it yourself).

**Holidays**
- **Mondays are always off.** No lunch menu can be set on a Monday. Monday food goes in as a custom order.
- Any other day can be marked a holiday.

**Orders**
- Add order → name → tap items (or a combo) → DM/group → save.
- Edit or delete any order, any time. No cut-off.

**Done for the day**
- Means no more orders expected. **Not a lock** — menu stays editable, orders can still be added.
- Shows the day's order summary and stops there. Never pushes you into tomorrow.

**Delivery and settle**
- Names and what each takes, as dishes. Tick delivered. Mark paid. Unpaid carries forward.

## 2. Batter

**Date is chosen each time** — no fixed days.

**Create**
- Pick items from the batter list (idly, dosa, set dosa, paddu, and others). Each item is added **once** with **one price per kg**. No per-size lines, no plain / special-mix split.

**Orders**
- Name → item → weight (½ kg / 750 g / 1 kg, or any weight) → price computes from the per-kg rate.
- **Paddu** is sold by weight like the rest, with the same options (½ kg / 750 g / 1 kg, or any weight), plus a **"With topping"** checkbox. Unticked = plain. Ticked adds **₹15 per kilo started**: ½ kg, 750 g and 1 kg add ₹15; 1.5 kg and 2 kg add ₹30; 2.5 kg adds ₹45. The ₹15 is editable on the paddu item.

Delivery and settle exactly as lunch.

**Close** — once everything's handed over, tap Close on the batch. It moves to History; payments stay markable there, and **Reopen** brings it back for a late order. *(Agreed for now; to review when testing.)*

## 3. Drops — ad hoc

Several drops can run at once and never mix. **No rigid shape** — a drop can be one item (just ragi malt) or many (a festival).

**Create**
- Name the drop, set the collection date.
- Pick items from the drops menu list, or add a one-off by hand (butter, ambode, maddur vade, festival items). A one-off has a **"save to drops menu list"** tick, off by default.
- Each item is sold **per kg**, **per piece**, or **per portion** (about 250 ml — sambar, rasam, pulao). Added once, never per size.
- Per-piece and per-portion items can have an optional **price for 2** (e.g. maddur vade ₹50 each, ₹90 for 2). Quantities charge as pairs plus any single: 3 = ₹90 + ₹50 = ₹140, 4 = ₹180. Still editable on the order line. *(Agreed in principle; Suraj wants to see it in the UI before final.)*

**Prices**
- Regular items carry fixed prices, e.g. **ghee ₹850 per ½ kg**, **dry fruit lehya ₹2,500 per kg**, **ragi malt ₹1,400 per kg**.
- Smaller weights cost more: the price is **pre-filled from the rate** and is **editable on each order line**, so you type what you actually charge.

**Orders**
- Same form. A one-item drop skips item picking.
- Weight items: **type the quantity** (e.g. 0.5 kg ghee); no fixed weight buttons. The price is calculated from the rate per kg, and you can edit it on that line.

**Delivery and settle**
- Pick a date, see every drop due that day together. Tick delivered, mark paid.
- **Close** the drop when done: it moves to History, payments stay markable, **Reopen** if needed. *(Agreed for now; to review when testing.)*

## 4. Custom orders

One customer, their own curated menu, charged per item. They usually come a couple of days ahead.

**Create**
- Customer name → date → pick items from the lunch menu list → quantity.
- Prices start at the **standing lunch price**; edit any line if needed (rare).

**Orders**
- The custom order *is* the order.

**Delivery and settle**
- Tick delivered, mark paid.

Saving a custom order does **not** touch lunch. If it means closing the kitchen that day, you mark the day a holiday yourself.

## Home

Four tiles: **Daily lunch**, **Batter**, **Special drops**, **Custom orders**.

- Each tile opens its own flow: the current status first (today's menu and orders, or posting the next one), then that category's **menu list**.
- **One History** for all four categories, reachable from Home, with **Unpaid** at the top: everyone who owes, oldest first, across every category.
- History also has **Change to give**: overpayments where you owe the customer change, until ticked as given.

## Carried over from the old app

- **Batter and drops history**, including unpaid orders, comes across as order summaries: who ordered, total quantity, revenue. Old plain/special splits and per-size lines fold into the new item-by-weight shape.
- **Lunch history is not carried over** — it stays in the old app.
- **Menu items** from the old app seed the new lists (lunch dishes sorted into groups; combos broken into dishes).
- The old app's backup export is the transfer route.

## Costs (COGS), agreed 25 Oct 2026

- **Third tab** in the bottom bar: Home · History · Costs. Used most for lunch, where the menu changes daily; ragi ball, menthya ball, batter and drops are costed once and kept.
- **Ingredients** are a saved list (name, price, per kg / litre / piece / bunch), kept in Costs and never shown in the menu lists. It starts empty: no researched or guessed prices.
- **Tier first, then refine.** Three tier recipes: up to one vegetable, two vegetables, more than two. Each lunch dish picks a tier (first guess from its price: ₹50 / ₹60 / ₹70), but the tier is about ingredients, not price, so it can be changed. A dish given its own recipe in the calculator (e.g. pepper rasam, where pepper drives the cost) uses that instead. Rice, curd rice, ragi ball, menthya ball, chapathi, batter and drops use their own recipes.
- **A recipe says what it makes**: N portions for lunch, N kg for batter, N kg or N pieces for drops. Cost per unit = (ingredients + overhead) ÷ that.
- **Overhead: one setting, 15%**, on top of ingredients, for spices, gas and labour. Shown as its own line. No packaging or delivery costs: customers bring containers and collect from the door.
- **The calculator shows the margin** for the item being costed: cost per portion, selling price, amount and % left.
- **No daily profit.** Day and batch tiles keep showing revenue only. A **monthly report** in Costs shows the month's revenue, cost and profit. Revenue counts what orders are worth, paid or not. Items with no cost are flagged ("3 items not costed"), never counted as free.

## Parked

Not in these flows: CSV export.

## Open questions

None. All interview questions (Q1–Q26) are settled above.

To review once he's testing it: pair pricing ("price for 2") and Close / Reopen on batter and drops.
