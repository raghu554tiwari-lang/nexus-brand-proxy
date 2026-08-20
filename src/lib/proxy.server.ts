const UPSTREAM = "https://pwmarco-phi.vercel.app";

const OLD_LOGO = "https://i.ibb.co/YBbwNGxz/Logo-pw-removebg-preview.png";
const NEW_LOGO = "https://i.ibb.co/3ykY8VZY/photo-6066420858273600154-x.jpg";

const REPLACEMENTS: Array<[RegExp, string]> = [
  // Assets / links first (most specific)
  [/https:\/\/i\.ibb\.co\/YBbwNGxz\/Logo-pw-removebg-preview\.png/gi, NEW_LOGO],
  [/i\.ibb\.co\\?\/YBbwNGxz\\?\/Logo-pw-removebg-preview\.png/gi, NEW_LOGO.replace("https://", "")],
  // Owner contact link
  [/https?:\/\/telegram\.me\/Deltaverse_owner/gi, "https://t.me/officialmarco22"],
  [/telegram\.me\/Deltaverse_owner/gi, "t.me/officialmarco22"],
  // Channel link
  [/(https:\/\/)?t\.me\/official_marco_22/gi, "https://t.me/PWNexuss"],
  [/official_marco_22/gi, "PWNexuss"],
  // Branding
  [/PW[-_\s]?MARCO/g, "PW-NEXUS"],
  [/Pw[-_\s]?Marco/g, "PW-Nexus"],
  [/pw[-_\s]?marco/g, "pw-nexus"],
  [/(?<![a-zA-Z0-9])MARCO(?![a-zA-Z0-9])/g, "NEXUS"],
  [/(?<![a-zA-Z0-9])Marco(?![a-zA-Z0-9])/g, "Nexus"],
  [/(?<![a-zA-Z0-9])marco(?![a-zA-Z0-9])/g, "nexus"],
];

export function rebrandText(input: string): string {
  let out = input;
  for (const [pattern, value] of REPLACEMENTS) out = out.replace(pattern, value);
  return out;
}

const JOIN_CHANNEL_SCRIPT = `<script>
(function () {
  document.addEventListener(
    "click",
    function (e) {
      var el = e.target.closest('a, button, [role="button"]');
      if (!el) return;
      var text = (el.textContent || el.value || "").trim().toLowerCase();
      if (text.includes("join channel")) {
        e.preventDefault();
        e.stopPropagation();
        window.open("https://t.me/PWNexuss", "_blank");
      }
    },
    true
  );
})();
</script>`;

export function injectJoinChannelScript(input: string): string {
  const closingBody = /(<\/body>)/i;
  if (closingBody.test(input)) {
    return input.replace(closingBody, JOIN_CHANNEL_SCRIPT + "$1");
  }
  return input + JOIN_CHANNEL_SCRIPT;
}

const TEXT_TYPES = [
  "text/html",
  "text/css",
  "text/plain",
  "application/javascript",
  "text/javascript",
  "application/json",
  "application/manifest+json",
  "image/svg+xml",
  "application/rss+xml",
  "text/xml",
  "application/xml",
];

const STRIP_RESPONSE_HEADERS = [
  "content-length",
  "content-encoding",
  "content-security-policy",
  "content-security-policy-report-only",
  "x-frame-options",
  "transfer-encoding",
  "strict-transport-security",
];

// Only these request headers are forwarded upstream. Forwarding everything let
// Vercel-specific headers/cookies (deployment pinning, x-forwarded-*) leak through
// and made the upstream answer "404 DEPLOYMENT_NOT_FOUND" on the published domain.
const FORWARD_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "range",
  "user-agent",
  "x-requested-with",
];

// Vercel pins requests to a specific (possibly deleted) deployment via these cookies.
const STRIP_COOKIES = ["__vdpl", "__vdpl_", "__vercel_deployment_id", "_vercel_jwt"];

function sanitizeCookie(cookie: string): string {
  return cookie
    .split(/;\s*/)
    .filter((part) => {
      const name = part.split("=")[0]?.trim() ?? "";
      return part && !STRIP_COOKIES.includes(name);
    })
    .join("; ");
}

export async function proxyRequest(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, UPSTREAM);

  const headers = new Headers();
  for (const key of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  const cookie = request.headers.get("cookie");
  if (cookie) {
    const cleaned = sanitizeCookie(cookie);
    if (cleaned) headers.set("cookie", cleaned);
  }
  headers.set("accept-encoding", "identity");
  headers.set("origin", UPSTREAM);
  headers.set("referer", UPSTREAM + incoming.pathname);


  const hasBody = !["GET", "HEAD"].includes(request.method);

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : null,
      redirect: "manual",
    });
  } catch (error) {
    return new Response(`Upstream request failed: ${String(error)}`, { status: 502 });
  }

  const outHeaders = new Headers(upstream.headers);
  for (const key of STRIP_RESPONSE_HEADERS) outHeaders.delete(key);

  // Keep redirects on this domain.
  const location = upstream.headers.get("location");
  if (location) {
    try {
      const resolved = new URL(location, UPSTREAM);
      if (resolved.origin === UPSTREAM) {
        outHeaders.set("location", resolved.pathname + resolved.search + resolved.hash);
      }
    } catch {
      /* leave as-is */
    }
  }

  const contentType = (upstream.headers.get("content-type") ?? "").toLowerCase();
  const isText = TEXT_TYPES.some((type) => contentType.includes(type));

  if (!isText || upstream.status === 204 || upstream.status === 304) {
    return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
  }

  let body = rebrandText(await upstream.text());
  if (contentType.includes("text/html")) {
    body = injectJoinChannelScript(body);
  }
  return new Response(body, { status: upstream.status, headers: outHeaders });
}

export { UPSTREAM, OLD_LOGO, NEW_LOGO };
