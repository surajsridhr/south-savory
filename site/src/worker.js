// The Worker: password first, then either the shared list (/api/sync) or the app itself.
import { withPassword } from "./auth.js";
import { onRequestGet, onRequestPost } from "./sync.js";

export default {
  async fetch(request, env) {
    return withPassword(request, env, () => {
      const url = new URL(request.url);
      if (url.pathname === "/api/sync") {
        if (request.method === "GET") return onRequestGet({ request, env });
        if (request.method === "POST") return onRequestPost({ request, env });
        return new Response("Method not allowed", { status: 405 });
      }
      if (url.pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });
      return env.ASSETS.fetch(request);
    });
  },
};
