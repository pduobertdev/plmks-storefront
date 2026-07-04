# Where to drop new photos

Sample Bistro assets live under:

```
public/assets/site/
├── items/         ← per-dish photos (one per menu item)
├── food/          ← generic composition / lifestyle shots
├── sections/      ← menu category hero photos
├── logo-red.png
├── logo-dark.png
├── og-home.jpg    ← social-share preview (1200×630)
└── seal.jpg
```

## Per-dish photos → `public/assets/site/items/`

Each dish in the menu reads its photo via `itemForDish(name)`. The
filename is the **slugified dish name**: lowercase, spaces → hyphens,
accents stripped.

| Dish name | Filename |
|---|---|
| Anticuchos | `anticuchos.jpg` |
| Ceviche Clásico de Pescado | `ceviche-clasico-de-pescado.jpg` |
| Ají de Gallina | `aji-de-gallina.jpg` |
| Tallarín Verde con Bistec | `tallarin-verde-con-bistec.jpg` |
| Chaufa de Camarones | `chaufa-de-camarones.jpg` |

If a dish has a name override (special characters, alt translation), see
`src/lib/assets.ts → dishPhotoOverrides`.

**Recommended specs:** 1200×1500px (4:5 portrait), JPEG, < 250 KB.

## Replacing the home page hero carousel photos

The home page "Plates we are known for" pulls from `items/` by dish
name. Just replace the file with the same name and re-deploy.

## After dropping new files

```bash
pnpm dev                 # preview locally at http://localhost:4321
./scripts/deploy.sh      # ship to https://plmks-storefront.on-forge.com
```
