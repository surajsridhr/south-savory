// One shared password in front of everything: the page and the data.
// The password lives in the APP_PASSWORD secret, never in this code. A correct
// password sets a cookie that lasts a year, so each phone types it once.

const COOKIE = "ss_auth";
const YEAR = 60 * 60 * 24 * 365;

async function tokenFor(password) {
  const bytes = new TextEncoder().encode(password + ":south-savory");
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function cookieValue(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function same(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const PRIVATE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };

function loginPage(wrong) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>South Savory</title>
<style>
:root{--ground:#f4f3f1;--surface:#fff;--text:#0a0a0a;--muted:#5f5f5f;--control:#d4d4d4;--primary:#141414;--on:#fff;--warn-bg:#fffbeb;--warn:#92400e}
@media (prefers-color-scheme: dark){:root{--ground:#0b0b0b;--surface:#161616;--text:#f5f5f5;--muted:#b4b4b4;--control:#444;--primary:#f5f5f5;--on:#0b0b0b;--warn-bg:#2d2210;--warn:#f2b866}}
*{box-sizing:border-box;margin:0}body{background:var(--ground);color:var(--text);font:400 15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
form{width:100%;max-width:360px}h1{font-size:24px;font-weight:500;letter-spacing:-.01em}p{color:var(--muted);font-size:14px;margin-top:6px}
label{display:block;font-size:14px;font-weight:500;margin:24px 0 6px}
input{width:100%;height:48px;border:1px solid var(--control);border-radius:6px;background:var(--surface);color:var(--text);padding:0 12px;font-size:16px}
button{width:100%;height:48px;margin-top:16px;border:0;border-radius:6px;background:var(--primary);color:var(--on);font-size:16px;font-weight:500}
.err{background:var(--warn-bg);color:var(--warn);border-radius:8px;padding:10px 12px;margin-top:16px;font-size:14px}
</style></head><body><form method="post" action="/login">
<h1>South Savory</h1><p>Enter the kitchen password. Each phone asks once.</p>
${wrong ? '<div class="err" role="alert">That password is wrong. Try again.</div>' : ""}
<label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
<button type="submit">Open</button></form></body></html>`, { status: wrong ? 401 : 200, headers: { "Content-Type": "text/html; charset=utf-8", ...PRIVATE } });
}

export async function onRequest({ request, env, next }) {
  if (!env.APP_PASSWORD) return new Response("The site password isn't set yet. See DEPLOY.md.", { status: 503, headers: PRIVATE });
  const url = new URL(request.url);
  const token = await tokenFor(env.APP_PASSWORD);

  if (url.pathname === "/login" && request.method === "POST") {
    const form = await request.formData();
    if (same(await tokenFor(String(form.get("password") || "")), token)) {
      return new Response(null, { status: 303, headers: { Location: "/", ...PRIVATE,
        "Set-Cookie": `${COOKIE}=${token}; Max-Age=${YEAR}; Path=/; HttpOnly; Secure; SameSite=Lax` } });
    }
    await new Promise(r => setTimeout(r, 800));   // slow down guessing
    return loginPage(true);
  }

  if (same(cookieValue(request, COOKIE), token)) {
    const res = await next();
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(PRIVATE)) out.headers.set(k, v);
    return out;
  }
  if (url.pathname.startsWith("/api/")) return new Response(JSON.stringify({ error: "signed out" }), { status: 401, headers: { "Content-Type": "application/json", ...PRIVATE } });
  return loginPage(false);
}
