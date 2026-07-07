import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Lang } from '../../lib/lang';
import { pick } from '../../lib/lang';
import { NAV, UI, INFO } from '../../data/content';
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

  useEffect(() => {
    let cancelled = false;
    fetchAccount().then((acc) => {
      if (cancelled || !acc?.customer) return;
      const first = acc.customer.name?.split(' ')[0] || acc.customer.email.split('@')[0];
      setSignedInName(first);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  const solid = scrolled || open;

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
        style={{
          background: solid
            ? 'rgba(12,18,32,0.96)'
            : 'linear-gradient(180deg, rgba(12,18,32,0.72) 0%, rgba(12,18,32,0.30) 55%, rgba(12,18,32,0) 100%)',
          backdropFilter: solid ? 'saturate(140%) blur(10px)' : undefined,
          WebkitBackdropFilter: solid ? 'saturate(140%) blur(10px)' : undefined,
          boxShadow: scrolled ? '0 10px 34px -18px rgba(0,0,0,0.75)' : 'none',
        }}
      >
        {announcement}
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 flex items-center justify-between h-[78px]">
          {/* Wordmark — solid initials badge + name, always light so it reads over the hero */}
          <a href={href('home')} className="flex items-center gap-2.5 group" aria-label={`${INFO.name} — home`}>
            <span className="grid place-items-center h-11 w-11 rounded-2xl bg-ladrillo text-cream font-stamp text-[1.15rem] leading-none shadow-lg transition-transform duration-300 group-hover:-rotate-6">
              {INFO.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden sm:flex flex-col leading-[0.92]">
              <span className="font-stamp text-[1.5rem] text-white tracking-wide">{INFO.name}</span>
              <span className="text-[0.6rem] tracking-[0.26em] uppercase text-white/55 mt-1">
                {lang === 'en' ? 'Neighborhood Kitchen' : 'Cocina del Barrio'}
              </span>
            </span>
          </a>

          {/* Desktop links — pill highlight on the active page */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((n) => {
              const active = current === n.id;
              return (
                <a
                  key={n.id}
                  href={href(n.href)}
                  className="rounded-full px-4 py-2 text-[0.9rem] font-semibold tracking-wide transition-all duration-200 hover:bg-white/10"
                  style={{
                    color: active ? '#ffffff' : 'rgba(255,255,255,0.72)',
                    background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
                  }}
                >
                  {pick(n.label, lang)}
                </a>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <LangToggle lang={lang} setLang={setLang} />
            <a
              href={href('account')}
              className="hidden md:inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.85rem] font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors"
              title={signedInName ? (lang === 'en' ? 'Your account' : 'Tu cuenta') : (lang === 'en' ? 'Sign in' : 'Iniciar sesión')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="hidden lg:inline">
                {signedInName ? signedInName : (lang === 'en' ? 'Sign in' : 'Entrar')}
              </span>
            </a>
            <a
              href={href('order')}
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-ladrillo px-5 py-2.5 text-cream text-[0.85rem] font-bold tracking-wide shadow-lg transition-all duration-300 hover:bg-ladrillo-deep hover:-translate-y-0.5"
            >
              {pick(UI.orderNow, lang)}
              <span aria-hidden>&rarr;</span>
            </a>
            <button
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden flex flex-col gap-[5px] p-2 -mr-2"
              aria-label="Menu"
            >
              <span className="block h-[2px] w-6 bg-white transition-transform duration-300" style={{ transform: open ? 'translateY(7px) rotate(45deg)' : 'none' }} />
              <span className="block h-[2px] w-6 bg-white transition-opacity duration-200" style={{ opacity: open ? 0 : 1 }} />
              <span className="block h-[2px] w-6 bg-white transition-transform duration-300" style={{ transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay — dark */}
      <AnimatePresence>
        {open && (
          <motion.div
            className={`fixed inset-0 z-40 lg:hidden px-6 ${announcement ? 'pt-[128px]' : 'pt-[96px]'}`}
            style={{ background: 'rgba(12,18,32,0.98)' }}
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
                  className="font-display text-[2.6rem] font-bold py-3 border-b border-white/10"
                  style={{ color: current === n.id ? 'var(--color-ladrillo)' : '#ffffff' }}
                >
                  {pick(n.label, lang)}
                </motion.a>
              ))}
            </nav>
            <a
              href={href('order')}
              onClick={() => setOpen(false)}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ladrillo px-6 py-4 text-cream font-bold"
            >
              {pick(UI.orderNow, lang)} <span aria-hidden>&rarr;</span>
            </a>
            <p className="mt-8 text-[0.8rem] tracking-wide text-white/60">{INFO.address.street}, {INFO.address.city}</p>
            <a href={`tel:${INFO.phones[0]}`} className="block text-[0.8rem] tracking-wide text-white/60">{INFO.phones[0]}</a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const LANG_OPTIONS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'es', label: 'ES' },
];

/** Segmented EN/ES switch — a sliding pill on a translucent track. */
function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="relative flex items-center rounded-full p-1" style={{ background: 'rgba(255,255,255,0.12)' }}>
      <motion.span
        aria-hidden
        className="absolute top-1 bottom-1 rounded-full bg-ladrillo shadow"
        style={{ width: 'calc(50% - 4px)', left: 4 }}
        animate={{ x: lang === 'en' ? 0 : '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      />
      {LANG_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => setLang(opt.id)}
          className="relative z-10 rounded-full px-3.5 py-1.5 text-[0.72rem] font-extrabold tracking-widest transition-colors duration-200"
          style={{ color: lang === opt.id ? '#ffffff' : 'rgba(255,255,255,0.6)' }}
          aria-pressed={lang === opt.id}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
