const UPSTREAM = "https://pwmarco-phi.vercel.app";

const OLD_LOGO = "https://i.ibb.co/YBbwNGxz/Logo-pw-removebg-preview.png";
const NEW_LOGO = "https://i.ibb.co/3ykY8VZY/photo-6066420858273600154-x.jpg";

const REPLACEMENTS: Array<[RegExp, string]> = [
  // Assets / links first (most specific)
  [/https:\/\/i\.ibb\.co\/YBbwNGxz\/Logo-pw-removebg-preview\.png/gi, NEW_LOGO],
  [/i\.ibb\.co\\?\/YBbwNGxz\\?\/Logo-pw-removebg-preview\.png/gi, NEW_LOGO.replace("https://", "")],
  [/(https:\/\/)?t\.me\/official_marco_22/gi, "https://t.me/PWNexuss"],
  [/official_marco_22/gi, "PWNexuss"],
  // Branding
  [/PW[-_\s]?MARCO/g, "PW-NEXUS"],
  [/Pw[-_\s]?Marco/g, "PW-Nexus"],
  [/pw[-_\s]?marco/g, "pw-nexus"],
  [/MARCO/g, "NEXUS"],
  [/Marco/g, "Nexus"],
  [/marco/g, "nexus"],
];

export function rebrandText(input: string): string {
  let out = input;
  for (const [pattern, value] of REPLACEMENTS) out = out.replace(pattern, value);
  return out;
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

export async function proxyRequest(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, UPSTREAM);

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
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

  const body = rebrandText(await upstream.text());
  return new Response(body, { status: upstream.status, headers: outHeaders });
}

export { UPSTREAM, OLD_LOGO, NEW_LOGO };
