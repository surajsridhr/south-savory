// One shared password in front of everything: the page and the data. worker.js runs this first.
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

/* the supplied script wordmark (SS1.ai outlines), shared with the app */
const WORDMARK = '<svg class="sswordmark" viewBox="250 381 488 113" role="img" aria-label="South Savory"><defs><g><g id="ssg0"><path d="M 40.78 -51.20 C 41.51 -48.15 44.04 -47.82 46.78 -47.82 C 48.25 -47.82 51.20 -47.93 52.89 -48.25 C 54.68 -49.51 61.10 -57.10 61.10 -61.73 C 61.10 -66.90 52.78 -74.70 41.29 -74.70 C 25.39 -74.70 12.01 -59.95 12.01 -47.51 C 12.01 -37.29 20.96 -35.18 29.07 -33.40 C 32.98 -32.45 40.03 -30.87 40.03 -22.75 C 40.03 -13.48 30.96 -6.21 20.65 -6.21 C 14.01 -6.21 11.59 -9.37 11.59 -12.21 C 11.59 -18.54 22.43 -20.65 30.54 -20.23 C 30.03 -25.39 26.23 -27.07 21.07 -27.07 C 9.59 -27.07 1.57 -19.17 1.57 -12.85 C 1.57 -6.32 10.10 1.89 24.65 1.89 C 40.87 1.89 53.51 -8.64 53.51 -21.92 C 53.51 -30.12 48.67 -36.03 41.82 -38.98 C 34.87 -41.82 26.54 -41.71 26.54 -49.31 C 26.54 -58.79 39.51 -66.26 44.89 -66.26 C 46.89 -66.26 48.25 -65.21 48.25 -63.75 C 48.25 -60.26 40.67 -54.35 40.78 -51.20 Z M 40.78 -51.20 "/></g><g id="ssg1"><path d="M 21.70 -36.45 C 25.07 -36.45 26.96 -34.14 26.96 -31.71 C 26.65 -31.81 26.03 -32.03 25.07 -32.03 C 21.70 -32.03 20.01 -27.81 20.01 -24.54 C 20.01 -21.28 21.5 -18.75 22.96 -16.85 C 21.92 -12.64 16.75 -7.48 13.06 -7.48 C 9.48 -7.48 8.84 -10.32 8.84 -14.75 C 8.84 -24.43 15.48 -36.45 21.70 -36.45 Z M 39.29 -15.06 C 36.87 -15.06 33.5 -15.70 32.23 -17.06 C 34.76 -21.07 35.60 -27.60 35.60 -32.14 C 35.60 -39.29 28.87 -44.98 21.70 -44.98 C 7.68 -44.98 -1.79 -26.54 -1.79 -14.64 C -1.79 -7.37 3.79 1.26 13.59 1.26 C 21.81 1.26 25.5 -4.42 29.29 -9.59 C 30.65 -8 34.23 -7.57 36.98 -7.57 C 37.60 -7.57 38.34 -7.79 38.76 -8.10 C 40.03 -8.84 41.29 -10.85 41.29 -13.17 C 41.29 -13.48 41.09 -15.28 40.45 -15.28 C 40.14 -15.17 39.82 -15.06 39.29 -15.06 Z M 39.29 -15.06 "/></g><g id="ssg2"><path d="M 24.96 0.53 C 33.07 0.53 40.78 -8.53 41.09 -8.95 C 41.51 -9.59 41.71 -10.21 41.71 -11.17 C 41.71 -12.43 41.09 -13.79 40.03 -14.01 C 38.67 -13.28 33.5 -9.48 30.34 -9.48 C 29.29 -9.48 28.23 -10.32 28.23 -11.37 C 28.23 -19.48 40.67 -39.29 40.67 -41.09 C 40.67 -43.20 38.25 -43.40 36.14 -43.40 C 33.07 -43.40 30.12 -43.09 29.07 -42.78 C 20.54 -20.75 14.96 -9.06 10.10 -9.06 C 8.84 -9.06 7.79 -10.01 7.79 -11.48 C 7.68 -16.96 20.65 -39.18 20.65 -40.56 C 20.65 -42.78 18.32 -42.87 16.12 -42.87 C 13.06 -42.87 10.21 -42.56 9.06 -42.25 C 4.21 -27.81 -2.53 -18.32 -2.53 -9.06 C -2.53 -3.68 2.21 0.84 5.26 0.84 C 10.43 0.84 15.37 -5.57 17.70 -9.37 C 18.01 -5.15 20.96 0.53 24.96 0.53 Z M 24.96 0.53 "/></g><g id="ssg3"><path d="M 8.75 -34.03 C 3.06 -22.12 -1.89 -10.95 -1.89 -7.48 C -1.89 -3.89 2 1.89 7.37 1.89 C 17.90 1.89 27.28 -7.57 28.23 -8.84 C 28.76 -9.48 28.96 -10.21 28.96 -11.17 C 28.96 -12.43 28.34 -13.79 27.28 -14.01 C 25.92 -13.28 18.54 -8.42 15.06 -8.42 C 11.17 -8.42 10.64 -9.68 10.64 -11.17 C 10.64 -15.70 14.96 -25.39 20.12 -35.29 C 24.23 -35.82 28.34 -36.45 30.34 -36.76 C 30.76 -37.51 31.39 -39.82 31.39 -41.09 C 31.39 -42.35 29.60 -43.09 26.34 -43.09 C 25.81 -43.09 25.07 -43.09 24.43 -43.09 C 30.76 -54.46 36.76 -64.57 36.76 -65.10 C 36.76 -66.90 35.40 -67.84 32.98 -67.84 C 30.54 -67.84 27.28 -67.21 25.28 -67.10 C 23.17 -62.48 18.12 -52.57 12.85 -42.25 C 10.01 -41.93 7.48 -41.82 5.90 -41.71 C 5.15 -40.25 4.42 -38.76 4.42 -36.56 C 4.42 -34.87 6.10 -33.92 6.95 -33.92 C 7.48 -33.92 8 -33.92 8.75 -34.03 Z M 8.75 -34.03 "/></g><g id="ssg4"><path d="M 27.18 0 C 34.65 0 42.45 -8.42 42.78 -8.95 C 43.20 -9.68 43.40 -10.85 43.40 -11.28 C 43.40 -12.32 42.78 -13.79 41.71 -14.01 C 40.35 -13.28 35.18 -9.68 31.60 -9.68 C 30.76 -9.68 29.71 -10.32 29.71 -11.90 C 29.71 -19.17 41.29 -34.14 41.29 -37.82 C 41.29 -41.93 36.14 -44.98 33.29 -44.98 C 28.12 -44.98 18.65 -38.03 16.85 -36.67 C 20.65 -46.35 33.92 -69.43 33.92 -71.95 C 33.92 -74.06 31.29 -74.17 29.18 -74.17 C 26.12 -74.17 23.07 -73.96 21.92 -73.54 C 18.32 -65.32 -3.57 -14.12 -3.57 -2.53 C -3.57 -1.46 -2.84 0.42 1.37 0.42 C 2.84 0.42 6.10 0.10 6.75 0 C 11.90 -23.59 19.81 -35.5 25.81 -35.5 C 26.85 -35.5 27.60 -34.98 27.60 -33.92 C 27.60 -31.5 18.43 -16.54 18.43 -9.37 C 18.43 -4.31 22.54 0 27.18 0 Z M 27.18 0 "/></g><g id="ssg5"></g><g id="ssg6"><path d="M 10.32 -11.59 C 10.32 -21.92 19.70 -35.92 24.76 -35.92 C 26.76 -35.92 27.5 -34.23 27.5 -32.87 C 27.5 -26.76 19.90 -7.37 12.64 -7.37 C 11.17 -7.37 10.32 -8.84 10.32 -11.59 Z M 29.92 1.04 C 36.67 1.04 44.98 -7.68 45.71 -8.95 C 46.14 -9.59 46.35 -10.43 46.35 -11.17 C 46.35 -12.43 45.71 -13.79 44.67 -14.01 C 43.29 -13.28 38.87 -9.59 34.76 -9.59 C 33.29 -9.59 32.03 -10.21 32.03 -12.01 C 32.03 -17.90 43.40 -39.71 43.40 -41.09 C 43.40 -42.25 42.78 -43.09 41.82 -43.09 C 33.5 -43.09 33.18 -42.98 32.56 -42.78 L 30.54 -37.40 C 29.5 -41.29 26.65 -44.14 22.75 -44.14 C 12.01 -44.14 -0.53 -27.70 -0.53 -12.75 C -0.53 -1.68 5.15 1.79 9.06 1.79 C 12.64 1.79 19.28 -5.90 20.65 -7.68 C 22.34 -2.53 26.12 1.04 29.92 1.04 Z M 29.92 1.04 "/></g><g id="ssg7"><path d="M 23.70 -16.64 C 25.39 -10.01 31.81 -7.57 35.40 -7.57 C 36.03 -7.57 36.67 -7.79 37.09 -8.10 C 38.34 -8.84 39.51 -11.48 39.51 -13.06 C 39.51 -14.01 39.40 -15.28 38.98 -15.28 C 38.76 -15.17 38.34 -15.06 37.92 -15.06 C 34.14 -15.06 29.39 -16.43 29.39 -20.75 C 29.39 -27.07 38.87 -33.5 38.87 -40.03 C 38.87 -42.14 37.29 -43.20 35.07 -43.20 C 27.39 -43.20 22.23 -33.60 21.59 -24.65 C 20.23 -22.75 14.32 -15.59 10.32 -11.17 C 10.21 -11.79 10.10 -12.21 10.10 -13.48 C 10.10 -18.43 17.90 -35.92 17.90 -39.82 C 17.90 -42.14 15.90 -42.98 14.32 -42.98 C 13.06 -42.98 7.68 -42.87 6.42 -42.78 C 5.15 -35.18 0.31 -13.37 -2.31 -2.95 C -2.31 0.42 4.21 1.04 10.10 1.04 C 11.17 0 19.39 -11.59 23.70 -16.64 Z M 23.70 -16.64 "/></g><g id="ssg8"><path d="M 56.46 0.62 C 64.57 0.62 74.39 -8.10 75.01 -8.95 C 75.54 -9.68 75.64 -10.53 75.64 -11.17 C 75.64 -12.43 75.12 -13.79 73.96 -14.01 C 72.59 -13.28 63.95 -9.59 61.73 -9.59 C 60.57 -9.59 60.26 -10.75 60.26 -12.10 C 60.26 -20.43 75.12 -36.67 75.12 -40.45 C 75.12 -42.78 72.79 -44.25 71.01 -44.25 L 68.06 -44.25 C 66.17 -40.87 64.48 -40.03 61.21 -40.03 C 58.79 -40.03 57 -41.51 57 -43.51 C 57 -45.29 57.95 -45.40 57.95 -47.31 C 57.95 -49.51 56.68 -50.67 54.15 -50.67 C 51 -50.67 44.25 -46.25 44.25 -38.45 C 44.25 -35.60 45.09 -34.23 45.40 -33.60 C 42.45 -24.76 38.25 -17.59 35.60 -17.59 C 34.45 -17.59 33.60 -17.70 32.87 -18.12 C 34.56 -21.81 35.60 -27.92 35.60 -32.14 C 35.60 -39.29 28.87 -44.98 21.70 -44.98 C 7.68 -44.98 -1.79 -26.54 -1.79 -14.64 C -1.79 -7.37 3.79 1.26 13.59 1.26 C 22.34 1.26 25.92 -4.95 29.92 -10.64 C 31.29 -10.21 32.23 -9.79 34.03 -9.79 C 42.14 -9.79 46.89 -19.59 51.20 -31.18 C 52.57 -31.18 57.73 -31.39 59.64 -31.81 C 54.15 -24.43 47.62 -12.43 47.62 -8.42 C 47.62 -4.84 51.31 0.62 56.46 0.62 Z M 21.70 -36.45 C 25.07 -36.45 26.96 -34.14 26.96 -31.71 C 26.65 -31.81 26.03 -32.03 25.07 -32.03 C 21.70 -32.03 20.01 -27.81 20.01 -24.54 C 20.01 -21.28 21.5 -18.75 22.96 -16.85 C 21.92 -12.64 16.75 -7.48 13.06 -7.48 C 9.48 -7.48 8.84 -10.32 8.84 -14.75 C 8.84 -24.43 15.48 -36.45 21.70 -36.45 Z M 21.70 -36.45 "/></g><g id="ssg9"><path d="M 16.64 30.23 C 18.23 22.54 20.43 17.17 23.92 8.75 C 30.45 1.37 41.29 -7.90 42.25 -8.95 C 42.67 -9.48 42.87 -10.21 42.87 -11.17 C 42.87 -12.43 42.25 -14.32 41.20 -14.54 C 39.82 -13.79 31.18 -5.90 28.23 -4.84 C 30.23 -10.95 41.20 -39.93 41.20 -41.60 C 41.20 -43.20 39.40 -44.04 38.03 -44.04 C 35.82 -44.04 31.5 -43.51 30.34 -43.09 C 22.23 -18.43 16.96 -10.75 11.48 -10.75 C 10.21 -10.75 9.68 -11.90 9.68 -13.06 C 9.68 -18.12 21.5 -39.29 21.5 -40.67 C 21.5 -42.14 20.54 -43.09 19.06 -43.09 C 17.48 -43.09 12.10 -42.56 10.43 -42.35 C 5.15 -29.5 -1.15 -17.06 -1.15 -9.06 C -1.15 -2.95 4.21 0.10 5.68 0.10 C 9.59 0.10 17.28 -7.68 20.01 -10.53 C 14.32 7.17 5.48 20.65 5.57 22.85 C 5.79 26.12 11.48 29.07 16.64 30.23 Z M 16.64 30.23 "/></g></g></defs><g fill="currentColor"><use href="#ssg0" x="252.48" y="460.07"/><use href="#ssg1" x="311.49" y="460.07"/><use href="#ssg2" x="350.26" y="460.07"/><use href="#ssg3" x="390.3" y="460.07"/><use href="#ssg4" x="417.69" y="460.07"/><use href="#ssg5" x="459.41" y="460.07"/><use href="#ssg0" x="475.85" y="460.07"/><use href="#ssg6" x="533.8" y="460.07"/><use href="#ssg7" x="578.58" y="460.07"/><use href="#ssg8" x="615.77" y="460.07"/><use href="#ssg9" x="689.74" y="460.07"/></g></svg>';

function loginPage(wrong) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>South Savory</title>
<link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="South Savory"><meta name="apple-mobile-web-app-status-bar-style" content="default">
<link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--ground:#F6EEDB;--label:#FFFCF5;--edge:#E4D6B6;--rule:rgba(168,76,50,.55);--field:#CDBF9E;--text:#143825;--muted:#4E5E4C;--lid-a:#2C6646;--lid-b:#143825;--lid-edge:#0B2216;--on:#FFFCF5;--warn-bg:#F9DCC7;--warn:#7A2E14;--ember:#EF6922}
*{box-sizing:border-box;margin:0}body{background:var(--ground);color:var(--text);font:400 15px/1.45 "Work Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:18px}
form{width:100%;max-width:360px;padding:30px 26px;border-radius:12px;background:var(--label);border:1px solid var(--edge);box-shadow:inset 0 0 0 5px var(--label),inset 0 0 0 6px var(--rule),0 1px 1px rgba(70,45,20,.12),0 10px 22px -10px rgba(70,45,20,.4)}
h1{margin:0}h1 svg{width:220px;height:auto;display:block;color:var(--text)}p{color:var(--muted);font-size:14px;margin-top:10px}
label{display:block;font-size:14px;font-weight:500;margin:24px 0 8px}
input{width:100%;height:48px;border:1px solid var(--field);border-radius:8px;background:var(--label);box-shadow:inset 0 2px 3px rgba(70,45,20,.14);color:var(--text);padding:0 14px;font-size:16px}
input:focus{outline:2px solid var(--text);outline-offset:2px}
button{width:100%;height:48px;margin-top:20px;border:1px solid var(--lid-edge);border-radius:12px;background:linear-gradient(rgba(255,255,255,.16),rgba(255,255,255,0) 45%),linear-gradient(var(--lid-a),var(--lid-b));color:var(--on);font-size:16px;font-weight:500;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 2px 0 var(--lid-edge),0 6px 10px -4px rgba(70,45,20,.4);font-family:inherit}
button:active{transform:translateY(2px);box-shadow:inset 0 2px 4px rgba(0,0,0,.3)}
.err{background:var(--warn-bg);color:var(--warn);border-radius:8px;padding:10px 12px;margin-top:16px;font-size:14px}
</style></head><body><form method="post" action="/login">
<h1>${WORDMARK}</h1><p>Enter the kitchen password. Each phone asks once.</p>
${wrong ? '<div class="err" role="alert">That password is wrong. Try again.</div>' : ""}
<label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
<button type="submit">Open</button></form></body></html>`, { status: wrong ? 401 : 200, headers: { "Content-Type": "text/html; charset=utf-8", ...PRIVATE } });
}

export async function withPassword(request, env, next) {
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

  // the app icon and manifest hold nothing private, and phones fetch them without the cookie when installing
  if (request.method === "GET" && (url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/icons/"))) return env.ASSETS.fetch(request);

  if (same(cookieValue(request, COOKIE), token)) {
    const res = await next();
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(PRIVATE)) out.headers.set(k, v);
    return out;
  }
  if (url.pathname.startsWith("/api/")) return new Response(JSON.stringify({ error: "signed out" }), { status: 401, headers: { "Content-Type": "application/json", ...PRIVATE } });
  return loginPage(false);
}
