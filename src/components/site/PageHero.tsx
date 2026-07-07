import { motion } from 'motion/react';
import { LineReveal, EASE } from '../motion';
import { Chakana } from '../Cenefa';

/**
 * Full-bleed image hero shared by the interior pages — same treatment as the
 * home Hero (cover photo + slate scrim gradient + kicker + big line-revealed
 * headline). Each page passes its own image, kicker and headline.
 */
export function PageHero({
  image,
  kicker,
  lines,
  sub,
  minHeight = '80vh',
}: {
  image: string;
  kicker: string;
  lines: string[];
  sub?: string;
  minHeight?: string;
}) {
  return (
    <section className="relative flex items-end overflow-hidden" style={{ minHeight }}>
      <div className="absolute inset-0">
        <img src={image} alt="" className="h-full w-full object-cover object-center" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.48) 0%, rgba(15,23,42,0.14) 40%, rgba(15,23,42,0.92) 100%)' }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1320px] w-full px-5 sm:px-8 pb-14 sm:pb-16 pt-[150px]">
        <motion.p
          className="kicker text-cream/80 flex items-center gap-3"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.12 }}
        >
          <Chakana size={13} />
          {kicker}
        </motion.p>

        <LineReveal
          as="h1"
          lines={lines}
          delay={0.28}
          className="display display-tight mt-4 text-[clamp(3rem,8.5vw,6.6rem)] font-extrabold leading-[0.92] text-cream"
        />

        {sub && (
          <motion.p
            className="mt-6 max-w-[36rem] text-[1.12rem] leading-relaxed text-cream/85"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.62 }}
          >
            {sub}
          </motion.p>
        )}
      </div>
    </section>
  );
}
