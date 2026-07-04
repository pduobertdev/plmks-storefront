import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  fetchAccount, logout, updateProfile,
  saveAddress, deleteAddress, toggleFavorite,
  type AccountSnapshot, type AccountAddress,
} from '../../lib/customerAuth';
import AccountModal from './AccountModal';

type Lang = 'en' | 'es';
const t = (lang: Lang, en: string, es: string) => (lang === 'en' ? en : es);
const money = (cents: number) => '$' + (cents / 100).toFixed(2);

const MONTHS_SHORT_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_SHORT_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

/** Whole days from today to the next occurrence of month/day (this year or next). */
function daysUntilBirthday(month: number, day: number): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), month - 1, day);
  if (next.getTime() < today.getTime()) next = new Date(now.getFullYear() + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}
const isBirthdayMonth = (month: number) => new Date().getMonth() + 1 === month;
const daysInMonth = (m: number) => new Date(2024, m, 0).getDate(); // 2024 = leap year so Feb=29

type IconProps = { className?: string };
const CheckIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 13l4 4L19 7" /></svg>
);
const GiftIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
);
const CakeIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s1.4-1.6 4-1.6S12 16 12 16s1.4-1.6 4-1.6S20 16 20 16M2 21h20M12 4.5v3M8.5 5.5v2M15.5 5.5v2" /></svg>
);

/* ── Account dashboard ────────────────────────────────────────────────
 * Mounted at /account. If not logged in, renders the sign-in modal as a
 * full-screen step. Once authenticated, shows: loyalty bar, active
 * coupon, recent orders + reorder, saved addresses CRUD, favorites,
 * profile editor, referral link copy.
 * ─────────────────────────────────────────────────────────────────── */
export default function Account() {
  // Lang: read from URL like Order.tsx does, or default to EN
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pt_lang');
      if (saved === 'es' || saved === 'en') setLang(saved);
    } catch {}
  }, []);

  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    fetchAccount().then((a) => {
      setAccount(a);
      setLoading(false);
      if (!a) setSignInOpen(true);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="text-ink-mute">{t(lang, 'Loading…', 'Cargando…')}</span>
      </div>
    );
  }

  if (!account) {
    return (
      <>
        <SignedOutHero lang={lang} onSignIn={() => setSignInOpen(true)} />
        <AccountModal open={signInOpen} onClose={() => setSignInOpen(false)} lang={lang} />
      </>
    );
  }

  return <SignedInDashboard account={account} setAccount={setAccount} lang={lang} />;
}

function SignedOutHero({ lang, onSignIn }: { lang: Lang; onSignIn: () => void }) {
  return (
    <section className="min-h-[60vh] flex items-center justify-center px-6 py-20 text-center">
      <div className="max-w-md">
        <div className="font-display text-[0.62rem] uppercase tracking-[0.22em] text-ladrillo font-semibold mb-3">
          Sample Bistro · {t(lang, 'Your account', 'Tu cuenta')}
        </div>
        <h1 className="font-display text-[2.4rem] font-semibold text-ink leading-tight">
          {t(lang, 'Save time on every order', 'Ahorra tiempo en cada pedido')}
        </h1>
        <p className="mt-3 text-ink-mute leading-snug">
          {t(
            lang,
            'See past orders, reorder your favorite in one tap, save delivery addresses, and claim VIP coupons we send returning guests.',
            'Mira tus pedidos pasados, reordena tu favorito con un toque, guarda direcciones de entrega y reclama los cupones VIP que enviamos a clientes recurrentes.'
          )}
        </p>
        <button
          onClick={onSignIn}
          className="mt-6 rounded-full bg-ladrillo text-cream font-semibold px-7 py-3 hover:bg-ladrillo-deep transition-colors"
        >
          {t(lang, 'Sign in', 'Iniciar sesión')}
        </button>
      </div>
    </section>
  );
}

function SignedInDashboard({
  account, setAccount, lang,
}: {
  account: AccountSnapshot;
  setAccount: (a: AccountSnapshot) => void;
  lang: Lang;
}) {
  const { customer, recent_orders, addresses, favorites } = account;
  const refresh = async () => { const fresh = await fetchAccount(); if (fresh) setAccount(fresh); };

  return (
    <div className="max-w-5xl mx-auto px-5 lg:px-8 py-10 lg:py-16 space-y-8">
      <HeroCard account={account} lang={lang} refresh={refresh} />

      {/* Reorder + past orders */}
      <Section title={t(lang, 'Past orders', 'Pedidos pasados')}>
        {recent_orders.length === 0 ? (
          <p className="text-ink-mute text-[0.9rem]">{t(lang, 'No orders yet. Place one and we will remember it here.', 'Aún no hay pedidos. Realiza uno y lo guardaremos aquí.')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent_orders.map((o) => (
              <li key={o.id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-display text-[1rem] font-semibold text-ink">
                    #{o.short_id} · <span className="text-ink-mute font-normal">{new Date(o.placed_at).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </p>
                  <p className="text-[0.82rem] text-ink-mute">
                    {o.first_item_name}{o.item_count > 1 ? ` +${o.item_count - 1} ${t(lang, 'more', 'más')}` : ''} · {money(o.total_cents)} · {o.fulfillment_type}
                  </p>
                </div>
                <button
                  onClick={() => handleReorder(o.id)}
                  className="rounded-full border border-ladrillo text-ladrillo font-semibold px-4 py-1.5 text-[0.82rem] hover:bg-ladrillo hover:text-cream transition-colors"
                >
                  {t(lang, 'Reorder', 'Reordenar')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Saved addresses */}
      <AddressesSection
        addresses={addresses}
        lang={lang}
        onChange={async () => {
          const fresh = await fetchAccount();
          if (fresh) setAccount(fresh);
        }}
      />

      {/* Favorites */}
      <Section title={t(lang, 'Favorite dishes', 'Platos favoritos')}>
        {favorites.length === 0 ? (
          <p className="text-ink-mute text-[0.9rem]">
            {t(lang, 'Tap the heart on any dish to save it here for one-tap reorder.', 'Toca el corazón en cualquier plato para guardarlo aquí y reordenar rápido.')}
          </p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {favorites.map((f) => (
              <li key={f.menu_item_id} className="rounded-xl border border-line bg-cream-card p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-display font-semibold text-ink text-[0.95rem]">{lang === 'es' ? f.name_es : f.name}</p>
                  <p className="numeral text-[0.82rem] text-ink-mute">{money(f.price_cents)}</p>
                </div>
                <button
                  onClick={async () => {
                    await toggleFavorite(f.menu_item_id, false);
                    const fresh = await fetchAccount();
                    if (fresh) setAccount(fresh);
                  }}
                  className="text-[0.78rem] text-ladrillo underline hover:text-ladrillo-deep"
                >
                  {t(lang, 'Remove', 'Quitar')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Profile editor */}
      <ProfileSection customer={customer} lang={lang} onSaved={async () => {
        const fresh = await fetchAccount();
        if (fresh) setAccount(fresh);
      }} />
    </div>
  );
}

function handleReorder(orderId: string) {
  // No API call here — pass the order id through the URL and let the
  // /order page fetch + hydrate. Avoids sessionStorage races and lets
  // the link survive being opened in a new tab.
  window.location.href = `/order?reorder=${encodeURIComponent(orderId)}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className="rounded-[1.4rem] border border-line bg-cream-card p-6 lg:p-7"
    >
      <h2 className="font-display text-[1.3rem] font-semibold text-ink mb-3">{title}</h2>
      {children}
    </motion.section>
  );
}

/* ── Hero card — greeting + birthday + animated rewards card ─────────── */
function HeroCard({ account, lang, refresh }: { account: AccountSnapshot; lang: Lang; refresh: () => void }) {
  const { customer, loyalty, active_coupon } = account;
  const firstName = customer.name?.split(' ')[0] || customer.email.split('@')[0];
  const months = lang === 'es' ? MONTHS_SHORT_ES : MONTHS_SHORT_EN;

  const hasBday = customer.birthday_month != null && customer.birthday_day != null;
  const bMonth = customer.birthday_month as number;
  const bDay = customer.birthday_day as number;
  const bdayLabel = hasBday ? `${months[bMonth - 1]} ${bDay}` : '';
  const days = hasBday ? daysUntilBirthday(bMonth, bDay) : null;
  const thisMonth = hasBday ? isBirthdayMonth(bMonth) : false;

  const [editing, setEditing] = useState(false);

  async function handleLogout() { await logout(); window.location.href = '/'; }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-[1.4rem] border border-line bg-cream-card p-6 lg:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-[0.62rem] uppercase tracking-[0.22em] text-ladrillo font-semibold mb-2">
            Sample Bistro · {t(lang, 'Your account', 'Tu cuenta')}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[2rem] font-semibold text-ink leading-none">
              {t(lang, 'Hola,', 'Hola,')} {firstName}
            </h1>
            <BirthdayChip hasBday={hasBday} label={bdayLabel} lang={lang} onClick={() => setEditing((v) => !v)} />
          </div>
          <p className="mt-1.5 text-[0.92rem] text-ink-mute">
            {t(lang, 'Lifetime value:', 'Valor total:')} <strong className="text-ink numeral">{money(loyalty.lifetime_value_cents)}</strong>
            {' · '}
            {t(lang, 'orders so far:', 'pedidos hasta ahora:')} <strong className="text-ink numeral">{loyalty.total_orders}</strong>
          </p>
          <BirthdayGiftLine hasBday={hasBday} days={days} thisMonth={thisMonth} lang={lang} onAdd={() => setEditing(true)} />
        </div>
        <button onClick={handleLogout} className="text-[0.82rem] text-ink-mute hover:text-ink underline shrink-0">
          {t(lang, 'Sign out', 'Cerrar sesión')}
        </button>
      </div>

      {editing && (
        <BirthdayEditor
          month={hasBday ? bMonth : ''} day={hasBday ? bDay : ''} lang={lang}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); refresh(); }}
        />
      )}

      <RewardStamps lang={lang} loyalty={loyalty} />

      {active_coupon && <ActiveCouponBlock coupon={active_coupon} lang={lang} />}

      <a
        href="/order"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-ladrillo text-cream font-semibold px-5 py-2.5 text-[0.92rem] hover:bg-ladrillo-deep transition-colors"
      >
        {t(lang, 'Start a new order', 'Empezar un nuevo pedido')} <span aria-hidden>→</span>
      </a>
    </motion.section>
  );
}

function BirthdayChip({ hasBday, label, lang, onClick }: { hasBday: boolean; label: string; lang: Lang; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.8rem] font-semibold transition-colors ${
        hasBday
          ? 'bg-aji/15 text-[#9a6a12] hover:bg-aji/25'
          : 'border border-dashed border-ladrillo text-ladrillo hover:bg-ladrillo/10'
      }`}
    >
      <CakeIcon className="h-3.5 w-3.5" />
      {hasBday ? label : t(lang, 'Add birthday', 'Tu cumpleaños')}
    </button>
  );
}

function BirthdayGiftLine({ hasBday, days, thisMonth, lang, onAdd }: { hasBday: boolean; days: number | null; thisMonth: boolean; lang: Lang; onAdd: () => void }) {
  if (!hasBday) {
    return (
      <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-[0.86rem] text-ink-soft">
        <GiftIcon className="h-4 w-4 text-ladrillo" />
        {t(lang, 'Add your birthday for a free dessert every year.', 'Agrega tu cumpleaños y recibe un postre gratis cada año.')}{' '}
        <button onClick={onAdd} className="text-ladrillo underline font-semibold">{t(lang, 'Add it', 'Agregar')}</button>
      </p>
    );
  }
  if (thisMonth) {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-[0.9rem] font-semibold text-[#9a6a12]">
        <GiftIcon className="h-4 w-4 text-aji" />
        {t(lang, 'Your birthday treat is waiting this month!', '¡Tu regalo de cumpleaños te espera este mes!')}
      </p>
    );
  }
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 text-[0.88rem] text-ink-soft">
      <GiftIcon className="h-4 w-4 text-ladrillo" />
      <span>
        <strong className="text-ink numeral">{days}</strong>{' '}
        {t(lang, `day${days === 1 ? '' : 's'} until your free birthday dessert`, `día${days === 1 ? '' : 's'} para tu postre de cumpleaños gratis`)}
      </span>
    </p>
  );
}

function BirthdayEditor({ month, day, lang, onClose, onSaved }: { month: number | ''; day: number | ''; lang: Lang; onClose: () => void; onSaved: () => void }) {
  const [m, setM] = useState<number | ''>(month);
  const [d, setD] = useState<number | ''>(day);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const months = lang === 'es' ? MONTHS_SHORT_ES : MONTHS_SHORT_EN;

  async function save() {
    if (m === '' || d === '') { setError(t(lang, 'Pick month and day.', 'Elige mes y día.')); return; }
    setSaving(true); setError('');
    try {
      await updateProfile({ birthday_month: Number(m), birthday_day: Number(d) });
      onSaved();
    } catch (e: any) { setError(e?.message || t(lang, 'Could not save', 'No se pudo guardar')); }
    finally { setSaving(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="mt-4 rounded-xl border border-line bg-cream p-4"
    >
      <div className="text-[0.72rem] uppercase tracking-[0.16em] text-ink-mute font-semibold mb-2">
        {t(lang, 'Your birthday — free dessert every year', 'Tu cumpleaños — postre gratis cada año')}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={m}
          onChange={(e) => { const v = e.target.value === '' ? '' : Number(e.target.value); setM(v); if (v !== '' && d !== '' && Number(d) > daysInMonth(Number(v))) setD(''); }}
          className="rounded-xl border border-line bg-cream-card px-3 py-2.5 text-[0.9rem]"
        >
          <option value="">{t(lang, 'Month', 'Mes')}</option>
          {months.map((mo, i) => <option key={i + 1} value={i + 1}>{mo}</option>)}
        </select>
        <select
          value={d}
          onChange={(e) => setD(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={m === ''}
          className="rounded-xl border border-line bg-cream-card px-3 py-2.5 text-[0.9rem] disabled:opacity-50"
        >
          <option value="">{t(lang, 'Day', 'Día')}</option>
          {Array.from({ length: m === '' ? 0 : daysInMonth(Number(m)) }, (_, i) => i + 1).map((dd) => <option key={dd} value={dd}>{dd}</option>)}
        </select>
        <button onClick={save} disabled={saving} className="rounded-full bg-ladrillo text-cream font-semibold px-4 py-2.5 text-[0.85rem] disabled:opacity-55">
          {saving ? t(lang, 'Saving…', 'Guardando…') : t(lang, 'Save', 'Guardar')}
        </button>
        <button onClick={onClose} className="text-[0.82rem] text-ink-mute hover:text-ink">{t(lang, 'Cancel', 'Cancelar')}</button>
      </div>
      {error && <p className="mt-2 text-[0.8rem] text-ladrillo">{error}</p>}
    </motion.div>
  );
}

/* ── Rewards card — a gamified "stamp card" toward the next discount ──── */
function RewardStamps({ lang, loyalty }: { lang: Lang; loyalty: AccountSnapshot['loyalty'] }) {
  const reduce = useReducedMotion();
  const total = loyalty.next_reward_at;
  const left = Math.max(0, loyalty.orders_to_next_reward);
  const filled = Math.max(0, Math.min(total, total - left));
  const pct = loyalty.reward_pct ?? 10;
  const close = left > 0 && left <= 3;

  const headline = left <= 0
    ? t(lang, `Your ${pct}% reward is ready!`, `¡Tu premio de ${pct}% está listo!`)
    : close
      ? t(lang, `So close — just ${left} more for ${pct}% off!`, `¡Ya casi! Solo ${left} más para ${pct}% de descuento`)
      : t(lang, `${left} more orders to ${pct}% off`, `${left} pedidos más para ${pct}% de descuento`);

  return (
    <div className={`mt-6 rounded-2xl border bg-cream p-4 sm:p-5 transition-colors ${close ? 'border-aji/60' : 'border-line'}`}>
      <div className="font-display text-[0.62rem] uppercase tracking-[0.18em] text-ink-mute font-semibold mb-3">
        {t(lang, 'Rewards card', 'Tarjeta de premios')}
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-2.5">
        {Array.from({ length: total }, (_, i) => (
          <Stamp key={i} index={i} filled={i < filled} next={i === filled && left > 0} prize={i === total - 1} close={close} reduce={!!reduce} />
        ))}
      </div>
      <p className={`mt-3.5 font-display text-[1.05rem] sm:text-[1.18rem] font-semibold ${close ? 'text-ladrillo' : 'text-ink'}`}>
        {headline}
      </p>
    </div>
  );
}

function Stamp({ index, filled, next, prize, close, reduce }: { index: number; filled: boolean; next: boolean; prize: boolean; close: boolean; reduce: boolean }) {
  return (
    <motion.div
      className="relative"
      initial={reduce ? false : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reduce ? { duration: 0 } : { delay: 0.05 * index, type: 'spring', stiffness: 480, damping: 20 }}
    >
      {next && close && !reduce && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-ladrillo"
          initial={{ opacity: 0.45, scale: 1 }}
          animate={{ opacity: 0, scale: 1.7 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <div
        className={`relative h-9 w-9 sm:h-10 sm:w-10 rounded-full grid place-items-center text-[0.8rem] font-bold transition-colors ${
          filled ? 'bg-ladrillo text-cream shadow-sm'
            : prize ? 'border-2 border-aji text-aji bg-aji/10'
            : next ? 'border-2 border-ladrillo text-ladrillo bg-cream-card'
            : 'border border-line text-ink-mute bg-cream-card'
        }`}
      >
        {filled ? <CheckIcon className="h-4 w-4" /> : prize ? <GiftIcon className="h-4 w-4" /> : <span className="numeral">{index + 1}</span>}
      </div>
    </motion.div>
  );
}

function ActiveCouponBlock({ coupon, lang }: { coupon: { code: string; discount_pct: number; expires_at: string | null }; lang: Lang }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-5 rounded-xl border-2 border-dashed border-ladrillo bg-cream p-4 text-center">
      <div className="text-[0.68rem] uppercase tracking-[0.22em] text-ladrillo font-semibold">
        {t(lang, 'Coupon ready for you', 'Cupón listo para ti')}
      </div>
      <div className="mt-1 numeral font-mono text-[1.6rem] font-bold text-ink tracking-[0.18em]">{coupon.code}</div>
      <p className="text-[0.82rem] text-ink-mute mt-1">
        {coupon.discount_pct}% {t(lang, 'off your next order.', 'de descuento en tu próximo pedido.')}
      </p>
      <button
        onClick={() => { navigator.clipboard.writeText(coupon.code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="mt-2 text-[0.82rem] text-ladrillo underline"
      >
        {copied ? t(lang, '✓ Copied', '✓ Copiado') : t(lang, 'Copy code', 'Copiar código')}
      </button>
    </div>
  );
}

function AddressesSection({ addresses, lang, onChange }: { addresses: AccountAddress[]; lang: Lang; onChange: () => void }) {
  const [editing, setEditing] = useState<AccountAddress | 'new' | null>(null);
  return (
    <Section title={t(lang, 'Saved addresses', 'Direcciones guardadas')}>
      <ul className="space-y-2">
        {addresses.map((a) => (
          <li key={a.id} className="rounded-xl border border-line bg-cream p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-ink">{a.label || t(lang, 'Address', 'Dirección')}</span>
                {a.is_default && (
                  <span className="text-[0.65rem] uppercase tracking-widest text-ladrillo font-semibold">{t(lang, 'Default', 'Predeterminada')}</span>
                )}
              </div>
              <p className="text-[0.82rem] text-ink-mute">
                {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.zip}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(a)} className="text-[0.78rem] text-ink-mute underline">{t(lang, 'Edit', 'Editar')}</button>
              <button onClick={async () => { if (confirm(t(lang, 'Delete this address?', '¿Eliminar esta dirección?'))) { await deleteAddress(a.id); onChange(); } }} className="text-[0.78rem] text-ladrillo underline">{t(lang, 'Delete', 'Eliminar')}</button>
            </div>
          </li>
        ))}
      </ul>
      <button
        onClick={() => setEditing('new')}
        className="mt-3 rounded-full border border-ladrillo text-ladrillo font-semibold px-4 py-1.5 text-[0.82rem] hover:bg-ladrillo hover:text-cream transition-colors"
      >
        + {t(lang, 'Add address', 'Agregar dirección')}
      </button>

      {editing && (
        <AddressEditor
          existing={editing === 'new' ? null : editing}
          lang={lang}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChange(); }}
        />
      )}
    </Section>
  );
}

function AddressEditor({ existing, lang, onClose, onSaved }: { existing: AccountAddress | null; lang: Lang; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Omit<AccountAddress, 'id'> & { id?: number }>({
    id: existing?.id,
    label: existing?.label ?? '',
    line1: existing?.line1 ?? '',
    line2: existing?.line2 ?? '',
    city: existing?.city ?? '',
    state: existing?.state ?? 'CA',
    zip: existing?.zip ?? '',
    is_default: existing?.is_default ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true); setError('');
    try {
      await saveAddress(form);
      onSaved();
    } catch (e: any) {
      setError(e?.message ?? 'Save failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink/55" onClick={onClose} />
      <div className="relative w-full max-w-md bg-cream rounded-[1.4rem] border border-line p-6">
        <h3 className="font-display text-[1.3rem] font-semibold text-ink mb-4">
          {existing ? t(lang, 'Edit address', 'Editar dirección') : t(lang, 'Add address', 'Nueva dirección')}
        </h3>
        <div className="space-y-2.5">
          <input value={form.label ?? ''} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={t(lang, 'Label (Home, Work…)', 'Etiqueta (Casa, Trabajo…)')} className="w-full rounded-xl border border-line bg-cream-card px-3 py-2.5" />
          <input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder={t(lang, 'Street address', 'Calle y número')} className="w-full rounded-xl border border-line bg-cream-card px-3 py-2.5" />
          <input value={form.line2 ?? ''} onChange={(e) => setForm({ ...form, line2: e.target.value })} placeholder={t(lang, 'Apt / suite (optional)', 'Apt / suite (opcional)')} className="w-full rounded-xl border border-line bg-cream-card px-3 py-2.5" />
          <div className="grid grid-cols-3 gap-2">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t(lang, 'City', 'Ciudad')} className="col-span-2 rounded-xl border border-line bg-cream-card px-3 py-2.5" />
            <input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} placeholder="ZIP" className="rounded-xl border border-line bg-cream-card px-3 py-2.5" />
          </div>
          <label className="flex items-center gap-2 text-[0.88rem] text-ink-soft pt-1">
            <input type="checkbox" checked={!!form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
            {t(lang, 'Use as default', 'Usar como predeterminada')}
          </label>
        </div>
        {error && <p className="mt-3 text-[0.82rem] text-ladrillo">{error}</p>}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button onClick={onClose} className="text-[0.88rem] text-ink-mute">{t(lang, 'Cancel', 'Cancelar')}</button>
          <button onClick={save} disabled={saving} className="rounded-full bg-ladrillo text-cream font-semibold px-5 py-2.5 disabled:opacity-55">{saving ? t(lang, 'Saving…', 'Guardando…') : t(lang, 'Save', 'Guardar')}</button>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ customer, lang, onSaved }: { customer: AccountSnapshot['customer']; lang: Lang; onSaved: () => void }) {
  const [name, setName] = useState(customer.name ?? '');
  const [phone, setPhone] = useState(customer.phone ?? '');
  const [marketing, setMarketing] = useState(customer.marketing_consent_email);
  const [tip, setTip] = useState<number | ''>(customer.default_tip_pct ?? '');
  const [bMonth, setBMonth] = useState<number | ''>(customer.birthday_month ?? '');
  const [bDay, setBDay] = useState<number | ''>(customer.birthday_day ?? '');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState('');

  const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const months = lang === 'es' ? MONTHS_ES : MONTHS_EN;
  const daysInMonth = (m: number) => new Date(2024, m, 0).getDate(); // 2024 leap year so Feb=29

  async function save() {
    setError('');
    // Birthday must be both or neither
    if ((bMonth === '' && bDay !== '') || (bMonth !== '' && bDay === '')) {
      setError(t(lang, 'Pick both month and day for your birthday.', 'Elige mes y día para tu cumpleaños.'));
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        marketing_consent_email: marketing,
        default_tip_pct: tip === '' ? undefined : Number(tip),
        birthday_month: bMonth === '' ? null : Number(bMonth),
        birthday_day:   bDay === ''   ? null : Number(bDay),
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title={t(lang, 'Profile', 'Perfil')}>
      <div className="space-y-2.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t(lang, 'Name', 'Nombre')} className="w-full rounded-xl border border-line bg-cream-card px-3 py-2.5" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t(lang, 'Phone', 'Teléfono')} className="w-full rounded-xl border border-line bg-cream-card px-3 py-2.5" />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min={0} max={35} value={tip} onChange={(e) => setTip(e.target.value === '' ? '' : Number(e.target.value))} placeholder={t(lang, 'Default tip %', 'Propina predeterminada %')} className="rounded-xl border border-line bg-cream-card px-3 py-2.5" />
          <div className="text-[0.82rem] text-ink-mute self-center">
            <strong>{customer.email}</strong>
          </div>
        </div>

        {/* Birthday — month + day only, no year */}
        <div className="pt-1.5">
          <div className="text-[0.72rem] uppercase tracking-[0.18em] text-ink-mute font-semibold mb-1.5">
            🎂 {t(lang, 'Birthday — get a free dessert each year', 'Cumpleaños — recibe un postre gratis cada año')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={bMonth}
              onChange={(e) => {
                const v = e.target.value === '' ? '' : Number(e.target.value);
                setBMonth(v);
                if (v !== '' && bDay !== '' && Number(bDay) > daysInMonth(Number(v))) setBDay('');
              }}
              className="rounded-xl border border-line bg-cream-card px-3 py-2.5"
            >
              <option value="">{t(lang, 'Month', 'Mes')}</option>
              {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select
              value={bDay}
              onChange={(e) => setBDay(e.target.value === '' ? '' : Number(e.target.value))}
              className="rounded-xl border border-line bg-cream-card px-3 py-2.5"
              disabled={bMonth === ''}
            >
              <option value="">{t(lang, 'Day', 'Día')}</option>
              {Array.from({ length: bMonth === '' ? 0 : daysInMonth(Number(bMonth)) }, (_, i) => i+1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-[0.88rem] text-ink-soft pt-1">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
          {t(lang, 'Email me about specials & news', 'Enviarme correos sobre promociones y noticias')}
        </label>
      </div>
      {error && <p className="mt-3 text-[0.82rem] text-ladrillo">{error}</p>}
      <div className="mt-5 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="rounded-full bg-ladrillo text-cream font-semibold px-5 py-2.5 disabled:opacity-55">
          {saving ? t(lang, 'Saving…', 'Guardando…') : t(lang, 'Save changes', 'Guardar cambios')}
        </button>
        {savedFlash && <span className="text-[0.82rem] text-limon font-semibold">{t(lang, '✓ Saved', '✓ Guardado')}</span>}
      </div>
    </Section>
  );
}
