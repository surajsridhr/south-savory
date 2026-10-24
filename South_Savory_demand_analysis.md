# South Savory — what three months of WhatsApp actually show

**Source:** one WhatsApp export of the main group. Message content runs **5 June 2026 → 2 September 2026** (89 serving-calendar days). Everything before 5 June is join/leave system lines only — disappearing messages had already eaten it. Disappearing messages was turned off on 2 Sept, so this window is the whole record and there will be more from here on.

**Volume:** 817 lines total → 651 real messages → 205 from Suraj/Sandy, 446 from 93 distinct customer accounts.

> **Revision note (after operator input).** Suraj has since confirmed three facts the thread alone could not establish: **Monday is a deliberate weekly off**; the decline in daily lunch is largely **structural — many households in the complex have hired live-in cooks**, so daily lunch is becoming fill-in demand for cook-on-leave and travel weeks; and **August carried 5 custom orders**. §5, §6, §7 and §10 have been corrected accordingly, and §7 is new. Where an earlier reading has been overturned it is marked **[corrected]**.

---

## 0. The caveat that governs everything below

**The group thread does not contain all the orders.** Two pieces of evidence:

1. **The masala vade day (Mon 8 June).** The post capped it at 150 pieces. At 12:31 Sandy wrote "we're almost at our limit of 150… only 10 more left" — implying ~140 sold. Orders visible in the thread up to that minute total **114 pieces**. ~26 pieces, roughly 19%, came from somewhere else (DMs).
2. **Every batter post says "Message me to book yours"**, and the ghee offer says "DM me to place your order." The system is explicitly designed to accept DM orders.

A counter-example that validates the parsing itself: **the paratha day (Tue 7 July)**. Cap 25. At 17:13 Sandy wrote "Last 3 more available" — implying 22 sold. My parse of the thread up to that minute is **exactly 22**. So the extraction is sound; the coverage is what varies.

**Read every lunch number below as a floor, not a total.** My working estimate is that the thread captures somewhere between 70% and 100% of lunch orders, and I cannot narrow it further from this data. This is the single biggest thing to fix operationally — see §7.

---

## 1. The menu: what was actually offered

**55 lunch menu posts** over 89 days. Every one parsed cleanly (`south_savory_menus.csv`).

**Posting discipline is good but drifting.** 51 of 55 were posted the night before; 4 were same-day-morning scrambles (6 Jun 07:31, 12 Jul 07:33, 30 Jul 08:14, 25 Aug 06:34). Night-before posts land between **19:49 and 22:24**, clustering 20:00–21:59 (46 of 51). Suraj apologised for a late post 6 times.

**Structure is a stable two-combo ladder plus à-la-carte add-ons:**

| Element | Pattern |
|---|---|
| Combo 1 | Full plate incl. curd rice. Rs 130–200, mode **Rs 180** (21 of 55 days) |
| Combo 2 | Same minus curd rice (and usually minus ragi ball). Rs 70–140, mode **Rs 110** |
| Ragi ball | **Rs 40**, on all 55 menus, never varied |
| Menthya mudde | **Rs 60**, on all 55 menus, never varied |
| Main dish à la carte | Priced on only 5 of 55 menus (Rs 70–80). Ordered constantly regardless. |

**Four menu archetypes** emerge:

| Archetype | Days | Zero-order days | Avg meal units/day |
|---|---|---|---|
| Rasam + dry side (Rs 200/140) | 9 | 3 | **4.9** |
| Curry + rice/ragi ball (Rs 180/110) | 32 | 6 | **4.1** |
| One-pot rice bath (Rs 140/80) | 13 | 4 | **3.0** |
| Two-dish plate (Pongal+gojju) | 1 | 0 | 2.0 |

**Price is not the constraint.** The two Rs 170 Bisibelebath days averaged 9.5 meal units — the best of any price point — while the twelve Rs 140 one-pot bath days averaged 2.9. The ten Rs 200 days averaged 5.0, outselling the Rs 140 days by 1.7×. People are not buying on price; they are buying on dish.

**Batter (in the main group only until 7 Aug).** 16 batches: Idly (6), Dosa (4), Set Dosa (3), Paddu (3), Adai (1). Pricing per kg: Idly/Paddu Rs 120, Dosa/Set Dosa Rs 150, Adai Rs 160, paddu toppings +Rs 15. **88.2 kg** across 106 orders, ≈**Rs 11,940**. A dedicated batter group launched 31 July; by the 3 Aug batch only 1 order still came to the main group. Batter demand didn't fall — it moved. That stream is now dark to this dataset.

---

## 2. Order volume — the honest numbers

| Metric | Value | Confidence |
|---|---|---|
| Lunch order messages | **142** | High — hand-reviewed every one |
| Menu days with ≥1 visible order | **42 of 55** | High |
| Menu days with **zero** visible orders | **13** | High (that they're absent from the thread) |
| Est. lunch meal units (combos + à-la-carte mains) | **215** | Medium |
| Median order messages, active days | **3.0** (mean 3.4) | High |
| Median meal units, active days | **5.0** (mean 5.1) | Medium |
| Best single day | **28 June, 16 units / 8 households** | Medium |
| Est. lunch revenue, whole window | **Rs 22,330 – 26,910** | Low-medium |
| Est. revenue per active serving day | **Rs 532 – 641** | Low-medium |

The revenue band exists because à-la-carte mains were priced on only 5 menus. Low end prices unlisted mains at Rs 70, high end at the Combo 2 price. **This is an estimate, not a count.**

**Mix (of 215 meal units):**

- Combo 1: 24 units (11%)
- Combo 2: 65 units (30%)
- **À la carte main dish: 126 units (59%)**
- Ragi ball as an add-on: 45 units · Menthya mudde: 18 units · Curd rice alone: 4

**The headline finding: the combo is not the product.** Nearly six in ten meal units are people ordering "1 portion of huli," "2 avial," "3 portions pepper kootu" — the gravy alone, no rice, no combo. Within the combos, Combo 2 outsells Combo 1 **2.7 to 1**. The customer base wants *the dish*, and treats rice/curd rice as optional. That has direct consequences for costing and for menu design.

**Concentration.** 52 households ordered lunch at least once. Median 2 order messages each; the top household sent 14. The **top 10 households account for 44%** of all lunch orders. 17 households ordered exactly once and never returned. Against a group of ~180, roughly **29% have ever ordered lunch in the thread** and maybe 10–12 are the real regulars.

Batter reached a wider set: 40 households, only 25 of which overlap with the lunch buyers. **Batter and lunch are partly different customers.**

---

## 3. Timing against the 10:30 cutoff

Of 142 attributable lunch orders:

| Window | Orders | Share |
|---|---|---|
| Previous evening (post → midnight) | 36 | 25% |
| 00:00–05:59 | 3 | 2% |
| 06:00–07:59 | 28 | 20% |
| 08:00–08:59 | 20 | 14% |
| 09:00–09:59 | 20 | 14% |
| **10:00–10:30 (final half hour)** | **17** | **12%** |
| **After 10:30 (late)** | **18** | **13%** |

Two things stand out.

**A quarter of orders arrive within 30 minutes of the deadline or after it.** 25% of the book lands in the last half-hour or later — the worst possible time for someone who has to shop and start cooking.

**The 10:30 cutoff is not enforced.** 18 late orders appear and, from the follow-up messages, essentially all were accepted ("If it is not late…", "Same here Suraj. Is it too late?" → later "Pick up after 1.30?" → "Ty"). Customers have learned the deadline is advisory. That's generous, and it's also why the tail exists — nothing punishes lateness so nothing prevents it.

**Zero cancellations in three months.** Not one. Three amendments only: a paratha order raised 2→4, an avial order raised 1→2, a batter order changed 1→2.5 kg. All upward, and all de-duplicated in the dataset so the superseded line isn't double-counted. Whatever else is fragile here, order reliability isn't.

---

## 4. Dish performance — ranked by counts

Ranked by average meal units per appearance (`south_savory_dish_performance.csv`). Single appearances are noisy; treat n=1 as a signal, not a verdict.

**Top performers**

| Dish | Appearances | Avg meal units | Avg households |
|---|---|---|---|
| Baby Potato Fry (with Tomato Rasam) | 1 | 16.0 | 8.0 |
| Vangibath | 1 | 10.0 | 8.0 |
| **Bisibelebath** | **2** | **9.5** | **6.0** |
| Palak Peas Bath | 1 | 9.0 | 5.0 |
| Mixed Sprouts Usli / Pepper Kootu / Ash Gourd Majjige Huli | 1 each | 8.0 | 5.0 |
| **Tomato Dal Rasam** (as a component) | **5** | **6.2** | **3.6** |
| Pudina Rice | 2 | 6.0 | 3.0 |
| Bendekayi (Okra) Sambar | 2 | 6.0 | 3.5 |
| **Avial** | **3** | **5.0** | **3.7** |

**Non-performers (zero visible orders on their day)**

Palak Majjige Huli (0 units across **both** appearances), Mangalore Cucumber Huli, Methi Soppu Peas Bath, Potato Brinjal Palya, Lemon Capsicum Bath, Pepper Rasam + Bendekayi Gojju, Horsegram Usli, Capsicum Peas Bath, Onion Capsicum Gojju, Tomato Peas Bath (0.5 avg over 2 appearances). Weak but non-zero: Mixed Soppu Huli, Vegetable Pulav, Radish Sambar, Hasi Kootu (1 unit on each of 2 appearances).

**Reliable repeat performers, with the evidence for each appearance:**

| Dish | Appearance history |
|---|---|
| Bisibelebath | 27 Jun (Sat) 8 units → 9 Aug (Sun) 11 units |
| Avial | 20 Jun (Sat) 0 → 17 Jul (Fri) 10 → 14 Aug (Fri) 5 |
| Tomato Dal Rasam | 13 Jun 8 → 28 Jun 16 → 14 Jul 5 → 30 Jul 0 → 12 Aug 2 |
| Bendekayi Sambar | 30 Jun 4 → 2 Aug 8 |
| Puliyogre | 19 Jun 6 → 22 Jul 5 |
| Vegetable Sambar | 10 Jun 0 → 15 Jul 1 → 16 Aug 4 |
| Palak Majjige Huli | 5 Jul 0 → 4 Aug 0 |

**Practical read:** Bisibelebath, Avial, the Tomato-Rasam-plus-dry-side plate, Vangibath, Baby Potato Fry and Bendekayi Sambar are your proven pullers. Majjige huli in both its forms, one-pot capsicum/lemon baths, and the drier usli/palya-led plates are not landing.

---

## 5. Day of week, and the repeat-interval question

**Day of week** (menu days in the window; note Combo prices vary by day, so this mixes dish effect with day effect):

| Day | Menu days | Zero-order days | Avg order msgs | Avg meal units |
|---|---|---|---|---|
| **Sun** | 11 | 2 | **4.2** | **7.0** |
| Fri | 8 | 0 | 2.9 | 3.8 |
| Sat | 10 | 3 | 2.5 | 3.4 |
| Tue | 12 | 4 | 2.2 | 3.3 |
| Thu | 5 | 1 | 2.6 | 2.8 |
| Wed | 9 | 3 | 1.0 | 2.2 |
| Mon | 0 (weekly off) | — | — | — |

**[corrected] Monday is the weekly off, not a gap.** All 13 Mondays in the window are closed by design. Every "days served" figure below is therefore stated against **available (non-Monday) days**, not calendar days.

**Sunday is twice the business of any other day** — 7.0 meal units vs 2.2–3.9 everywhere else, and only 2 of 11 Sundays drew nothing. That fits the cook-on-leave pattern: Sunday is the day domestic help is most often off. **Wednesday is the weakest day served** (1.0 order messages per day; 3 of 9 Wednesdays drew zero) — a mid-week day when a resident cook is most likely to be present.

**Repetition intervals.** Observed gaps between repeats: Avial 27 and 28 days; Tomato Dal Rasam 15, 16, 16, 13; Bisibelebath 43; Bendekayi Sambar 33; Puliyogre 33; Vegetable Sambar 35 and 32; Pudina Rice 47; Mixed Sprouts Huli 60; Palak Majjige Huli 30.

**Does repeating too soon depress orders? The data does not support that conclusion.** Almost every repeat went *up*, not down: Bisibelebath 8→11 at 43 days, Bendekayi Sambar 4→8 at 33 days, Vegetable Sambar 0→1→4 at 35 and 32 days, Vegetable Bath 0→5 at 35 days, Mixed Sprouts Huli 1→4 at 60 days. Tomato Dal Rasam is the one apparent counter-case (8→16→5→0→2 at 13–16 day gaps), but the dish it was paired with changed every time — Baby Potato Fry pulled 16, Potato-Brinjal Palya pulled 0. **The pairing explains that series better than the interval does.**

The honest conclusion: with n=2 or 3 per dish, and no repeat gap tighter than 13 days, **there is not enough data to identify a fatigue effect.** What the data does show clearly is that *dish identity* and *the dry-side pairing* dominate. Rotating a proven dish back in at ~3–4 weeks appears safe; rotating in a non-performer costs you the day regardless of how long you waited.

---

## 6. Week-over-week: daily lunch is thinning out, and why

| Week starting | Menu days | Zero-order days | Order msgs | Meal units | Distinct households |
|---|---|---|---|---|---|
| 1 Jun | 2 | 0 | 11 | 17 | 10 |
| 8 Jun | 5 | 1 | 18 | 24 | 15 |
| 15 Jun | 4 | 1 | 11 | 18 | 10 |
| 22 Jun | 5 | 1 | 14 | 26 | 13 |
| 29 Jun | 6 | 1 | 12 | 14 | 8 |
| 6 Jul | 5 | 1 | 7 | 11 | 4 |
| **13 Jul** | **6** | **0** | **32** | **41** | **21** |
| 20 Jul | 4 | 0 | 11 | 19 | 10 |
| 27 Jul | 5 | 1 | 7 | 18 | 7 |
| 3 Aug | 3 | 2 | 8 | 11 | 8 |
| 10 Aug | 5 | 2 | 7 | 11 | 6 |
| 17 Aug | 1 | 1 | 0 | 0 | 0 |
| 24 Aug | 3 | 1 | 4 | 5 | 4 |
| 31 Aug | 1 | 1 | 0 | 0 | 0 |

Monthly: **June 5.2 meal units per menu day (17 days) → July 3.8 (24 days) → August 2.7 (13 days).** A ~48% decline in units per open day.

**[corrected] The primary cause is structural, not a menu or engagement failure.** Suraj's account — many households in the complex have hired live-in cooks — is what the household data actually shows:

| Month | Ordering households | Ordered on exactly **one** day | Mean order-days per household | Median basket (meal units) |
|---|---|---|---|---|
| June | 37 | 23 (62%) | 1.54 | 2.0 |
| July | 31 | 16 (52%) | 1.94 | 2.0 |
| **August** | **19** | **17 (89%)** | **1.11** | **2.0** |

**Basket size never moved — frequency collapsed.** Households that order still order the same amount (median 2 meal units, all three months). What changed is that by August almost nobody ordered twice. That is the exact signature of fill-in demand: a household with a cook orders when the cook is on leave or the family is travelling, then disappears for weeks. It is *not* the signature of people who tried the food and disliked it, which would show as smaller baskets and no repeat purchase at all.

Retention supports the same read: 12 of June's 37 households and 10 of July's 30 still ordered in August, and August brought 4 genuinely new households. The customer base didn't churn out — it converted from habitual to occasional.

Supply also contracted (13 menu days in August vs 24 in July), but §7 shows most of that was capacity deliberately moved to custom work, not the kitchen going dark.

**Two smaller factors worth separating out:**

- **The batter group split on 31 July** pulled ~100 messages/month out of the main group, so the group is now lower-traffic and less likely to be checked daily. This probably amplifies the decline but cannot be its cause, since demand per open day was already falling through July.
- **The 13–19 July week** — the best in the dataset, 32 order messages, 21 households, strong dishes (Vangibath 10 units, Avial 10 units) — is what a full 6-day week looked like before the shift. Useful as a capacity benchmark, but probably not a target to recover.

**The structural risk to name:** ~180 members, ~52 have ever ordered lunch, top-10 households carry 44% of orders, and August's ordering households ordered 1.1 times each. Daily lunch is now thin, occasional demand spread over a shrinking base. It can still be worth running — but as a service that keeps the kitchen visible and the relationship warm, not as the revenue engine.

---

## 7. The custom orders: is this quietly becoming an occasion kitchen?

Suraj reports **5 custom orders in August**. The thread does not contain the orders themselves — custom work is negotiated off-group by definition — but it contains their **shadow**, because each one forced a lunch closure or a surplus announcement. Five traces, matching the stated count:

| # | Date(s) | Evidence in thread | Lunch days lost | Value visible? |
|---|---|---|---|---|
| 1 | 6–7 Aug | "limited quantity of freshly made… Paddu Batter available **due to a custom order**. Approximately 3 kg" (6 Aug, 19:02) | 2 (unannounced) | No — only the surplus |
| 2 | 13 Aug | "kitchen will be closed for lunch tomorrow **due to a custom order**" | 1 | No |
| 3 | 19–20 Aug | "closed for lunch the next two days for **obbattu order preparation**" | 2 | **Yes — Rs 3,960** |
| 4 | 22 Aug | "closed for lunch tomorrow **due to a custom order**" | 1 | No |
| 5 | 27–28 Aug | "closed for lunch till Friday due to **Upakarma festival**" | 2 | No |

**Confidence:** items 1–4 are labelled explicitly in the thread and are solid. Item 5 is my inference — the message says "festival," not "custom order," so it could equally be family observance. Four are certain, the fifth is a reasonable candidate to reach Suraj's count of five. Only #3 has a number, and only because it was sold to the group rather than to an outside client.

**The occasion work out-earned daily lunch in August:**

| Stream | Events / days | Visible revenue |
|---|---|---|
| Daily lunch | 13 menu days (7 with visible orders) | **Rs 3,280 – 4,120** |
| Maddur Vada, 2 Aug (evening) | 1 evening, 47 pcs | **Rs 2,120** |
| Varamahalakshmi Obbattu, 20 Aug | 1 run, 88 pcs, 13 households | **Rs 3,960** |
| Batter (main group) | residual only — stream moved out | Rs 60 |
| 4 other custom orders | 6 lunch days lost | **unknown** |

Two occasion events grossed **Rs 6,080** against a whole month of daily lunch at **Rs 3,280–4,120** — and that excludes four custom orders whose value isn't visible at all. **Occasion work is already the larger business, and the gap is wider than these numbers show.**

**Per production day it isn't close:**

| Activity | Gross per production day |
|---|---|
| Obbattu run | **Rs 1,980** (Rs 3,960 over 2 dedicated days) |
| Maddur Vada evening | **Rs 2,120** — and costs *zero* lunch capacity |
| Masala Vade evening (Jun / Jul) | Rs 1,360 / Rs 920 — also zero lunch capacity |
| Aloo Paratha evening | Rs 1,560 — zero lunch capacity |
| Average **active** August lunch day | Rs 468 – 588 |

An obbattu production day is worth **3.4–4.2×** an active lunch day. An evening special is worth **2–4×** a lunch day *and is purely additive* — it runs on top of a normal lunch service without displacing it. That distinction matters more than the raw ratio: **evening specials are free money; festival and custom runs cost lunch days.**

**Is the trend real?** Custom orders visible in the thread: **0 in June, 0 in July, 5 in August.** Specials run: 1 in June, 3 in July, 2 in August (but August's two were the two biggest of the whole window). Meanwhile lunch fell from 17 to 24 to 13 served days and from 5.2 to 2.7 units per day. So yes — over three months the kitchen's output shifted measurably from daily volume toward fewer, larger, occasion-driven production runs. One month of custom-order data is thin evidence for a trend, and August is festival-dense (Varamahalakshmi, Upakarma, Janmashtami running into September), so some of this is seasonal rather than secular. **Directionally clear; magnitude not yet established.**

**The honest framing:** this looks less like a daily tiffin service in decline and more like a kitchen finding a higher-value product. But three things have to be established before acting on it, and none are answerable from this data:

1. **What did the four unvalued custom orders actually earn?** Each one cost 1–2 lunch days, so each needs to clear **Rs 470–590 per day** just to break even against lunch — before ingredients. The obbattu run cleared that bar 3–4×. The others are unknown, and one of them (#1) produced enough surplus batter to need dumping on the group, which is a mild sign of over-production.
2. **Is custom demand repeatable or festival-bound?** Four of the five August events cluster around Varamahalakshmi and Upakarma. A kitchen that earns well in Shravana and nothing in October is a seasonal business, not a pivot.
3. **What's the actual margin?** Obbattu at Rs 45/piece with coconut, jaggery and two days of labour may or may not beat a Rs 180 combo on margin. Gross revenue per day says pivot; margin per hour might not. **This is the single most important thing the COGS model needs to answer.**

**What I'd track from here** (a running custom-order log is the missing dataset): date, occasion, client type (group member vs outside), units, price per unit, lunch days displaced, and hours of Amma's time. Six months of that and this question answers itself.

---

## 8. Operational friction, in the customers' own words

**[corrected] Menu confusion caused by silence — but the problem is much smaller than it first looked.** My original count of "~23 unexplained silent days" was wrong: it counted Mondays (the weekly off) as gaps and treated multi-day closures as single announcements. Corrected, against **available (non-Monday) days**:

| Month | Mondays off | Available | Served | Closure announced | **Silent** | Served rate |
|---|---|---|---|---|---|---|
| June (from 6th) | 4 | 21 | 17 | 2 | **2** | 81% |
| July | 4 | 27 | 24 | 2 | **1** | 89% |
| August | 5 | 26 | 13 | 8 | **5** | 50% |
| Sept (1–2) | 0 | 2 | 1 | 0 | **1** | 50% |
| **Total** | **13** | **76** | **55** | **12** | **9** | **72%** |

**88% of available days were either served or explained.** Only 9 days went silent across three months — that's good discipline, not poor. Two of those nine (6–7 Aug) are almost certainly the custom batter run in §7.

The confusion is real but low-volume: on 17 June customers ordered against the *previous day's* menu and Suraj had to write "the above is yesterday's menu"; on 18 June "Will there be lunch menu for tomorrow?"; on 11 July "Good morning. Did you post lunch menu on group?" Three incidents in three months. Worth a one-line "closed today" habit, not worth a process.

**Pickup time is the number one question — 18 separate messages.** "Can I collect?", "What time can I pick", "Can I come now?", "Shall I send for pickup??", "Hii what time can we pick it up?" The menu post never states a pickup window. Suraj answers each one individually ("By 1.15 :)", "Can pick up now :)", "please collect your orders from 1.30 onwards"). This is pure avoidable load — one line in the menu template removes almost all of it.

**"Am I late?" — 4 messages**, on top of the 18 orders that actually arrived late. The cutoff is stated in batter posts but **never stated in the lunch menu post**.

**Price questions — 3.** "How much for 2 potato fry" → "It's 50 per portion." À-la-carte main prices are on only 5 of 55 menus, but 59% of meal units are à la carte. **The most-ordered format is the one whose price isn't published.**

**Payment is entirely off-thread and informal.** One visible incident: a customer collected on 6 June, then at 13:51 "Suraj I forgot to pay !!", "Can I pay to Suraj Sreedhar account?" → "You can pay to my number uncle. No worries :)". No invoicing, no payment confirmations, no running tabs — and no visible bad debt either. It works because it's 50 households in one apartment complex; it will not survive scale.

**Delivery: there is none.** Pure pickup. One out-of-complex customer (16 June) said "I am not from PSR. I will book porter" and self-organised. No packaging discussion anywhere in three months.

**Timing slips on the kitchen side.** 13 June: a customer messaged "I thought rasam and mudde be ready at 1?" — Suraj explained an extra ragi ball wasn't ready and pushed them to 1:30. 14 July: "There is a slight delay for the night pick up. Please collect the batter at 9.30. Sorry for the inconvenience."

**Capacity and sell-outs.** Only the specials have caps, and the caps bind: masala vade closed early at 150; parathas sold 24 of 25 with a "Last 3 more available" nudge; chapatis sold only 8 of 30. Lunch has **no stated capacity at all**, which is why there is no sell-out signal in the lunch data and no way to tell a bad dish from a sold-out one.

**Zero complaints in three months.** Three unprompted compliments ("Masale vade were too tasty!!", "both taste very good❤️", "both the obattus are yummy yummy"). The product isn't the problem.

**Specials outperform lunch dramatically, per event:**

| Special | Date | Orders | Units | Est. revenue |
|---|---|---|---|---|
| Onion Masala Vade | 8 Jun | 19 | 136 pcs | ~Rs 1,360 |
| Onion Masala Vade | 10 Jul | 11 | 92 pcs | ~Rs 920 |
| Maddur Vada | 2 Aug | 10 | 47 pcs | ~Rs 2,100 |
| Varamahalakshmi Obbattu | 20 Aug | 14 orders / 13 households | 88 pcs (38 kobbari + 50 bele) | **~Rs 3,960** |
| Wheat Aloo Paratha | 7 Jul | 6 | 24 | Rs 1,560 |
| Wheat Chapati | 8 Jul | 2 | 8 | not priced |

One obbattu event beat six average lunch days combined — but it also cost two lunch days of closure to produce. See §7 for the full comparison; the margin question still needs the COGS model.

---

## 9. Parsing method and confidence

**Method.** Regex split on WhatsApp's `DD/MM/YY, HH:MM - Sender: text` header with multi-line continuation; system lines separated by pattern. Senders mapped to session-local pseudonyms (`C001`…`C093`); Suraj and Sandy kept as operators.

Menu posts identified by "Lunch Menu" + "Combo"; service date from "Tomorrow's"/"Today's" in the header line. Combo blocks and à-la-carte `Item : Rs. N` lines parsed structurally. "Hero dish" = Combo 1 items minus the staple set (rice, ragi ball, papad, curd rice, sandige, boondi, raita, chutney).

Customer messages routed by keyword priority — snack terms → batter terms (kg/batter) → lunch terms — then attributed to the open offer window. Lunch orders attributed to the menu whose window (post time → service date 10:30) contains the message; messages in the 5 hours after 10:30 flagged **late**. Quantities parsed by scanning up to 34 characters before an item mention (allowing filler words like "portions of", "extra") then after it, with negation handling for "no ragi ball" / "without toppings", capped at 25 to reject apartment numbers.

**Every one of the 142 lunch orders and 109 batter orders was read by eye against the parse.** 14 messages needed manual override (numbered lists like "1. Combo 2 / 2. One extra majjige huli", "Combo 2 --- 4 ( four )", negation cases) and are flagged in the dataset. **All 65 snack and festival orders were hand-tabulated rather than parsed**, because obbattu orders interleave two SKUs with apartment numbers in ways regex gets wrong.

**Verification performed.** The paratha cap reconciliation (parsed 22 vs the kitchen's own "Last 3 more of 25") is an exact independent match. The vade cap reconciliation is off by 26 units, which is what surfaced the DM-ordering gap. All output files were scanned for phone numbers, names and flat numbers — none remain.

**Confidence by number:**

| Quantity | Confidence | Why |
|---|---|---|
| Menu dates, dishes, combo prices | **High** | Fully structured posts, 55/55 parsed |
| Order message counts, ordering households | **High** | Every message eyeballed |
| Combo unit counts | **High** | Explicit and unambiguous in the text |
| Batter kg | **High** | Consistent "1/2 kg" / "1kg" phrasing |
| Special-event unit counts | **High** | Hand-tabulated |
| À-la-carte main-dish portions | **Medium** | "2 portions Rasam and Usli" is genuinely ambiguous about whether it means 2+2 or 2 of the pair |
| Meal units per day | **Medium** | Sum of the above |
| Revenue estimates | **Low–medium** | À-la-carte mains unpriced on 50 of 55 menus |
| **All lunch totals as a share of true demand** | **Low** | DM orders are invisible; ~19% gap on the one day it's measurable |

**What this dataset cannot tell you:** true total demand (DM orders missing), anything about batter after 7 August, actual COGS or margin, why 13 menu days drew zero orders (bad dish vs. nobody looking vs. all DM), how many people read a post, whether any customer was ever turned away, **and the value of 4 of the 5 August custom orders** — custom work is negotiated off-group, so the thread shows only its shadow (§7).

**Note on the revision.** The operator input arrived after the first pass and overturned three readings: Monday framed as an anomaly (it is the weekly off), ~23 unexplained silent days (actually 9), and the August decline read as a channel/engagement problem (primarily structural). The household-frequency table in §6 and the served-rate table in §8 were computed *after* that input as tests of it, not as illustrations — the fill-in signature (89% single-day households, flat basket size) is independent evidence for what Suraj described, and it would have shown up as evidence against him had frequency held and baskets shrunk instead.

---

## 10. What I'd act on first

**[corrected] — reordered around the occasion-kitchen finding.**

1. **Start a custom-order log today.** Date, occasion, client, units, price/unit, lunch days displaced, hours of Amma's time. This is now the highest-value stream and the *only* one with no data at all. Six months of it settles whether the pivot is real or seasonal, and it's the backbone of the COGS model.
2. **Close the measurement gap on lunch.** Ask people to order in the group, not by DM — or log DM orders in the same place. Until then every lunch number here is a floor.
3. **Price custom work against the right benchmark.** A custom order that closes a lunch day must clear **Rs 470–590 of gross lunch revenue per day displaced**, before ingredients. Obbattu cleared it 3–4×. Assume nothing about the others until #1 has data.
4. **Lean into evening specials — they're the free lunch.** Maddur Vada grossed Rs 2,120 in one evening and displaced *nothing*. Masala Vade, parathas, obbattu all run on top of a normal service day. Of everything in this dataset, this is the best revenue-per-disruption ratio. Two per month is a defensible experiment.
5. **Re-pitch daily lunch as cook-on-leave cover, not a daily habit.** August households ordered 1.1 times each with an unchanged basket — they buy when the cook is off or they're travelling. A standing "cook on leave this week? we've got you" framing meets the demand that actually exists, rather than trying to rebuild a daily habit that the hiring of live-in cooks has structurally removed.
6. **Protect Sunday, and consider dropping Wednesday.** Sunday does 2× any other day and fits the cook's-day-off pattern. Wednesday averages 1.0 order messages per day — on the current volume it may not be worth opening, and that capacity is better pointed at custom work.
7. **Bias the rotation to proven pullers** — Bisibelebath, Avial, Tomato Rasam + a *wet-ish* dry side, Vangibath, Baby Potato Fry, Bendekayi Sambar — and retire or rework Palak Majjige Huli, Lemon/Capsicum baths and the drier usli/palya-led plates. A ~3–4 week interval on a proven dish shows no penalty in this data.
8. **Put four missing lines in the menu template:** order cutoff time, pickup window, à-la-carte price for the main dish, and a capacity ("we're making N portions"). That clears the 18 pickup questions, 4 "am I late" messages and 3 price questions, and gives you a sell-out signal you currently don't have.
9. **Keep the "closed today" habit.** Only 9 silent days in three months — this is already close to solved; just don't let it slip as custom work takes more days out.

---

## Files

| File | Contents |
|---|---|
| `south_savory_menus.csv` | 55 rows — every menu post: service date, day, posted-at, lead, archetype, hero dish, combo prices and contents, à-la-carte prices, side |
| `south_savory_daily_lunch_orders.csv` | 56 rows — per service date: order messages, households, combo/à-la-carte/add-on units, late orders, first/last order time, revenue band |
| `south_savory_dish_performance.csv` | 46 dishes — appearances, dates, total and average meal units, average households, repeat gaps in days |
| `south_savory_batter_batches.csv` | 16 batches — type, orders, households, total kg, toppings count, estimated revenue |
| `south_savory_special_events.csv` | 6 events — cap, cutoff, orders, units, late orders, notes |
| `south_savory_custom_orders_august.csv` | 5 August custom orders reconstructed from their thread shadow — evidence quoted, lunch days displaced, value where known, confidence per row. **Seed this file going forward** (§10 action 1) |
| `south_savory_order_lines.csv` | 371 rows — the atomic ledger: date, time, service date, pseudonymous household, stream, item, qty, late flag, per-row confidence |
| `south_savory_dataset.json` | All of the above in one JSON bundle |

Household IDs are session-local pseudonyms. No names, phone numbers or apartment numbers appear in any output.
