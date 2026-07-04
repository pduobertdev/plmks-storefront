import type { Lang } from '../../lib/lang';
import { pick } from '../../lib/lang';
import { useState, useEffect } from 'react';
import { fetchStoreHours, weekRows } from '../../lib/orderApi';
import { INFO, HOURS, NAV, UI } from '../../data/content';
import { asset } from '../../lib/assets';
import { Cenefa } from '../Cenefa';

const BASE = import.meta.env.BASE_URL;
const href = (slug: string) => `${BASE}${slug}`;

const ICONS: Record<string, string> = {
  instagram:
    'M12 2.2c3.2 0 3.6 0 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.25.07 1.62.07 4.81s-.01 3.56-.07 4.81c-.15 3.23-1.66 4.77-4.92 4.92-1.25.06-1.62.07-4.85.07s-3.6-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.06 15.56 2.05 15.19 2.05 12s.01-3.56.07-4.81C2.27 3.96 3.79 2.42 7.05 2.27 8.4 2.21 8.77 2.2 12 2.2Zm0 4.86A4.94 4.94 0 1 0 16.94 12 4.94 4.94 0 0 0 12 7.06Zm0 8.14A3.2 3.2 0 1 1 15.2 12 3.2 3.2 0 0 1 12 15.2Zm5.13-8.34a1.15 1.15 0 1 0 1.15 1.15 1.15 1.15 0 0 0-1.15-1.15Z',
  facebook:
    'M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z',
  whatsapp:
    'M12.04 2C6.6 2 2.2 6.4 2.2 11.84a9.78 9.78 0 0 0 1.34 4.94L2 22l5.36-1.4a9.86 9.86 0 0 0 4.68 1.19h.01c5.43 0 9.84-4.4 9.84-9.84S17.47 2 12.04 2Zm5.78 14.06c-.24.68-1.4 1.3-1.93 1.34-.5.05-1.13.24-3.69-.77-3.1-1.22-5.07-4.4-5.22-4.6-.15-.2-1.25-1.66-1.25-3.17s.79-2.25 1.07-2.56c.28-.31.61-.39.82-.39l.59.01c.19 0 .44-.07.69.53.24.6.84 2.07.91 2.22.07.15.12.33.02.53-.1.2-.15.32-.3.5-.15.18-.32.4-.45.53-.15.15-.31.32-.13.62.18.3.8 1.32 1.72 2.14 1.18 1.05 2.18 1.38 2.48 1.53.3.15.48.13.66-.08.18-.2.76-.89.96-1.2.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.15.5.22.57.34.07.13.07.73-.17 1.41Z',
};

export function SiteFooter({ lang }: { lang: Lang }) {
  const social = [
    { k: 'instagram', url: INFO.social.instagram },
    { k: 'facebook', url: INFO.social.facebook },
    { k: 'whatsapp', url: INFO.social.whatsapp },
  ];

  const [storeHours, setStoreHours] = useState<Awaited<ReturnType<typeof fetchStoreHours>>>(null);
  useEffect(() => { fetchStoreHours().then(setStoreHours); }, []);
  const hourRows = storeHours
    ? weekRows(storeHours.week, lang)
    : HOURS.map((h) => ({ dow: -1, day: pick(h.day, lang), time: h.time }));

  return (
    <footer style={{ backgroundColor: 'var(--color-oxblood)', color: 'var(--color-cream)' }}>
      <div className="text-aji">
        <Cenefa weight={2.4} />
      </div>

      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 pt-16 sm:pt-24 pb-10">
        {/* Big sign-off */}
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-12 lg:gap-20">
          <div>
            <p className="kicker text-aji mb-5">{pick(INFO.tagline, lang)}</p>
            <div className="flex items-center gap-5">
              <h2 className="display text-[clamp(2.6rem,6vw,5rem)] font-semibold leading-none">
                Sample Bistro
              </h2>
              <img
                src={asset('seal.jpg')}
                alt="Sample Bistro — Family Owned Since 2006"
                className="h-20 sm:h-24 w-auto flex-shrink-0 invert mix-blend-screen opacity-85"
              />
            </div>
            <div className="mt-7 flex gap-3">
              {social.map((s) => (
                <a
                  key={s.k}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.k}
                  className="grid place-items-center h-11 w-11 rounded-full border border-cream/25 transition-colors duration-300 hover:bg-aji hover:text-oxblood hover:border-aji"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d={ICONS[s.k]} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-10">
            {/* Hours */}
            <div>
              <p className="kicker text-aji mb-4">{lang === 'en' ? 'Hours' : 'Horario'}</p>
              <ul className="space-y-1.5 text-[0.92rem]">
                {hourRows.map((h) => (
                  <li key={h.day} className="flex justify-between gap-4 text-cream/75">
                    <span>{h.day}</span>
                    <span className="numeral text-cream/90">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Visit + nav */}
            <div>
              <p className="kicker text-aji mb-4">{lang === 'en' ? 'Find Us' : 'Encuéntranos'}</p>
              <address className="not-italic text-[0.95rem] text-cream/80 leading-relaxed">
                {INFO.address.street}
                <br />
                {INFO.address.city}
                <br />
                <a href={`tel:${INFO.phones[0].replace(/[^0-9]/g, '')}`} className="uline">
                  {INFO.phones[0]}
                </a>
              </address>
              <nav className="mt-5 flex flex-col gap-1.5">
                {NAV.map((n) => (
                  <a key={n.id} href={href(n.href)} className="text-[0.9rem] text-cream/70 hover:text-aji transition-colors w-fit">
                    {pick(n.label, lang)}
                  </a>
                ))}
                <a href={href('order')} className="text-[0.9rem] text-aji font-semibold hover:text-aji-soft transition-colors w-fit">
                  {pick(UI.orderNow, lang)} →
                </a>
              </nav>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-6 flex flex-col sm:flex-row gap-3 justify-between text-[0.76rem] text-cream/45 border-t border-cream/15">
          <span>© {new Date().getFullYear()} Sample Bistro · Cocina Casera</span>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 items-center">
            <a href={href('privacy')} className="hover:text-cream/70 transition-colors">
              {lang === 'en' ? 'Privacy' : 'Privacidad'}
            </a>
            <a href={href('terms')} className="hover:text-cream/70 transition-colors">
              {lang === 'en' ? 'Terms' : 'Términos'}
            </a>
            <a href={href('refunds')} className="hover:text-cream/70 transition-colors">
              {lang === 'en' ? 'Refunds' : 'Reembolsos'}
            </a>
            <a
              href="https://example.com/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cream/70 transition-colors"
            >
              {lang === 'en' ? 'Staff login' : 'Acceso personal'}
            </a>
            <span>
              {lang === 'en' ? 'Site by ' : 'Sitio por '}
              <span className="text-cream/70">PLMKS Studio</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
