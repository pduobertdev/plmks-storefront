import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useLang, pick } from '../../lib/lang';
import { INFO, HOME, SIGNATURES, MENU, REVIEWS, UI } from '../../data/content';
import { asset, food, itemForDish, section } from '../../lib/assets';
import { fetchDisplayMenu } from '../../lib/orderApi';
import { SiteNav } from './SiteNav';
import { SiteFooter } from './SiteFooter';
import { Cenefa, Chakana } from '../Cenefa';
import { LineReveal, FadeUp, ImageReveal, Parallax, EASE } from '../motion';

const BASE = import.meta.env.BASE_URL;
const href = (s: string) => `${BASE}${s}`;

export default function Home() {
  const [lang, setLang] = useLang();

  return (
    <div>
      <SiteNav lang={lang} setLang={setLang} current="home" />
      <main>
        <Hero lang={lang} />
        <Signatures lang={lang} />
        <Story lang={lang} />
        <Carta lang={lang} />
        <Reviews lang={lang} />
        <FinalCTA lang={lang} />
      </main>
      <SiteFooter lang={lang} />
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────── */
function Hero({ lang }: { lang: 'en' | 'es' }) {
  const lines = lang === 'en' ? HOME.heroLine : HOME.heroLineEs;
  return (
    <section className="relative min-h-screen flex items-center pt-[110px] pb-20">
      <div className="mx-auto max-w-[1320px] w-full px-5 sm:px-8 grid lg:grid-cols-12 gap-10 lg:gap-6 items-center">
        {/* Words */}
        <div className="lg:col-span-6 relative z-10">
          <motion.p
            className="kicker text-ladrillo flex items-center gap-3"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
          >
            <Chakana size={13} />
            {pick(HOME.heroKicker, lang)}
          </motion.p>

          <LineReveal
            as="h1"
            lines={lines}
            delay={0.3}
            className="display display-tight mt-5 text-[clamp(3.4rem,9vw,7.2rem)] font-semibold text-ink"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}
          >
            <p className="mt-7 max-w-[30rem] text-[1.08rem] text-ink-soft">
              {pick(HOME.heroBody, lang)}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href={href('order')}
                className="group inline-flex items-center gap-2.5 rounded-full bg-ladrillo px-7 py-4 text-cream font-semibold tracking-wide transition-all duration-300 hover:bg-ladrillo-deep hover:-translate-y-0.5"
              >
                {pick(UI.orderNow, lang)}
                <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>→</span>
              </a>
              <a
                href={href('menu')}
                className="font-display text-[1.05rem] font-medium text-ink uline"
              >
                {pick(UI.viewMenu, lang)}
              </a>
            </div>
          </motion.div>
        </div>

        {/* Dish */}
        <div className="lg:col-span-6 relative">
          <Parallax distance={42}>
            <div className="relative">
              <ImageReveal
                src={food('dish-1')}
                alt="House special"
                delay={0.15}
                className="aspect-[4/5] sm:aspect-[5/5] lg:aspect-[4/5] rounded-[2rem] lg:rounded-[2.5rem] shadow-[0_40px_80px_-30px_rgba(30,41,59,0.5)]"
              />
              {/* steam */}
              <div className="absolute left-1/2 top-3 -translate-x-1/2 pointer-events-none" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="absolute block rounded-full"
                    style={{
                      width: 26, height: 26, left: i * 34 - 34,
                      background: 'radial-gradient(circle, rgba(255,255,255,0.85), rgba(255,255,255,0))',
                      filter: 'blur(7px)',
                      animation: `steam 4.2s ${i * 1.1}s ease-out infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </Parallax>

          {/* seal */}
          <motion.img
            src={asset('seal.jpg')}
            alt="Family owned & operated"
            className="absolute -bottom-7 -left-3 sm:left-2 h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-cream shadow-xl"
            initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 1.0 }}
          />
        </div>
      </div>

      {/* scroll cue */}
      <motion.div
        className="absolute bottom-7 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.3 }}
      >
        <span className="kicker text-ink-faint text-[0.6rem]">{lang === 'en' ? 'Scroll' : 'Desliza'}</span>
        <motion.span
          className="block h-9 w-px bg-ink-faint"
          animate={{ scaleY: [0.3, 1, 0.3], originY: 0 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </section>
  );
}

/* ── 01 · Signatures ──────────────────────────────────────────── */
function Signatures({ lang }: { lang: 'en' | 'es' }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Each dot maps to a proportional position across the full scroll range —
  // so all 7 dots are reachable, even when several cards are visible at once.
  const idxToScrollLeft = (idx: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const max = track.scrollWidth - track.clientWidth;
    if (max <= 0) return 0;
    return Math.round((max * idx) / (SIGNATURES.length - 1));
  };

  const scrollLeftToIdx = (left: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const max = track.scrollWidth - track.clientWidth;
    if (max <= 0) return 0;
    return Math.round((left / max) * (SIGNATURES.length - 1));
  };

  // Sync active dot to scroll position whenever the user scrolls.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setActive(Math.max(0, Math.min(SIGNATURES.length - 1, scrollLeftToIdx(track.scrollLeft))));
      });
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      track.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToIdx = (idx: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: idxToScrollLeft(idx), behavior: 'smooth' });
  };
  const next = () => scrollToIdx(Math.min(active + 1, SIGNATURES.length - 1));
  const prev = () => scrollToIdx(Math.max(active - 1, 0));

  return (
    <section className="py-20 sm:py-28 bg-cream-deep relative">
      <div className="text-line">
        <Cenefa weight={1.6} />
      </div>
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 mt-14 sm:mt-20">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <SectionTag label={pick(HOME.signaturesKicker, lang)} />
            <LineReveal
              as="h2"
              lines={splitTwo(pick(HOME.signaturesTitle, lang))}
              className="display mt-4 text-[clamp(2.2rem,5vw,3.8rem)] font-semibold text-ink"
            />
          </div>

          <div className="flex items-center gap-5">
            {/* Desktop arrow controls */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={prev}
                disabled={active === 0}
                aria-label={lang === 'en' ? 'Previous dish' : 'Plato anterior'}
                className="h-11 w-11 rounded-full border border-line bg-cream text-ink flex items-center justify-center transition-all duration-200 hover:bg-ladrillo hover:text-cream hover:border-ladrillo disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-cream disabled:hover:text-ink disabled:hover:border-line"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={next}
                disabled={active === SIGNATURES.length - 1}
                aria-label={lang === 'en' ? 'Next dish' : 'Siguiente plato'}
                className="h-11 w-11 rounded-full border border-line bg-cream text-ink flex items-center justify-center transition-all duration-200 hover:bg-ladrillo hover:text-cream hover:border-ladrillo disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-cream disabled:hover:text-ink disabled:hover:border-line"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            <a href={href('menu')} className="hidden sm:block font-display text-[1rem] font-medium uline">
              {pick(UI.viewMenu, lang)} →
            </a>
          </div>
        </div>
      </div>

      {/* Carousel — single set, controlled by arrows + dots, also finger-scrollable */}
      <div
        ref={trackRef}
        className="mt-12 sm:mt-16 overflow-x-auto overflow-y-hidden"
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="flex gap-5 sm:gap-7 px-5 sm:px-8 pb-2">
          {SIGNATURES.map((s, i) => (
            <article
              key={i}
              data-sig-card
              data-idx={i}
              className="w-[240px] sm:w-[320px] shrink-0 group"
            >
              <div className="overflow-hidden rounded-[1.6rem] aspect-[4/5]">
                <img
                  src={food(s.photo)}
                  alt={s.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                />
              </div>
              <h3 className="font-display italic text-[1.25rem] sm:text-[1.4rem] font-medium text-ink mt-3 sm:mt-4 leading-tight">
                {s.name}
              </h3>
              <p className="text-[0.88rem] sm:text-[0.92rem] text-ink-mute mt-0.5 sm:mt-1">{pick(s.note, lang)}</p>
            </article>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 mt-8 sm:mt-10 flex justify-center sm:justify-start gap-2">
        {SIGNATURES.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToIdx(i)}
            aria-label={lang === 'en' ? `Show ${s.name}` : `Ver ${s.name}`}
            aria-current={i === active ? 'true' : undefined}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === active ? 26 : 8,
              height: 8,
              background: i === active ? 'var(--color-ladrillo)' : 'var(--color-line)',
            }}
          />
        ))}
      </div>
    </section>
  );
}

/* ── 02 · Story ───────────────────────────────────────────────── */
function Story({ lang }: { lang: 'en' | 'es' }) {
  return (
    <section className="py-24 sm:py-36">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <div className="lg:col-span-6 order-2 lg:order-1">
          <SectionTag label={pick(HOME.storyKicker, lang)} />
          <LineReveal
            as="h2"
            lines={splitTwo(pick(HOME.storyTitle, lang))}
            className="display mt-4 text-[clamp(2.2rem,5vw,3.9rem)] font-semibold text-ink"
          />
          <FadeUp delay={0.1}>
            <p className="mt-7 text-[1.1rem] text-ink-soft max-w-[34rem]">
              {pick(HOME.storyBody, lang)}
            </p>
            <div className="mt-8 flex items-center gap-5">
              <span className="display text-[3.4rem] font-semibold text-ladrillo leading-none numeral">
                100%
              </span>
              <span className="text-[0.95rem] text-ink-mute max-w-[12rem]">
                {lang === 'en'
                  ? 'made from scratch, in one family kitchen.'
                  : 'hecho desde cero, en una cocina familiar.'}
              </span>
            </div>
            <a href={href('about')} className="mt-8 inline-block font-display text-[1.05rem] font-medium uline">
              {lang === 'en' ? 'Read our story' : 'Lee nuestra historia'} →
            </a>
          </FadeUp>
        </div>

        <div className="lg:col-span-6 order-1 lg:order-2">
          <Parallax distance={50}>
            <ImageReveal
              src={food('table-spread')}
              alt="A spread of neighborhood dishes"
              className="aspect-[5/4] rounded-[2rem] shadow-[0_40px_80px_-36px_rgba(30,41,59,0.5)]"
            />
          </Parallax>
        </div>
      </div>
    </section>
  );
}

/* ── 03 · Carta preview ───────────────────────────────────────── */
function Carta({ lang }: { lang: 'en' | 'es' }) {
  const featured = ['featured', 'popular', 'extras'];
  const cats = featured
    .map((id) => MENU.find((c) => c.id === id)!)
    .filter(Boolean);

  // Real per-category dish counts from the admin menu (falls back to static).
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [liveIds, setLiveIds] = useState<Record<string, string>>({});
  useEffect(() => {
    fetchDisplayMenu()
      .then((data) => {
        if (!data) return;
        const byName: Record<string, { count: number; id: string }> = {};
        data.forEach((c) => { byName[c.name.en] = { count: c.items.length, id: c.id }; });
        const nc: Record<string, number> = {};
        const ni: Record<string, string> = {};
        cats.forEach((c) => { const m = byName[c.name.en]; if (m) { nc[c.id] = m.count; ni[c.id] = m.id; } });
        setLiveCounts(nc);
        setLiveIds(ni);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="py-20 sm:py-28 bg-ink text-cream relative">
      <div className="text-oxblood-soft">
        <Cenefa weight={2} />
      </div>
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 mt-14 sm:mt-20">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <SectionTag label={lang === 'en' ? 'The Menu' : 'La Carta'} dark />
            <h2 className="display mt-4 text-[clamp(2.2rem,5vw,3.9rem)] font-semibold">
              {lang === 'en' ? 'So many ways to eat well' : 'Muchas maneras de comer bien'}
            </h2>
          </div>
          <p className="max-w-xs text-cream/60 text-[0.96rem]">
            {lang === 'en'
              ? 'Everything made fresh — all on one menu.'
              : 'Todo hecho al momento — en una sola carta.'}
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cats.map((c, i) => (
            <FadeUp key={c.id} delay={i * 0.06}>
              <a
                href={liveIds[c.id] ? `${href('order')}#order-${liveIds[c.id]}` : href('order')}
                className="group block overflow-hidden rounded-[1.5rem] relative aspect-[3/2.4]"
              >
                <img
                  src={section(c.photo)}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                />
                <span
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(30,41,59,0.92) 8%, rgba(30,41,59,0.15) 60%)' }}
                />
                <div className="absolute inset-0 p-5 flex flex-col justify-end">
                  <h3 className="font-display text-[1.55rem] font-semibold leading-tight">
                    {pick(c.name, lang)}
                  </h3>
                  <span className="text-[0.86rem] text-cream/70 flex items-center gap-2 mt-1">
                    {liveCounts[c.id] ?? c.items.length} {lang === 'en' ? 'dishes' : 'platos'}
                    <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" aria-hidden>→</span>
                  </span>
                </div>
              </a>
            </FadeUp>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <a
            href={href('menu')}
            className="group inline-flex items-center gap-3 rounded-full border border-cream/30 px-7 py-4 font-semibold tracking-wide transition-colors duration-300 hover:bg-aji hover:text-ink hover:border-aji"
          >
            {lang === 'en' ? 'See the full menu' : 'Ver la carta completa'}
            <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── 04 · Reviews ─────────────────────────────────────────────── */
function Reviews({ lang }: { lang: 'en' | 'es' }) {
  const tilts = ['-2.4deg', '1.8deg', '-1.4deg', '2.6deg'];
  return (
    <section className="py-24 sm:py-32 bg-cream-deep">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="text-center">
          <SectionTag label={lang === 'en' ? 'Guest Reviews' : 'Reseñas'} center />
          <h2 className="display mt-4 text-[clamp(2.2rem,5vw,3.9rem)] font-semibold text-ink">
            {lang === 'en' ? 'Loved across the Valley' : 'Querido en todo el Valle'}
          </h2>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-aji">
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} />)}
            <span className="ml-2 text-ink-mute text-[0.9rem]">
              {lang === 'en' ? 'a neighborhood of regulars' : 'un vecindario de clientes fieles'}
            </span>
          </div>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {REVIEWS.map((r, i) => (
            <FadeUp key={r.name} delay={i * 0.07}>
              <figure
                className="h-full rounded-[1.4rem] bg-cream-card border border-line p-6 flex flex-col"
                style={{ transform: `rotate(${tilts[i % tilts.length]})` }}
              >
                <div className="flex gap-1 text-aji mb-3">
                  {[0, 1, 2, 3, 4].map((s) => <Star key={s} size={13} />)}
                </div>
                <blockquote className="font-display italic text-[1.12rem] text-ink leading-snug flex-1">
                  “{pick(r.quote, lang)}”
                </blockquote>
                <figcaption className="mt-5 pt-4 border-t border-line flex items-center justify-between">
                  <span className="font-semibold text-[0.92rem] text-ink">{r.name}</span>
                  <span className="kicker text-[0.6rem] text-ink-faint">{r.source}</span>
                </figcaption>
              </figure>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ────────────────────────────────────────────────── */
function FinalCTA({ lang }: { lang: 'en' | 'es' }) {
  return (
    <section className="relative">
      <div className="absolute inset-0">
        <img src={food('dish-2')} alt="" className="h-full w-full object-cover" loading="lazy" />
        <span className="absolute inset-0" style={{ background: 'rgba(30,58,138,0.88)' }} />
      </div>
      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8 py-28 sm:py-40 text-center text-cream">
        <FadeUp>
          <p className="kicker text-aji">{pick(INFO.tagline, lang)}</p>
          <h2 className="display mt-4 text-[clamp(2.6rem,7vw,5.6rem)] font-semibold leading-[0.98]">
            {lang === 'en' ? 'Hungry yet?' : '¿Ya con hambre?'}
          </h2>
          <p className="mt-5 max-w-xl mx-auto text-cream/75 text-[1.08rem]">
            {lang === 'en'
              ? 'Order pickup online and your plate is usually ready in about 30 minutes.'
              : 'Pide para llevar en línea y tu plato suele estar listo en unos 30 minutos.'}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href={href('order')}
              className="group inline-flex items-center gap-2.5 rounded-full bg-ladrillo px-8 py-4 text-cream font-semibold tracking-wide transition-all duration-300 hover:bg-aji hover:text-ink hover:-translate-y-0.5"
            >
              {pick(UI.orderNow, lang)}
              <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>→</span>
            </a>
            <a
              href={`tel:${INFO.phones[0].replace(/[^0-9]/g, '')}`}
              className="inline-flex items-center gap-2 rounded-full border border-cream/35 px-7 py-4 font-semibold transition-colors duration-300 hover:bg-cream/10"
            >
              {pick(UI.callUs, lang)} · {INFO.phones[0]}
            </a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

/* ── bits ─────────────────────────────────────────────────────── */
function SectionTag({ label, dark, center }: { label: string; dark?: boolean; center?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${center ? 'justify-center' : ''}`}>
      <span className="h-px w-8" style={{ background: 'var(--color-line)' }} />
      <span className={`kicker text-[0.68rem] ${dark ? 'text-cream/55' : 'text-ink-mute'}`}>{label}</span>
    </div>
  );
}

function Star({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.95 6.3 6.55.78-4.85 4.5 1.28 6.62L12 17.6 6.07 20.8l1.28-6.62L2.5 9.08l6.55-.78z" />
    </svg>
  );
}

/* Split a short title into two balanced lines for LineReveal. */
function splitTwo(s: string): string[] {
  const w = s.split(' ');
  if (w.length < 3) return [s];
  const mid = Math.ceil(w.length / 2);
  return [w.slice(0, mid).join(' '), w.slice(mid).join(' ')];
}
