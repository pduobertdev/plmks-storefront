import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Lang } from '../../lib/lang';
import { pick } from '../../lib/lang';
import { NAV, UI, INFO } from '../../data/content';
import { asset } from '../../lib/assets';
import { Cenefa } from '../Cenefa';
import { EASE } from '../motion';
import { fetchAccount } from '../../lib/customerAuth';

const BASE = import.meta.env.BASE_URL;
const href = (slug: string) => `${BASE}${slug}`;

export function SiteNav({
  lang,
  setLang,
  current,
  announcement,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  current: string;
  announcement?: ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [signedInName, setSignedInName] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Silently check if the visitor is signed in — show their first name
  // in place of "Sign in" when they are. Failures = anonymous, no UI.
  useEffect(() => {
    let cancelled = false;
    fetchAccount().then((acc) => {
      if (cancelled || !acc?.customer) return;
      const first = acc.customer.name?.split(' ')[0]
        || acc.customer.email.split('@')[0];
      setSignedInName(first);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-50 transition-colors duration-500"
        style={{
          backgroundColor: scrolled || open ? 'rgb(250,250,250)' : 'transparent',
        }}
      >
        {announcement}
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 flex items-center justify-between h-[74px]">
          {/* Mark — seal + Bebas Neue wordmark matching the typography
              inside the seal itself. */}
          <a href={href('home')} className="flex items-center gap-3 group" aria-label="Sample Bistro — home">
            <img
              src={asset('logo-red.png')}
              alt=""
              className="h-14 w-14 sm:h-[60px] sm:w-[60px] transition-transform duration-500 group-hover:rotate-[6deg]"
            />
            <span className="hidden sm:flex flex-col leading-[0.85]">
              <span className="font-stamp text-[1.65rem] sm:text-[1.85rem] text-ink">Sample Bistro</span>
              <span className="font-stamp text-[0.66rem] tracking-[0.22em] text-ladrillo mt-1">Neighborhood Kitchen</span>
            </span>
          </a>

          {/* Desktop links */}
          <nav className="hidden lg:flex items-center gap-9">
            {NAV.map((n) => {
              const active = current === n.id;
              return (
                <a
                  key={n.id}
                  href={href(n.href)}
                  className="relative font-sans text-[0.92rem] font-medium tracking-wide py-1"
                  style={{ color: active ? 'var(--color-ladrillo)' : 'var(--color-ink)' }}
                >
                  {pick(n.label, lang)}
                  {active && (
                    <span className="absolute -bottom-1 left-0 right-0 text-ladrillo">
                      <Cenefa weight={2.4} />
                    </span>
                  )}
                </a>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-3 sm:gap-4">
            <LangToggle lang={lang} setLang={setLang} />
            <a
              href={href('account')}
              className="hidden md:inline-flex items-center gap-1.5 text-[0.85rem] font-medium text-ink hover:text-ladrillo transition-colors"
              title={signedInName
                ? (lang === 'en' ? 'Your account' : 'Tu cuenta')
                : (lang === 'en' ? 'Sign in' : 'Iniciar sesión')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={signedInName ? 'var(--color-ladrillo)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span className="hidden lg:inline" style={signedInName ? { color: 'var(--color-ladrillo)' } : undefined}>
                {signedInName
                  ? signedInName
                  : (lang === 'en' ? 'Sign in' : 'Entrar')}
              </span>
            </a>
            <a
              href={href('order')}
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-ladrillo px-5 py-2.5 text-cream text-[0.85rem] font-semibold tracking-wide transition-all duration-300 hover:bg-ladrillo-deep hover:-translate-y-0.5"
            >
              {pick(UI.orderNow, lang)}
              <span aria-hidden>→</span>
            </a>
            <button
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden flex flex-col gap-[5px] p-2 -mr-2"
              aria-label="Menu"
            >
              <span
                className="block h-[2px] w-6 bg-ink transition-transform duration-300"
                style={{ transform: open ? 'translateY(7px) rotate(45deg)' : 'none' }}
              />
              <span
                className="block h-[2px] w-6 bg-ink transition-opacity duration-200"
                style={{ opacity: open ? 0 : 1 }}
              />
              <span
                className="block h-[2px] w-6 bg-ink transition-transform duration-300"
                style={{ transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none' }}
              />
            </button>
          </div>
        </div>
        <div className="text-line/70" style={{ color: 'var(--color-line)' }}>
          {(scrolled || open) && <Cenefa weight={1.5} />}
        </div>
      </header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            className={`fixed inset-0 z-40 lg:hidden bg-cream px-6 ${announcement ? 'pt-[128px]' : 'pt-[88px]'}`}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <nav className="flex flex-col">
              {NAV.map((n, i) => (
                <motion.a
                  key={n.id}
                  href={href(n.href)}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.06 * i }}
                  className="font-display text-[2.6rem] font-semibold py-3 border-b"
                  style={{
                    borderColor: 'var(--color-line)',
                    color: current === n.id ? 'var(--color-ladrillo)' : 'var(--color-ink)',
                  }}
                >
                  {pick(n.label, lang)}
                </motion.a>
              ))}
            </nav>
            <a
              href={href('order')}
              onClick={() => setOpen(false)}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ladrillo px-6 py-4 text-cream font-semibold"
            >
              {pick(UI.orderNow, lang)} <span aria-hidden>→</span>
            </a>
            <p className="mt-8 kicker text-ink-mute">{INFO.address.street}</p>
            <p className="kicker text-ink-mute">{INFO.phones[0]}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const LANG_OPTIONS: { id: Lang; flag: string; label: string }[] = [
  { id: 'en', flag: '🇺🇸', label: 'EN' },
  { id: 'es', flag: '🇵🇪', label: 'ES' },
];

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div
      className="flex items-center rounded-full border p-0.5"
      style={{ borderColor: 'var(--color-line)' }}
    >
      {LANG_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => setLang(opt.id)}
          className="rounded-full px-2.5 py-1 text-[0.72rem] font-bold tracking-widest transition-colors duration-300 flex items-center gap-1"
          style={{
            backgroundColor: lang === opt.id ? 'var(--color-ink)' : 'transparent',
            color: lang === opt.id ? 'var(--color-cream)' : 'var(--color-ink-mute)',
          }}
          aria-pressed={lang === opt.id}
        >
          <span aria-hidden>{opt.flag}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
