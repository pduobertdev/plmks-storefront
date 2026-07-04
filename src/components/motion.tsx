import { type ReactNode, useRef } from 'react';
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react';

export const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * LineReveal — masked, line-by-line typographic reveal.
 * Uses the useInView hook (not whileInView) so it fires correctly even
 * when the island hydrates already inside the viewport.
 */
export function LineReveal({
  lines,
  className = '',
  delay = 0,
  stagger = 0.085,
  as = 'div',
  style,
}: {
  lines: string[];
  className?: string;
  delay?: number;
  stagger?: number;
  as?: 'div' | 'h1' | 'h2' | 'h3' | 'p';
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' });
  const Tag = motion[as] as typeof motion.div;

  return (
    <Tag ref={ref} className={className} style={style}>
      {lines.map((line, i) => (
        <span key={i} className="line-mask">
          <motion.span
            style={{ display: 'block', willChange: 'transform' }}
            initial={{ y: reduce ? 0 : '112%' }}
            animate={inView ? { y: 0 } : { y: reduce ? 0 : '112%' }}
            transition={{ duration: 1, ease: EASE, delay: delay + i * stagger }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** FadeUp — soft entrance for blocks of content. */
export function FadeUp({
  children,
  className = '',
  delay = 0,
  y = 30,
  as = 'div',
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: 'div' | 'li' | 'span';
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: '0px 0px -6% 0px' });
  const Tag = motion[as] as typeof motion.div;

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : y }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

/** ImageReveal — a photo behind a curtain that wipes up, with a slow zoom-out. */
export function ImageReveal({
  src,
  alt,
  className = '',
  imgClassName = '',
  delay = 0,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });

  return (
    <div ref={ref} className={className} style={{ overflow: 'hidden', position: 'relative' }}>
      <motion.img
        src={src}
        alt={alt}
        className={imgClassName}
        loading="lazy"
        initial={{ scale: reduce ? 1 : 1.22 }}
        animate={inView ? { scale: 1 } : { scale: reduce ? 1 : 1.22 }}
        transition={{ duration: 1.5, ease: EASE, delay }}
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <motion.div
        aria-hidden
        initial={{ scaleY: reduce ? 0 : 1 }}
        animate={inView ? { scaleY: 0 } : { scaleY: reduce ? 0 : 1 }}
        transition={{ duration: 0.95, ease: EASE, delay }}
        style={{
          position: 'absolute', inset: 0, transformOrigin: 'top',
          background: 'var(--color-cream)',
        }}
      />
    </div>
  );
}

/** Parallax — drifts a child as it crosses the viewport. */
export function Parallax({
  children,
  className = '',
  distance = 80,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [distance, -distance]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}
