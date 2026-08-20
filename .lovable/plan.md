# PW-NEXUS Rebranding Proxy

Goal: serve your existing site `pwmarco-phi.vercel.app` through this project, rewriting branding on the fly so visitors see PW-NEXUS instead of PW-MARCO.

## How it works

A catch-all proxy route forwards every request (pages, `/_next/*` assets, API calls) to the upstream Vercel site, then rewrites text responses before sending them to the browser. Binary assets (images, fonts) stream through untouched.

```text
browser -> this app (proxy + rewrite) -> pwmarco-phi.vercel.app
```

## Replacements applied

- `PW-MARCO`, `PW MARCO`, `PWMARCO`, `pw-marco`, and standalone `MARCO`/`Marco` -> PW-NEXUS / PW Nexus equivalents (case preserved)
- Logo: `https://i.ibb.co/YBbwNGxz/Logo-pw-removebg-preview.png` -> `https://i.ibb.co/3ykY8VZY/photo-6066420858273600154-x.jpg`
- Telegram: `https://t.me/official_marco_22` -> `https://t.me/PWNexuss` (also matches the bare `t.me/official_marco_22` form)

Rewriting runs on HTML, CSS, JS and JSON bodies, so it covers server-rendered pages and client-side Next.js chunks alike.

## Technical details

- New server route `src/routes/api/public/$.ts`-style catch-all plus a root-level catch-all so any path is proxied; upstream base URL in one constant for easy change.
- Forward method, headers (minus `host`/`accept-encoding`), and body; request identity encoding so bodies are rewritable.
- Strip `content-length`, `content-encoding`, and upstream CSP/frame headers that would block asset loading; rewrite `location` headers on redirects to stay on this domain.
- Replacement map kept in a shared module so new brand terms can be added in one place.
- Set the app title/description and favicon to the PW-NEXUS logo.

## Notes

- Cookies/login on the upstream site will keep working, since headers pass through.
- If Vercel later blocks proxying or adds bot protection, the fix would be to copy the site into this project instead of proxying.
