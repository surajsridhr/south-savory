// GET  /api/sync?since=<rev>  → every row changed after that rev
// POST /api/sync {records:[{id,data,deleted,ts}]} → store them; a row only replaces
//      what's there if it was saved later (ts), so a slow phone can't undo a newer edit.
// The password check in auth.js runs before either of these.

const ID = /^[mehox]:[\w:.-]{1,200}$/;
const MAX_DATA = 200000;
const PAGE = 2000;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export async function onRequestGet({ request, env }) {
  const since = Math.max(0, Number(new URL(request.url).searchParams.get("since")) || 0);
  const { results } = await env.DB.prepare("SELECT id, data, deleted, ts, rev FROM records WHERE rev > ? ORDER BY rev LIMIT ?").bind(since, PAGE).all();
  const cursor = results.length ? results[results.length - 1].rev : since;
  return json({ records: results, cursor, more: results.length === PAGE });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const recs = Array.isArray(body && body.records) ? body.records : null;
  if (!recs || recs.length > 1000) return json({ error: "send 1 to 1000 records" }, 400);
  for (const r of recs) {
    if (!r || typeof r.id !== "string" || !ID.test(r.id)) return json({ error: "bad id" }, 400);
    if (!Number.isFinite(r.ts)) return json({ error: "bad ts" }, 400);
    if (!r.deleted && (typeof r.data !== "string" || r.data.length > MAX_DATA)) return json({ error: "bad data" }, 400);
  }
  if (!recs.length) return json({ ok: true, stored: 0 });
  // One transaction: each row takes the next counter value, then the counter moves on.
  const stmts = recs.map((r, i) => env.DB.prepare(
    `INSERT INTO records (id, data, deleted, ts, rev)
     VALUES (?1, ?2, ?3, ?4, (SELECT v FROM counter WHERE k = 'rev') + ?5)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, deleted = excluded.deleted, ts = excluded.ts, rev = excluded.rev
     WHERE excluded.ts >= records.ts`
  ).bind(r.id, r.deleted ? null : r.data, r.deleted ? 1 : 0, r.ts, i + 1));
  stmts.push(env.DB.prepare("UPDATE counter SET v = v + ?1 WHERE k = 'rev'").bind(recs.length));
  await env.DB.batch(stmts);
  return json({ ok: true, stored: recs.length });
}
