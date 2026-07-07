import { useState, useEffect } from 'react';
import { useLang, pick } from '../../lib/lang';
import { INFO, ABOUT, UI } from '../../data/content';
import { asset, food } from '../../lib/assets';
import { SiteNav } from './SiteNav';
import { SiteFooter } from './SiteFooter';
import { Cenefa, Chakana } from '../Cenefa';
import { LineReveal, FadeUp, ImageReveal, Parallax } from '../motion';
import { PageHero } from './PageHero';

const BASE = import.meta.env.BASE_URL;
const API_URL = import.meta.env.PUBLIC_ORDER_API_URL?.replace(/\/$/, '') ?? '';
const IG_URL = 'https://www.instagram.com/samplebistro/';
const INSTAGRAM_PATH = 'M12 2.2c3.2 0 3.6 0 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.25.07 1.62.07 4.81s-.01 3.56-.07 4.81c-.15 3.23-1.66 4.77-4.92 4.92-1.25.06-1.62.07-4.85.07s-3.6-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.06 15.56 2.05 15.19 2.05 12s.01-3.56.07-4.81C2.27 3.96 3.79 2.42 7.05 2.27 8.4 2.21 8.77 2.2 12 2.2Zm0 4.86A4.94 4.94 0 1 0 16.94 12 4.94 4.94 0 0 0 12 7.06Zm0 8.14A3.2 3.2 0 1 1 15.2 12 3.2 3.2 0 0 1 12 15.2Zm5.13-8.34a1.15 1.15 0 1 0 1.15 1.15 1.15 1.15 0 0 0-1.15-1.15Z';

type IgPost = { url: string; permalink: string };

const DEMO_POSTS: IgPost[] = [
  'dish-1', 'dish-2', 'dish-3', 'dish-4',
  'dish-1', 'dish-2', 'dish-3', 'dish-4',
].map((slug) => ({ url: food(slug), permalink: IG_URL }));

// Instagram rate-limits the public scrape, so the live feed often returns just
// a post or two. Keep the grid full by padding real posts with our own dish
// photos up to a clean two-row grid.
const IG_TARGET = 10;

function fillGrid(real: IgPost[]): IgPost[] {
  if (real.length >= IG_TARGET) return real.slice(0, IG_TARGET);
  const pad = DEMO_POSTS.filter((d) => !real.some((r) => r.url === d.url));
  return [...real, ...pad].slice(0, IG_TARGET);
}

async function fetchIgFeed(): Promise<IgPost[]> {
  if (!API_URL) return DEMO_POSTS;
  try {
    const res = await fetch(`${API_URL}/api/instagram`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return DEMO_POSTS;
    const payload = await res.json();
    const posts: IgPost[] = payload?.data ?? [];
    return fillGrid(posts);
  } catch {
    return DEMO_POSTS;
  }
}

export default function About() {
  const [lang, setLang] = useLang();
  const title = lang === 'en' ? ABOUT.title : ABOUT.titleEs;
  const [igPosts, setIgPosts] = useState<IgPost[]>(DEMO_POSTS);

  useEffect(() => {
    fetchIgFeed().then(setIgPosts);
  }, []);

  return (
    <div>
      <SiteNav lang={lang} setLang={setLang} current="about" />
      <main>
        <PageHero
          image={asset('hero-about.jpg')}
          kicker={pick(ABOUT.kicker, lang)}
          lines={title}
        />

        {/* intro — team photo + lead */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8 grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-5">
              <Parallax distance={36}>
                <ImageReveal
                  src={asset('team.jpg')}
                  alt="The Sample Bistro family and team at the restaurant"
                  className="aspect-[4/5] rounded-[2rem] shadow-[0_40px_80px_-36px_rgba(30,41,59,0.5)]"
                  imgClassName="object-[center_35%]"
                />
              </Parallax>
            </div>
            <div className="lg:col-span-7">
              <FadeUp>
                <img src={asset('seal.jpg')} alt="" className="h-20 w-20 rounded-full mb-5" />
                <p className="font-display text-[1.4rem] sm:text-[1.7rem] text-ink leading-snug">
                  {pick(ABOUT.lead, lang)}
                </p>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* chapters */}
        <section className="bg-cream-deep py-20 sm:py-28">
          <div className="text-line"><div className="-mt-20 mb-20"><Cenefa weight={1.6} /></div></div>
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8 space-y-20 sm:space-y-28">
            {ABOUT.chapters.map((ch, i) => (
              <div key={i} className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
                <div className={`lg:col-span-6 ${i % 2 ? 'lg:order-2' : ''}`}>
                  <Parallax distance={44}>
                    <ImageReveal
                      src={food(i === 0 ? 'dish-3' : 'dish-4')}
                      alt=""
                      className="aspect-[5/4] rounded-[2rem] shadow-[0_36px_70px_-34px_rgba(30,41,59,0.5)]"
                    />
                  </Parallax>
                </div>
                <div className={`lg:col-span-6 ${i % 2 ? 'lg:order-1' : ''}`}>
                  <FadeUp>
                    <h2 className="display text-[clamp(2rem,4.5vw,3.2rem)] font-semibold text-ink">
                      {pick(ch.title, lang)}
                    </h2>
                    <p className="mt-4 text-[1.08rem] text-ink-soft max-w-[34rem]">
                      {pick(ch.body, lang)}
                    </p>
                  </FadeUp>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* instagram */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
              <div>
                <p className="kicker text-ladrillo flex items-center gap-2 mb-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d={INSTAGRAM_PATH} />
                  </svg>
                  {lang === 'en' ? 'On Instagram' : 'En Instagram'}
                </p>
                <h2 className="display text-[clamp(1.9rem,4.5vw,3rem)] font-semibold text-ink">
                  @samplebistro
                </h2>
              </div>
              <a
                href={IG_URL}
                target="_blank"
                rel="noreferrer"
                className="self-start sm:self-auto rounded-full border-2 border-ladrillo text-ladrillo px-6 py-2.5 font-semibold hover:bg-ladrillo hover:text-cream transition-colors text-[0.95rem] shrink-0"
              >
                {lang === 'en' ? 'Follow us' : 'Síguenos'} →
              </a>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
              {igPosts.map((post, i) => (
                <FadeUp key={post.url + i} delay={i * 0.03}>
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block aspect-square overflow-hidden rounded-xl sm:rounded-2xl"
                  >
                    <img
                      src={post.url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/40 transition-colors duration-300 flex items-center justify-center">
                      <svg
                        className="text-cream opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg"
                        width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden
                      >
                        <path d={INSTAGRAM_PATH} />
                      </svg>
                    </div>
                  </a>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* closing */}
        <section className="bg-ink text-cream py-24 sm:py-32 text-center">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <span className="display text-aji text-[3rem] leading-none">“</span>
            <p className="display text-[clamp(1.8rem,4.2vw,3rem)] font-semibold leading-[1.12]">
              {pick(INFO.tagline, lang)}
            </p>
            <p className="mt-5 text-cream/65 max-w-md mx-auto">
              {lang === 'en'
                ? 'Three words guide this kitchen every day. Come find out why.'
                : 'Tres palabras guían esta cocina cada día. Ven a descubrir por qué.'}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a href={`${BASE}order`}
                 className="rounded-full bg-ladrillo px-7 py-3.5 text-cream font-semibold hover:bg-aji hover:text-ink transition-colors">
                {pick(UI.orderNow, lang)} →
              </a>
              <a href={`${BASE}contact`}
                 className="rounded-full border border-cream/30 px-7 py-3.5 font-semibold hover:bg-cream/10 transition-colors">
                {lang === 'en' ? 'Visit us' : 'Visítanos'}
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter lang={lang} />
    </div>
  );
}
