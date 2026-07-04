/** Asset URL helper — every public asset must carry the Astro `base`. */
const BASE = import.meta.env.BASE_URL;

export const asset = (p: string) => `${BASE}assets/site/${p}`;
export const food = (name: string) => asset(`food/${name}.jpg`);
/** Menu-section header photos. */
export const section = (name: string) => asset(`sections/${name}.jpg`);
/** Per-item photos. */
export const item = (slug: string) => asset(`items/${slug}.jpg`);

const dishPhotoOverrides: Record<string, string> = {}; // per-client photo-name overrides

export const itemForDish = (name: string) => item(dishPhotoOverrides[name] ?? dishSlug(name));

/** Compute a dish-photo slug from its display name. Mirrors the Python
 *  slugify used to scrape /items/ so the URL resolves when a photo exists. */
export function dishSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/★\s*/g, '')
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
