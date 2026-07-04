# plmks-storefront — generic client storefront template

The default customer-facing storefront every PLMKS order-platform clone ships
with, until the client gets their real design. Grabbed from the Peru's Taste
frontend and genericized: neutral slate/blue palette, "Sample Bistro" identity,
placeholder imagery, no client branding.

- Astro 6 + React + Tailwind 4 (pnpm; `pnpm install && pnpm run build`)
- **`dist/` is committed on purpose** — client servers just `git clone` and copy
  `dist/` into the Laravel `public/` dir. No Node needed on servers.
- API is **same-origin** (`/api/...`) — works on any clone domain automatically.
- Menu, config, ordering, checkout all come live from the clone's backend
  (`plmks-order-service`); the static content (hours, story, phone) is template
  placeholder text in `src/data/content.ts`, replaced during the per-client reskin.

## Per-client reskin (the real design pass)
1. Copy this repo → `<client>-frontend`.
2. Design pass: palette/fonts in `src/styles/global.css` (CSS variables only),
   logo + photos in `public/assets/site/`, copy in `src/data/content.ts`.
3. `pnpm run build`, commit (including dist), point the client site's deploy at it.
