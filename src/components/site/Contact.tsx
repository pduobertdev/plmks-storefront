import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Lang } from '../../lib/lang';
import { useLang, pick } from '../../lib/lang';
import { INFO, HOURS, CONTACT, UI } from '../../data/content';
import { fetchStoreHours, weekRows, hoursLabel, holidayDateLabel, fetchPrepBuffer } from '../../lib/orderApi';
import { SiteNav } from './SiteNav';
import { SiteFooter } from './SiteFooter';
import { Cenefa, Chakana } from '../Cenefa';
import { LineReveal, FadeUp, EASE } from '../motion';
import { PageHero } from './PageHero';
import { asset } from '../../lib/assets';

const BASE = import.meta.env.BASE_URL;
const MAP = 'https://www.google.com/maps?q=123+Main+Street+Anytown+CA&output=embed';

export default function Contact() {
  const [lang, setLang] = useLang();
  const title = lang === 'en' ? CONTACT.title : CONTACT.titleEs;
  const [storeHours, setStoreHours] = useState<Awaited<ReturnType<typeof fetchStoreHours>>>(null);
  useEffect(() => { fetchStoreHours().then(setStoreHours); }, []);
  const hourRows = storeHours
    ? weekRows(storeHours.week, lang)
    : HOURS.map((h, i) => ({ dow: (i + 1) % 7, day: pick(h.day, lang), time: h.time }));
  const curDow = storeHours?.dow ?? new Date().getDay();
  const holidays = storeHours?.holidays ?? [];
  const [prepBuffer, setPrepBuffer] = useState(0);
  useEffect(() => { fetchPrepBuffer().then(setPrepBuffer); }, []);

  return (
    <div>
      <SiteNav lang={lang} setLang={setLang} current="contact" />
      <main>
        <PageHero
          image={asset('hero-contact.jpg')}
          kicker={pick(CONTACT.kicker, lang)}
          lines={title}
        />

        {/* info + map */}
        <section className="mx-auto max-w-[1320px] px-5 sm:px-8 mt-16 sm:mt-24 grid lg:grid-cols-[1fr_1.15fr] gap-8 lg:gap-12">
          <FadeUp className="rounded-[1.8rem] bg-ink text-cream overflow-hidden flex flex-col">
            <div className="text-aji"><Cenefa weight={2.4} /></div>
            <div className="p-7 sm:p-9 flex-1 flex flex-col">
              <h2 className="font-display text-[1.8rem] font-semibold">
                {lang === 'en' ? 'Sample Bistro' : 'Sample Bistro'}
              </h2>
              <address className="not-italic mt-1 text-cream/75">
                {INFO.address.street}<br />{INFO.address.city}
              </address>

              <div className="mt-6">
                <p className="kicker text-aji text-[0.62rem] mb-2">{lang === 'en' ? 'Call' : 'Llama'}</p>
                {INFO.phones.map((p) => (
                  <a key={p} href={`tel:${p.replace(/[^0-9]/g, '')}`}
                     className="block numeral text-[1.25rem] font-semibold hover:text-aji transition-colors">
                    {p}
                  </a>
                ))}
              </div>

              <div className="mt-6">
                <p className="kicker text-aji text-[0.62rem] mb-2">{lang === 'en' ? 'Hours' : 'Horario'}</p>
                <ul className="space-y-1 text-[0.92rem]">
                  {hourRows.map((h) => {
                    const today = h.dow === curDow;
                    return (
                      <li key={h.day} className="flex justify-between gap-4"
                          style={{ color: today ? 'var(--color-aji)' : 'rgba(248,250,252,0.7)' }}>
                        <span className={today ? 'font-semibold' : ''}>
                          {h.day} {today && (lang === 'en' ? '· Today' : '· Hoy')}
                        </span>
                        <span className="numeral">{h.time}</span>
                      </li>
                    );
                  })}
                </ul>
                {holidays.length > 0 && (
                  <div className="mt-4 border-t border-cream/15 pt-3">
                    <p className="kicker text-aji text-[0.62rem] mb-2">{lang === 'en' ? 'Holiday hours' : 'Días feriados'}</p>
                    <ul className="space-y-1 text-[0.9rem]">
                      {holidays.map((h) => (
                        <li key={h.date} className="flex justify-between gap-4 text-cream/70">
                          <span>{holidayDateLabel(h.date, lang)}</span>
                          <span className="numeral">{hoursLabel(h, lang)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <p className="mt-6 text-[0.88rem] text-cream/55 border-t border-cream/15 pt-4">
                {lang === 'en'
                  ? `Pickup orders are typically ready in about ${INFO.pickupMinutes + prepBuffer} minutes.`
                  : `Los pedidos para llevar suelen estar listos en unos ${INFO.pickupMinutes + prepBuffer} minutos.`}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a href={INFO.mapUrl} target="_blank" rel="noreferrer"
                   className="rounded-full bg-ladrillo px-5 py-3 text-cream text-[0.86rem] font-semibold hover:bg-aji hover:text-ink transition-colors">
                  {pick(UI.getDirections, lang)} →
                </a>
                <a href={`${BASE}order`}
                   className="rounded-full border border-cream/30 px-5 py-3 text-[0.86rem] font-semibold hover:bg-cream/10 transition-colors">
                  {pick(UI.orderNow, lang)}
                </a>
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.1} className="rounded-[1.8rem] overflow-hidden border border-line min-h-[380px] lg:min-h-0">
            <iframe
              title="Sample Bistro location"
              src={MAP}
              loading="lazy"
              allowFullScreen
              className="h-full w-full"
              style={{ border: 0, minHeight: 380, filter: 'saturate(0.9)' }}
              referrerPolicy="no-referrer-when-downgrade"
            />
          </FadeUp>
        </section>

        {/* form */}
        <section className="mx-auto max-w-[1320px] px-5 sm:px-8 py-20 sm:py-28">
          <div className="text-line mb-12"><Cenefa weight={1.6} /></div>
          <div className="grid lg:grid-cols-[0.85fr_1fr] gap-10 lg:gap-16 items-start">
            <div>
              <p className="kicker text-ladrillo">{lang === 'en' ? 'Say hello' : 'Escríbenos'}</p>
              <h2 className="display text-[clamp(2rem,4.5vw,3.4rem)] font-semibold text-ink mt-3">
                {lang === 'en' ? 'Questions, catering, big tables?' : '¿Preguntas, catering, mesas grandes?'}
              </h2>
              <p className="mt-4 text-ink-soft max-w-md">
                {lang === 'en'
                  ? 'Send a note and the family will get back to you. For same-day orders, calling is fastest.'
                  : 'Envíanos un mensaje y la familia te responderá. Para pedidos del mismo día, llamar es lo más rápido.'}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                {/* Phone */}
                <a
                  href={`tel:${INFO.phones[0].replace(/[^0-9]/g, '')}`}
                  className="group flex flex-col gap-3 rounded-[1.3rem] border-2 border-line bg-cream-card p-5 hover:border-ladrillo transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-ladrillo/10 text-ladrillo grid place-items-center group-hover:bg-ladrillo group-hover:text-cream transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 10a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16v.92Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="kicker text-[0.6rem] text-ink-mute">{lang === 'en' ? 'Call us' : 'Llámanos'}</p>
                    <p className="numeral font-semibold text-ink text-[0.95rem] mt-0.5">{INFO.phones[0]}</p>
                  </div>
                </a>

                {/* WhatsApp */}
                <a
                  href={INFO.social.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col gap-3 rounded-[1.3rem] border-2 border-line bg-cream-card p-5 hover:border-[#25D366] transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-[#25D366]/10 text-[#25D366] grid place-items-center group-hover:bg-[#25D366] group-hover:text-white transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84a9.78 9.78 0 0 0 1.34 4.94L2 22l5.36-1.4a9.86 9.86 0 0 0 4.68 1.19h.01c5.43 0 9.84-4.4 9.84-9.84S17.47 2 12.04 2Zm5.78 14.06c-.24.68-1.4 1.3-1.93 1.34-.5.05-1.13.24-3.69-.77-3.1-1.22-5.07-4.4-5.22-4.6-.15-.2-1.25-1.66-1.25-3.17s.79-2.25 1.07-2.56c.28-.31.61-.39.82-.39l.59.01c.19 0 .44-.07.69.53.24.6.84 2.07.91 2.22.07.15.12.33.02.53-.1.2-.15.32-.3.5-.15.18-.32.4-.45.53-.15.15-.31.32-.13.62.18.3.8 1.32 1.72 2.14 1.18 1.05 2.18 1.38 2.48 1.53.3.15.48.13.66-.08.18-.2.76-.89.96-1.2.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.15.5.22.57.34.07.13.07.73-.17 1.41Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="kicker text-[0.6rem] text-ink-mute">WhatsApp</p>
                    <p className="font-semibold text-ink text-[0.95rem] mt-0.5">{lang === 'en' ? 'Message us' : 'Escríbenos'}</p>
                  </div>
                </a>
              </div>
            </div>
            <ContactForm lang={lang} />
          </div>
        </section>
      </main>
      <SiteFooter lang={lang} />
    </div>
  );
}

function ContactForm({ lang }: { lang: Lang }) {
  const [v, setV] = useState({ name: '', email: '', msg: '' });
  const [err, setErr] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState(false);
  const t = (en: string, es: string) => (lang === 'en' ? en : es);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      name: v.name.trim().length < 2,
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email),
      msg: v.msg.trim().length < 5,
    };
    setErr(next);
    if (!next.name && !next.email && !next.msg) setSent(true);
  };

  if (sent) {
    return (
      <motion.div
        className="rounded-[1.6rem] bg-cream-card border border-line p-10 text-center"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
      >
        <div className="mx-auto h-14 w-14 rounded-full grid place-items-center text-cream"
             style={{ background: 'var(--color-limon)' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <p className="font-display text-[1.5rem] font-semibold text-ink mt-4">{pick(CONTACT.formOk, lang)}</p>
        <p className="text-ink-mute text-[0.9rem] mt-1">
          {t('We usually reply within a day.', 'Solemos responder en un día.')}
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-[1.6rem] bg-cream-card border border-line p-6 sm:p-8 space-y-4">
      <FormField label={pick(CONTACT.formName, lang)} error={err.name} errMsg={t('Please enter your name.', 'Ingresa tu nombre.')}>
        <input
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
          className="ct-input"
          placeholder={t('Your full name', 'Tu nombre completo')}
        />
      </FormField>
      <FormField label={pick(CONTACT.formEmail, lang)} error={err.email} errMsg={t('Enter a valid email.', 'Ingresa un correo válido.')}>
        <input
          value={v.email}
          onChange={(e) => setV({ ...v, email: e.target.value })}
          className="ct-input"
          placeholder={t('you@example.com', 'tucorreo@ejemplo.com')}
        />
      </FormField>
      <FormField label={pick(CONTACT.formMsg, lang)} error={err.msg} errMsg={t('Tell us a little more.', 'Cuéntanos un poco más.')}>
        <textarea
          value={v.msg}
          onChange={(e) => setV({ ...v, msg: e.target.value })}
          rows={4}
          className="ct-input resize-none"
          placeholder={t('Your message…', 'Tu mensaje…')}
        />
      </FormField>
      <button type="submit"
              className="w-full rounded-full bg-ladrillo text-cream font-semibold py-3.5 hover:bg-ladrillo-deep transition-colors">
        {pick(CONTACT.formSend, lang)}
      </button>
      <style>{`
        .ct-input{width:100%;border-radius:0.85rem;border:1px solid var(--color-line);
          background:var(--color-cream);padding:0.75rem 0.9rem;font-size:0.96rem;
          color:var(--color-ink);transition:border-color .2s;}
        .ct-input::placeholder{color:var(--color-ink-faint);}
        .ct-input:focus{outline:none;border-color:var(--color-ladrillo);}
      `}</style>
    </form>
  );
}

function FormField({ label, error, errMsg, children }: {
  label: string; error?: boolean; errMsg: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="kicker text-[0.62rem] text-ink-mute">{label}</label>
      <div className="mt-1.5" style={error ? { outline: '1.5px solid var(--color-ladrillo)', borderRadius: '0.85rem' } : undefined}>
        {children}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="text-[0.78rem] text-ladrillo mt-1"
          >
            {errMsg}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
