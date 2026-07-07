/*
 * Neutral dividers for the generic template. The old Andean-fret "cenefa" +
 * "chakana" motifs were Peru's Taste signature and made every clone look like
 * that restaurant. These render a clean modern rule + a simple block glyph
 * instead. Names and props are kept so existing call sites don't change.
 */

/** A clean, full-width horizontal rule (was the stepped Andean fret). */
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
  void flip;
  const h = Math.max(2, Math.round(weight));
  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        width: '100%',
        height: h,
        borderRadius: 999,
        background: tone,
        opacity: 0.85,
      }}
    />
  );
}

/** A simple rounded-square block marker (was the Andean cross). */
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
      <rect x="4" y="4" width="16" height="16" rx="4" fill={tone} />
    </svg>
  );
}
