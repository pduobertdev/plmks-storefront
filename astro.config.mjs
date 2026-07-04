import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// `base` is overridable via ASTRO_BASE so the same source builds for the
// subpath preview (plmks.on-forge.com/plmks-storefront/) and for a top-level
// staging domain (perustaste.on-forge.com → '/').
// NOTE: when set in a deploy.<target>.env, it MUST match the served path.
const BASE = process.env.ASTRO_BASE ?? '/plmks-storefront/';

export default defineConfig({
  site: process.env.ASTRO_SITE ?? 'https://example.com',
  base: BASE,
  output: 'static',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
