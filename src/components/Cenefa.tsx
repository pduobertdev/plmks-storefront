import { useId } from 'react';

/* The stepped Andean fret ("la cenefa") — the project's signature device.
   One tile is a stepped pyramid 48 wide × 12 tall. */
const STEP = 'M0,12 H6 V8 H12 V4 H18 V0 H30 V4 H36 V8 H42 V12 H48';

/**
 * Cenefa — a thin stepped-fret rule, tiled horizontally.
 * Inherits color via currentColor unless `tone` is given.
 */
export function Cenefa({
  className = '',
  tone = 'currentColor',
  weight = 2,
  flip = false,
}: {
  className?: string;
  tone?: string;
  weight?: number;
  flip?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      className={className}
      width="100%"
      height="12"
      aria-hidden="true"
      style={{ display: 'block', transform: flip ? 'scaleY(-1)' : undefined }}
    >
      <defs>
        <pattern id={`c-${id}`} width="48" height="12" patternUnits="userSpaceOnUse">
          <path d={STEP} fill="none" stroke={tone} strokeWidth={weight} />
        </pattern>
      </defs>
      <rect width="100%" height="12" fill={`url(#c-${id})`} />
    </svg>
  );
}

/**
 * Chakana — a small stepped-cross glyph (the Andean cross), simplified.
 * Used as an ornament / list marker.
 */
export function Chakana({
  size = 16,
  className = '',
  tone = 'currentColor',
}: {
  size?: number;
  className?: string;
  tone?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path
        fill={tone}
        d="M9 0h6v3h3v3h3v6h3v6h-3v3h-3v3H9v-3H6v-3H3v-6H0V9h3V6h3V3h3Zm1.5 9v6h3V9Z"
      />
    </svg>
  );
}
