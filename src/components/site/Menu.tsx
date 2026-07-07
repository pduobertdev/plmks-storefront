import { useState, useEffect, useRef, useCallback } from 'react';
import type { Lang, T } from '../../lib/lang';
import { useLang, pick } from '../../lib/lang';
import { INFO, MENU, UI } from '../../data/content';
import type { MenuCategory, MenuItem } from '../../data/content';
import { fetchDisplayMenu } from '../../lib/orderApi';
import type { OrderMenuCategory } from '../../lib/orderApi';
import { section, asset, item, itemForDish } from '../../lib/assets';
import { PhotoLightbox } from '../PhotoLightbox';
import { PageHero } from './PageHero';
import { SiteNav } from './SiteNav';
import { SiteFooter } from './SiteFooter';
import { Cenefa, Chakana } from '../Cenefa';
import { LineReveal, FadeUp } from '../motion';

const BASE = import.meta.env.BASE_URL;

// [keyword-substrings, svg-path] — matched against English category name (lowercase)
const CAT_ICONS: [string[], string][] = [
  [['chicken', 'meat', 'carne', 'pollo'],
   // steak with grill marks
   'M2 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zM5 3v10M11 3v10'],
  [['vegetarian', 'vegetal', 'verdura'],
   // broccoli: three circles + stem
   'M4 6.5a2 2 0 1 1 4 0M8 6.5a2 2 0 1 1 4 0M6 8.5a2 2 0 1 1 4 0M8 10.5V14M6 14h4'],
  [['seafood', 'mariscos', 'pescado'],
   // waves
   'M1 7c1.5-2.5 3-3 4.5-3S8.5 6 10 7s3 3 4.5 3M1 11c1.5-2.5 3-3 4.5-3S8.5 10 10 11s3 3 4.5 3'],
  [['appetizer', 'entrada', 'aperitivo'],
   // fork (3 tines + handle)
   'M5 1v6M7 1v6M9 1v6M7 7v8'],
  [['grill', 'stir', 'fry', 'wok'],
   // flame
   'M8 14c-3 0-5-2-5-5 0-2 1-4 2-5 0 2 1 3 2 3.5-.5-2 0-3.5 1-4.5 0 2 2 4 2 6 .5-1 .5-2 0-3 1.5 1.5 1 4-.5 5.5 1-.5 1.5-2 1.5-2.5'],
  [['soup', 'sopa', 'caldo'],
   // bowl + steam lines
   'M3 10h10M2 13h12l-.8 2H2.8L2 13zM6 7c0-1.5 1-2 1-3M10 7c0-1.5-1-2-1-3'],
  [['special', 'signature', 'featured', 'house'],
   // star
   'M8 1.5l1.6 4.5H15l-4 2.8 1.5 4.7L8 10.5l-4.5 3 1.5-4.7-4-2.8h5.4z'],
  [['side', 'antojo', 'acompaña'],
   // plate + rim
   'M4 10c0 2.2 1.8 3 4 3s4-.8 4-3-1.8-3-4-3-4 .8-4 3zM1 13h14'],
  [['kid', 'niño', 'child', 'children'],
   // smiley
   'M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM5.5 9c.5 1.2 1.4 2 2.5 2s2-.8 2.5-2M6 6.5h.1M10 6.5h.1'],
  [['dessert', 'postre', 'dulce', 'sweet'],
   // ice cream cone: semicircle scoop + V cone
   'M5 8a3 3 0 0 1 6 0H5zM5 8l3 7 3-7'],
  [['drink', 'bebida', 'jugo', 'refresco', 'beverage'],
   // cup
   'M5 2h6l-1 11H6L5 2zM4 5h8'],
  [['lunch', 'almuerzo', 'weekday', 'semana', 'lunes'],
   // sun
   'M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 2v1M8 13v1M2 8h1M13 8h1M4.1 4.1l.7.7M11.2 11.2l.7.7M4.1 11.9l.7-.7M11.2 4.8l.7-.7'],
  [['breakfast', 'desayuno'],
   // sunrise: half-circle + horizon + three rays
   'M4 11a4 4 0 0 1 8 0M2 11h12M8 7V5M5.5 7.5 4 6M10.5 7.5 12 6'],
];

function catIconPath(nameEn: string): string | null {
  const n = nameEn.toLowerCase();
  for (const [keys, path] of CAT_ICONS) {
    if (keys.some((k) => n.includes(k))) return path;
  }
  return null;
}

function CatIcon({ nameEn, active }: { nameEn: string; active: boolean }) {
  const path = catIconPath(nameEn);
  if (!path) return null;
  return (
    <svg
      width="15" height="15" viewBox="0 0 16 16"
      fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden
      style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}
    >
      <path d={path} />
    </svg>
  );
}


export default function Menu() {
  const [lang, setLang] = useLang();
  const [active, setActive] = useState(MENU[0].id);
  const [menuData, setMenuData] = useState<(MenuCategory | OrderMenuCategory)[] | null>(null);

  // Fetch live data from admin API — falls back to static MENU if API is off
  useEffect(() => {
    fetchDisplayMenu()
      .then((data) => { setMenuData(data ?? MENU); })
      .catch(() => { setMenuData(MENU); });
  }, []);

  useEffect(() => {
    if (!menuData) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    menuData.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [menuData]);

  return (
    <div>
      <SiteNav lang={lang} setLang={setLang} current="menu" />
      <main className="relative">
        <PageHero
          image={asset('hero-menu.jpg')}
          kicker={lang === 'en' ? 'Neighborhood Kitchen · Anytown' : 'Cocina del Barrio · Anytown'}
          lines={[lang === 'en' ? 'The Menu' : 'La Carta']}
          sub={lang === 'en'
            ? 'The full menu — every section, cooked fresh every day.'
            : 'La carta completa — cada sección, fresca todos los días.'}
        />

        {/* sticky bar + categories share one container so the sticky stops here */}
        <div>
          <div
            className="sticky top-[86px] z-30 border-y border-line"
            style={{ backgroundColor: 'var(--color-cream-deep)' }}
          >
            <div className="overflow-x-auto flex no-bar">
              <div className="flex gap-1 px-4 py-2 mx-auto">
                {(menuData ?? []).map((c) => (
                  <a
                    key={c.id}
                    href={`#${c.id}`}
                    className="shrink-0 flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[0.72rem] font-medium tracking-wide transition-colors duration-200 whitespace-nowrap"
                    style={{
                      backgroundColor: active === c.id ? 'var(--color-ink)' : 'transparent',
                      color: active === c.id ? 'var(--color-cream)' : 'var(--color-ink-mute)',
                    }}
                  >
                    <CatIcon nameEn={c.name.en ?? ''} active={active === c.id} />
                    {pick(c.name, lang)}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
            {menuData === null ? (
              /* skeleton — shown only while the API is in-flight */
              <div className="py-14 space-y-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-3.5 rounded-[1.1rem] border border-line bg-cream-card p-3.5 animate-pulse">
                    <div className="h-[84px] w-[84px] shrink-0 rounded-[0.75rem] bg-ink/10" />
                    <div className="flex-1 space-y-2.5 py-1">
                      <div className="h-4 w-2/3 rounded-full bg-ink/10" />
                      <div className="h-3 w-full rounded-full bg-ink/10" />
                      <div className="h-3 w-1/2 rounded-full bg-ink/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              menuData.map((cat, i) => (
                <Category key={cat.id} cat={cat as MenuCategory} index={i} lang={lang} />
              ))
            )}
          </div>
        </div>

        {/* note */}
        <div className="mx-auto max-w-[1180px] px-5 sm:px-8 pb-24">
          <div className="rounded-[1.5rem] bg-cream-deep border border-line p-7 sm:p-10 text-center">
            <p className="font-display italic text-[1.3rem] text-ink">
              {lang === 'en' ? 'Ready to eat?' : '¿Listo para comer?'}
            </p>
            <p className="mt-2 text-ink-mute text-[0.95rem] max-w-md mx-auto">
              {lang === 'en'
                ? `Order pickup online — most orders are ready in about ${INFO.pickupMinutes} minutes.`
                : `Pide para llevar en línea — la mayoría está lista en unos ${INFO.pickupMinutes} minutos.`}
            </p>
            <a
              href={`${BASE}order`}
              className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-ladrillo px-7 py-3.5 text-cream font-semibold transition-colors duration-300 hover:bg-ladrillo-deep"
            >
              {pick(UI.orderNow, lang)} <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </main>
      <SiteFooter lang={lang} />
      <style>{`.no-bar::-webkit-scrollbar{display:none}.no-bar{scrollbar-width:none}`}</style>
    </div>
  );
}

function Category({ cat, index, lang }: { cat: MenuCategory; index: number; lang: Lang }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <section id={cat.id} ref={ref} className="scroll-mt-[150px] py-14 sm:py-20 border-b border-line last:border-0">
      {/* category hero band — section photo as full-width background */}
      <div className="relative h-64 sm:h-80 lg:h-[22rem] overflow-hidden rounded-[1.6rem] sm:rounded-[2rem] mb-10 sm:mb-14">
        <img
          src={section(cat.photo)}
          alt={pick(cat.name, lang)}
          loading={index < 2 ? 'eager' : 'lazy'}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(30,41,59,0) 35%, rgba(30,41,59,0.55) 70%, rgba(30,41,59,0.88) 100%)',
          }}
        />
        <div className="absolute bottom-0 inset-x-0 p-6 sm:p-9 text-cream">
          <div className="flex items-center gap-3">
            <span className="kicker text-[0.66rem] text-cream/75">
              {cat.items.length} {lang === 'en' ? 'dishes' : 'platos'}
            </span>
          </div>
          <h2 className="display mt-2 text-[clamp(2.4rem,6vw,4.4rem)] font-semibold leading-[0.95]">
            {pick(cat.name, lang)}
          </h2>
          <p className="mt-1.5 font-display italic text-[1.05rem] sm:text-[1.15rem] text-cream/85 max-w-xl">
            {pick(cat.blurb, lang)}
          </p>
        </div>
      </div>

      {/* items */}
      <div className="grid sm:grid-cols-2 gap-x-12 gap-y-8">
        {cat.items.map((it) => (
          <FadeUp key={it.name} y={18}>
            <Dish it={it} lang={lang} />
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

function Dish({ it, lang }: { it: MenuItem & { isFavorite?: boolean; apiId?: string }; lang: Lang }) {
  const [lightbox, setLightbox] = useState(false);
  // Prefer an admin-uploaded photo (a real upload for this exact item); fall
  // back to the curated static set keyed by slug/name when none is set.
  const photoSrc = (it as any).photoUrl
    || ((it as any).apiId ? item((it as any).apiId) : itemForDish(it.name));
  const close = useCallback(() => setLightbox(false), []);

  return (
    <article className={`flex gap-3.5 rounded-[1.1rem] border p-3.5 transition-colors duration-300 ${it.isFavorite ? 'bg-ladrillo/10 border-ladrillo/35' : 'bg-cream-card border-line'}`}>
      {/* clickable photo thumbnail */}
      <button
        onClick={() => setLightbox(true)}
        className="h-[84px] w-[84px] shrink-0 overflow-hidden rounded-[0.75rem] cursor-zoom-in"
        aria-label={`View photo of ${it.name}`}
      >
        <img
          src={photoSrc}
          alt={it.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src.includes('logo-red.png')) return;
            img.src = asset('logo-red.png');
            img.classList.remove('object-cover');
            img.classList.add('object-contain', 'p-2', 'bg-cream-deep');
          }}
        />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="font-display text-[1.15rem] font-semibold text-ink leading-tight">{it.name}</h3>
          {it.isFavorite && (
            <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-ladrillo text-cream text-[0.62rem] font-semibold px-2 py-0.5 leading-none tracking-wide mt-0.5">
              ★ {lang === 'en' ? 'Favorite' : 'Favorito'}
            </span>
          )}
          <span className="ml-auto numeral text-[1.08rem] font-semibold text-ladrillo shrink-0">${it.price}</span>
        </div>
        <p className="mt-0.5 text-[0.88rem] text-ink-soft leading-snug line-clamp-2">{pick(it.desc, lang)}</p>
        {it.tags && it.tags.length > 0 && (
          <div className="mt-1.5 flex gap-1.5 flex-wrap">
            {it.tags.map((t, i) => (
              <Tag key={i} t={t} lang={lang} />
            ))}
          </div>
        )}
      </div>

      {lightbox && <PhotoLightbox src={photoSrc} name={it.name} onClose={close} />}
    </article>
  );
}

function Tag({ t, lang }: { t: T; lang: Lang }) {
  const label = pick(t, lang);
  const en = t.en;
  const tone =
    en === 'Vegetarian'
      ? { bg: 'rgba(111,138,60,0.14)', fg: 'var(--color-limon)' }
      : en === 'Spicy'
        ? { bg: 'rgba(230,163,44,0.18)', fg: '#b07d12' }
        : { bg: 'var(--color-ladrillo-tint)', fg: 'var(--color-ladrillo)' };
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[0.66rem] font-bold uppercase tracking-wider"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {label}
    </span>
  );
}
