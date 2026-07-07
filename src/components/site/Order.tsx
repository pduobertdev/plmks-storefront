import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Lang } from '../../lib/lang';
import { useLang, pick } from '../../lib/lang';
import { INFO, MENU, UI, HOURS } from '../../data/content';
import { asset, item, itemForDish } from '../../lib/assets';
import { fetchDisplayMenu, orderApiEnabled, submitOrder, fetchDeliveryQuote, extractCardMeta, fetchPaymentConfig, tokenizeCard, fetchDeliveryEnabled, fetchDeliveryMaxOrder, fetchPricingConfig, computeServiceFee, PRICING_DEFAULT, fetchTipConfig, TIP_DEFAULT, fetchStoreStatus, fetchPrepBuffer, type StoreHours } from '../../lib/orderApi';
import type { OrderMenuCategory, OrderMenuItem, DeliveryAddress, PaymentConfig, PricingConfig, TipConfig } from '../../lib/orderApi';
import { fetchAccount, toggleFavorite as apiToggleFavorite, reorderFromOrder } from '../../lib/customerAuth';
import type { AccountSnapshot } from '../../lib/customerAuth';
import { SiteNav } from './SiteNav';
import { SiteFooter } from './SiteFooter';
import { Cenefa, Chakana } from '../Cenefa';
import { EASE } from '../motion';
import { PhotoLightbox } from '../PhotoLightbox';
import DeliveryAreaMap from './DeliveryAreaMap';

type Line = { item: OrderMenuItem; qty: number; note?: string };

// localStorage key for the in-progress cart. We store only name→qty/note (never
// prices) so a restored cart always re-prices against the live menu.
const CART_KEY = 'pt_cart_v1';

const money = (n: number) => `$${n.toFixed(2)}`;

// Seal watermark scatter — multiply blend, matches menu page style
const ORDER_SEALS: { size: number; top: string; side: 'left' | 'right'; offset: string; opacity: number; rotate: number }[] = [
  // — far left —
  { size: 80,  top: '1%',   side: 'left', offset: '-2%', opacity: 0.18, rotate: -12 },
  { size: 112, top: '5%',   side: 'left', offset: '-3%', opacity: 0.15, rotate: 22  },
  { size: 64,  top: '10%',  side: 'left', offset: '-1%', opacity: 0.20, rotate: -30 },
  { size: 96,  top: '15%',  side: 'left', offset: '-3%', opacity: 0.16, rotate: 10  },
  { size: 56,  top: '20%',  side: 'left', offset: '-1%', opacity: 0.18, rotate: -18 },
  { size: 128, top: '25%',  side: 'left', offset: '-4%', opacity: 0.14, rotate: 35  },
  { size: 72,  top: '30%',  side: 'left', offset: '-2%', opacity: 0.19, rotate: -8  },
  { size: 88,  top: '36%',  side: 'left', offset: '-3%', opacity: 0.15, rotate: 20  },
  { size: 64,  top: '41%',  side: 'left', offset: '-1%', opacity: 0.18, rotate: -40 },
  { size: 104, top: '46%',  side: 'left', offset: '-3%', opacity: 0.16, rotate: 15  },
  { size: 56,  top: '51%',  side: 'left', offset: '-2%', opacity: 0.20, rotate: -22 },
  { size: 80,  top: '57%',  side: 'left', offset: '-2%', opacity: 0.15, rotate: 28  },
  { size: 112, top: '62%',  side: 'left', offset: '-4%', opacity: 0.17, rotate: -12 },
  { size: 64,  top: '68%',  side: 'left', offset: '-1%', opacity: 0.19, rotate: 38  },
  { size: 88,  top: '73%',  side: 'left', offset: '-3%', opacity: 0.16, rotate: -5  },
  { size: 56,  top: '79%',  side: 'left', offset: '-1%', opacity: 0.18, rotate: 25  },
  { size: 96,  top: '84%',  side: 'left', offset: '-3%', opacity: 0.15, rotate: -32 },
  { size: 72,  top: '89%',  side: 'left', offset: '-2%', opacity: 0.20, rotate: 12  },
  { size: 80,  top: '94%',  side: 'left', offset: '-2%', opacity: 0.17, rotate: -18 },
  { size: 56,  top: '98%',  side: 'left', offset: '-1%', opacity: 0.16, rotate: 30  },
  // — near left —
  { size: 48,  top: '3%',   side: 'left', offset: '10%', opacity: 0.17, rotate: 8   },
  { size: 64,  top: '8%',   side: 'left', offset: '12%', opacity: 0.15, rotate: -15 },
  { size: 56,  top: '14%',  side: 'left', offset: '9%',  opacity: 0.18, rotate: 22  },
  { size: 80,  top: '19%',  side: 'left', offset: '13%', opacity: 0.16, rotate: -28 },
  { size: 48,  top: '24%',  side: 'left', offset: '10%', opacity: 0.20, rotate: 12  },
  { size: 64,  top: '29%',  side: 'left', offset: '11%', opacity: 0.17, rotate: -5  },
  { size: 56,  top: '34%',  side: 'left', offset: '9%',  opacity: 0.15, rotate: 32  },
  { size: 48,  top: '39%',  side: 'left', offset: '12%', opacity: 0.19, rotate: -18 },
  { size: 80,  top: '44%',  side: 'left', offset: '10%', opacity: 0.16, rotate: 8   },
  { size: 56,  top: '49%',  side: 'left', offset: '9%',  opacity: 0.18, rotate: -35 },
  { size: 48,  top: '54%',  side: 'left', offset: '12%', opacity: 0.17, rotate: 20  },
  { size: 64,  top: '59%',  side: 'left', offset: '10%', opacity: 0.15, rotate: -10 },
  { size: 80,  top: '64%',  side: 'left', offset: '11%', opacity: 0.19, rotate: 28  },
  { size: 48,  top: '69%',  side: 'left', offset: '9%',  opacity: 0.16, rotate: -22 },
  { size: 64,  top: '74%',  side: 'left', offset: '12%', opacity: 0.18, rotate: 15  },
  { size: 56,  top: '79%',  side: 'left', offset: '10%', opacity: 0.17, rotate: -38 },
  { size: 80,  top: '84%',  side: 'left', offset: '9%',  opacity: 0.15, rotate: 5   },
  { size: 48,  top: '89%',  side: 'left', offset: '12%', opacity: 0.20, rotate: -25 },
  { size: 64,  top: '94%',  side: 'left', offset: '10%', opacity: 0.17, rotate: 18  },
  // — near right —
  { size: 56,  top: '2%',   side: 'right', offset: '11%', opacity: 0.16, rotate: -8  },
  { size: 80,  top: '7%',   side: 'right', offset: '9%',  opacity: 0.18, rotate: 18  },
  { size: 48,  top: '12%',  side: 'right', offset: '12%', opacity: 0.17, rotate: -30 },
  { size: 64,  top: '17%',  side: 'right', offset: '10%', opacity: 0.15, rotate: 10  },
  { size: 80,  top: '22%',  side: 'right', offset: '9%',  opacity: 0.19, rotate: -15 },
  { size: 48,  top: '27%',  side: 'right', offset: '11%', opacity: 0.17, rotate: 35  },
  { size: 64,  top: '32%',  side: 'right', offset: '10%', opacity: 0.16, rotate: -20 },
  { size: 56,  top: '37%',  side: 'right', offset: '12%', opacity: 0.18, rotate: 8   },
  { size: 80,  top: '42%',  side: 'right', offset: '9%',  opacity: 0.15, rotate: -38 },
  { size: 48,  top: '47%',  side: 'right', offset: '11%', opacity: 0.20, rotate: 22  },
  { size: 64,  top: '52%',  side: 'right', offset: '10%', opacity: 0.17, rotate: -12 },
  { size: 56,  top: '57%',  side: 'right', offset: '9%',  opacity: 0.18, rotate: 30  },
  { size: 80,  top: '62%',  side: 'right', offset: '12%', opacity: 0.16, rotate: -5  },
  { size: 48,  top: '67%',  side: 'right', offset: '10%', opacity: 0.19, rotate: 18  },
  { size: 64,  top: '72%',  side: 'right', offset: '11%', opacity: 0.17, rotate: -28 },
  { size: 56,  top: '77%',  side: 'right', offset: '9%',  opacity: 0.15, rotate: 12  },
  { size: 80,  top: '82%',  side: 'right', offset: '10%', opacity: 0.18, rotate: -40 },
  { size: 48,  top: '87%',  side: 'right', offset: '12%', opacity: 0.16, rotate: 25  },
  { size: 64,  top: '92%',  side: 'right', offset: '9%',  opacity: 0.20, rotate: -8  },
  { size: 56,  top: '97%',  side: 'right', offset: '11%', opacity: 0.17, rotate: 35  },
  // — far right —
  { size: 96,  top: '3%',   side: 'right', offset: '-3%', opacity: 0.16, rotate: 20  },
  { size: 64,  top: '8%',   side: 'right', offset: '-1%', opacity: 0.19, rotate: -15 },
  { size: 128, top: '13%',  side: 'right', offset: '-4%', opacity: 0.15, rotate: 30  },
  { size: 80,  top: '18%',  side: 'right', offset: '-2%', opacity: 0.17, rotate: -25 },
  { size: 56,  top: '23%',  side: 'right', offset: '-1%', opacity: 0.20, rotate: 8   },
  { size: 104, top: '28%',  side: 'right', offset: '-3%', opacity: 0.16, rotate: -38 },
  { size: 72,  top: '33%',  side: 'right', offset: '-2%', opacity: 0.18, rotate: 18  },
  { size: 88,  top: '38%',  side: 'right', offset: '-3%', opacity: 0.15, rotate: -10 },
  { size: 64,  top: '43%',  side: 'right', offset: '-1%', opacity: 0.19, rotate: 32  },
  { size: 112, top: '48%',  side: 'right', offset: '-4%', opacity: 0.16, rotate: -20 },
  { size: 80,  top: '53%',  side: 'right', offset: '-2%', opacity: 0.18, rotate: 12  },
  { size: 64,  top: '58%',  side: 'right', offset: '-1%', opacity: 0.17, rotate: -35 },
  { size: 96,  top: '63%',  side: 'right', offset: '-3%', opacity: 0.15, rotate: 22  },
  { size: 72,  top: '68%',  side: 'right', offset: '-2%', opacity: 0.19, rotate: -5  },
  { size: 88,  top: '73%',  side: 'right', offset: '-3%', opacity: 0.17, rotate: 38  },
  { size: 56,  top: '78%',  side: 'right', offset: '-1%', opacity: 0.20, rotate: -18 },
  { size: 104, top: '83%',  side: 'right', offset: '-4%', opacity: 0.15, rotate: 10  },
  { size: 80,  top: '88%',  side: 'right', offset: '-2%', opacity: 0.18, rotate: -30 },
  { size: 64,  top: '93%',  side: 'right', offset: '-1%', opacity: 0.16, rotate: 25  },
  { size: 96,  top: '98%',  side: 'right', offset: '-3%', opacity: 0.19, rotate: -12 },
];

/* ── category icon helpers (mirrors Menu.tsx) ─────────────────── */
const CAT_ICONS: [string[], string][] = [
  [['chicken', 'meat', 'carne', 'pollo'],   'M2 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zM5 3v10M11 3v10'],
  [['vegetarian', 'vegetal', 'verdura'],    'M4 6.5a2 2 0 1 1 4 0M8 6.5a2 2 0 1 1 4 0M6 8.5a2 2 0 1 1 4 0M8 10.5V14M6 14h4'],
  [['seafood', 'mariscos', 'pescado'],      'M1 7c1.5-2.5 3-3 4.5-3S8.5 6 10 7s3 3 4.5 3M1 11c1.5-2.5 3-3 4.5-3S8.5 10 10 11s3 3 4.5 3'],
  [['appetizer', 'entrada', 'aperitivo'],   'M5 1v6M7 1v6M9 1v6M7 7v8'],
  [['grill', 'stir', 'fry', 'wok'],  'M8 14c-3 0-5-2-5-5 0-2 1-4 2-5 0 2 1 3 2 3.5-.5-2 0-3.5 1-4.5 0 2 2 4 2 6 .5-1 .5-2 0-3 1.5 1.5 1 4-.5 5.5 1-.5 1.5-2 1.5-2.5'],
  [['soup', 'sopa', 'caldo'],               'M3 10h10M2 13h12l-.8 2H2.8L2 13zM6 7c0-1.5 1-2 1-3M10 7c0-1.5-1-2-1-3'],
  [['special', 'signature', 'featured', 'house'],                  'M8 1.5l1.6 4.5H15l-4 2.8 1.5 4.7L8 10.5l-4.5 3 1.5-4.7-4-2.8h5.4z'],
  [['side', 'antojo', 'acompaña'],          'M4 10c0 2.2 1.8 3 4 3s4-.8 4-3-1.8-3-4-3-4 .8-4 3zM1 13h14'],
  [['kid', 'niño', 'child'],                'M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM5.5 9c.5 1.2 1.4 2 2.5 2s2-.8 2.5-2M6 6.5h.1M10 6.5h.1'],
  [['dessert', 'postre', 'dulce', 'sweet'], 'M5 8a3 3 0 0 1 6 0H5zM5 8l3 7 3-7'],
  [['drink', 'bebida', 'jugo', 'beverage'],   'M5 2h6l-1 11H6L5 2zM4 5h8'],
  [['lunch', 'almuerzo', 'weekday'],        'M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 2v1M8 13v1M2 8h1M13 8h1M4.1 4.1l.7.7M11.2 11.2l.7.7M4.1 11.9l.7-.7M11.2 4.8l.7-.7'],
  [['breakfast', 'desayuno'],               'M4 11a4 4 0 0 1 8 0M2 11h12M8 7V5M5.5 7.5 4 6M10.5 7.5 12 6'],
];
function catIconPath(nameEn: string): string | null {
  const n = nameEn.toLowerCase();
  for (const [keys, path] of CAT_ICONS) if (keys.some((k) => n.includes(k))) return path;
  return null;
}

/* ── input helpers ────────────────────────────────────────────── */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/* ── time slot generator ──────────────────────────────────────────
 * Given today's open/close window from HOURS (day-of-week aware) and
 * the customer's current clock, return the picker options:
 *   - "ASAP (~30 min)" if we're currently open with enough runway
 *   - 15-min slots stepping up to 30 min before close
 *   - "Closed today" / "Opens at HH:MM" when outside hours
 * Times are parsed from the existing HOURS strings ("11:30 AM – 9:00 PM").
 * ────────────────────────────────────────────────────────────────── */
type TimeSlot = { label: string; value: string };

function parseTimeString(s: string): { h: number; m: number } | null {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3].toUpperCase();
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return { h, m: min };
}

function fmtSlot(h: number, m: number): string {
  const mer = h >= 12 ? 'PM' : 'AM';
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${mer}`;
}

// Live hours from admin Settings (restaurant-local), when configured.
type LiveHours = { closed: boolean; nowMin: number; openMin: number; closeMin: number };

function hhmmToMin(t: string): number {
  const [h, m] = t.split(':').map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

function buildTimeSlots(lang: Lang, pickupMinutes: number, live?: LiveHours | null): TimeSlot[] {
  let nowMin: number;
  let openMin: number;
  let closeMin: number;
  let openH: number;
  let openM: number;

  if (live) {
    // Manager-set hours win — uses the restaurant's clock, not the device's.
    if (live.closed) {
      return [{ label: lang === 'en' ? 'Closed today' : 'Cerrado hoy', value: 'closed' }];
    }
    nowMin = live.nowMin;
    openMin = live.openMin;
    closeMin = live.closeMin;
    openH = Math.floor(openMin / 60);
    openM = openMin % 60;
  } else {
    const now = new Date();
    const dow = now.getDay(); // 0 = Sun … 6 = Sat
    // HOURS is Mon..Sun (index 0..6). Map JS day-of-week.
    const hoursIdx = dow === 0 ? 6 : dow - 1;
    const todayRow = HOURS[hoursIdx];
    if (!todayRow) {
      return [{ label: lang === 'en' ? 'Closed today' : 'Cerrado hoy', value: 'closed' }];
    }

    const parts = todayRow.time.split(/[–-]/).map((s) => s.trim());
    const open = parseTimeString(parts[0]);
    const close = parseTimeString(parts[1] ?? '');
    if (!open || !close) {
      return [{ label: lang === 'en' ? 'ASAP (~30 min)' : 'Lo antes posible (~30 min)', value: 'asap' }];
    }

    nowMin = now.getHours() * 60 + now.getMinutes();
    openMin = open.h * 60 + open.m;
    closeMin = close.h * 60 + close.m;
    openH = open.h;
    openM = open.m;
  }
  const open = { h: openH, m: openM };

  // Before open today
  if (nowMin < openMin) {
    return [
      { label: lang === 'en' ? `Opens at ${fmtSlot(open.h, open.m)}` : `Abre a las ${fmtSlot(open.h, open.m)}`, value: 'opens_later' },
      ...generateSlots(openMin + pickupMinutes, closeMin - 30),
    ];
  }

  // After close
  if (nowMin >= closeMin - pickupMinutes) {
    return [{ label: lang === 'en' ? 'Closed for today — try tomorrow' : 'Cerrado por hoy — vuelve mañana', value: 'closed' }];
  }

  // Open now — first slot is ASAP, then time-stamped 15-min slots
  const firstSlotMin = roundUpToQuarter(nowMin + pickupMinutes + 5);
  return [
    { label: lang === 'en' ? `ASAP (~${pickupMinutes} min)` : `Lo antes posible (~${pickupMinutes} min)`, value: 'asap' },
    ...generateSlots(firstSlotMin, closeMin - 30),
  ];
}

function roundUpToQuarter(min: number): number {
  return Math.ceil(min / 15) * 15;
}

function generateSlots(fromMin: number, untilMin: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  // Cap at ~3 hours of forward slots so the picker doesn't get unwieldy
  const hardCap = fromMin + 180;
  for (let t = fromMin; t <= Math.min(untilMin, hardCap); t += 15) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const label = fmtSlot(h, m);
    slots.push({ label, value: label });
  }
  return slots;
}

export default function Order() {
  const [lang, setLang] = useLang();
  const [cart, setCart] = useState<Record<string, Line>>({});
  const [sheet, setSheet] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [menu, setMenu] = useState<OrderMenuCategory[] | null>(null);
  const [menuSource, setMenuSource] = useState<'static' | 'admin'>('static');
  const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'delivery'>('pickup');
  const [paymentCfg, setPaymentCfg] = useState<PaymentConfig | null>(null);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  // Food-subtotal ceiling for delivery (0 = no cap). Above it a courier
  // car can't fit the order, so we steer to pickup / catering.
  const [deliveryMaxOrder, setDeliveryMaxOrder] = useState(0);
  useEffect(() => { fetchPaymentConfig().then(setPaymentCfg); }, []);
  const [pricing, setPricing] = useState<PricingConfig>(PRICING_DEFAULT);
  useEffect(() => { fetchPricingConfig().then(setPricing); }, []);
  // Tip settings are admin-driven: pre-select the configured default % (or
  // None when tips are turned off).
  useEffect(() => {
    fetchTipConfig().then((cfg) => {
      setTipConfig(cfg);
      setTipChoice(cfg.enabled ? String(cfg.defaultPct) : 'none');
    });
  }, []);
  // Admin can hide delivery entirely (master kill-switch). If it's off
  // while a customer happens to be on Delivery, snap them back to Pickup.
  useEffect(() => {
    fetchDeliveryEnabled().then((on) => {
      setDeliveryEnabled(on);
      if (!on) setFulfillmentType('pickup');
    });
    fetchDeliveryMaxOrder().then(setDeliveryMaxOrder);
  }, []);
  // Master online-ordering switch from admin Settings. When the restaurant
  // pauses ordering we tell the customer up front (popup on load + a banner +
  // disabled "Add" buttons) instead of only at checkout.
  const [storePaused, setStorePaused] = useState(false);
  const [pauseMessage, setPauseMessage] = useState('');
  const [pauseDismissed, setPauseDismissed] = useState(false);
  const [storeHours, setStoreHours] = useState<StoreHours | null>(null);
  useEffect(() => {
    // Re-check store status periodically so an open tab recovers when the
    // manager un-pauses (and pauses) without the customer reloading.
    const check = () => fetchStoreStatus().then((s) => {
      setStorePaused(!s.accepting);
      if (!s.accepting) setPauseMessage(s.pauseMessage);
      setStoreHours(s.hours);
    });
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);
  const [prepBuffer, setPrepBuffer] = useState(0);
  useEffect(() => { fetchPrepBuffer().then(setPrepBuffer); }, []);
  // 0 until DoorDash quotes a real fee from the customer's address.
  const [deliveryFeeRate, setDeliveryFeeRate] = useState(0);
  const [tipConfig, setTipConfig] = useState<TipConfig>(TIP_DEFAULT);
  const [tipChoice, setTipChoice] = useState<string>('18'); // 'none' | 'custom' | a pct ('18')
  const [customTip, setCustomTip] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; pct: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const navRef = useRef<HTMLDivElement>(null);
  const cartHydratedRef = useRef(false);

  // Pull the customer's favorites so the heart icon on each dish shows
  // the right state. Silently no-ops for guests.
  useEffect(() => {
    fetchAccount().then((acc) => {
      if (!acc?.customer) return;
      setSignedIn(true);
      setAccount(acc);
      setFavIds(new Set(acc.favorites.map((f) => f.menu_item_id)));
    });
  }, []);

  async function onToggleFavorite(menuItemId: string) {
    if (!signedIn) {
      // Guests don't have a place to put favorites — send them to sign in.
      window.location.href = '/account';
      return;
    }
    const isOn = favIds.has(menuItemId);
    // Optimistic flip
    const next = new Set(favIds);
    if (isOn) next.delete(menuItemId); else next.add(menuItemId);
    setFavIds(next);
    try {
      await apiToggleFavorite(menuItemId, !isOn);
    } catch {
      // revert on failure
      setFavIds(favIds);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetchDisplayMenu()
      .then((apiMenu) => {
        if (cancelled) return;
        if (apiMenu) { setMenu(apiMenu); setMenuSource('admin'); }
      })
      .catch(() => { if (!cancelled) setMenu(MENU); });
    return () => { cancelled = true; };
  }, []);

  // Hydrate the cart from /order?reorder=<orderId>.
  // We wait for the menu to load so we can match each saved
  // menu_item_id (slug) against an OrderMenuItem.apiId and read its
  // current price/name (instead of trusting stale order data).
  // Fetching directly from the API survives new-tab opens and
  // accidental reloads in a way the old sessionStorage hand-off didn't.
  useEffect(() => {
    if (!menu) return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('reorder');
    if (!orderId) return;

    let cancelled = false;
    reorderFromOrder(orderId)
      .then((r) => {
        if (cancelled) return;
        const flat = menu.flatMap((c) => c.items);
        const next: Record<string, Line> = {};
        let added = 0;
        for (const i of r.items ?? []) {
          const match = flat.find(
            (mi) => mi.apiId && mi.apiId === i.menu_item_id,
          );
          if (!match) continue;
          const qty = Math.max(1, Number(i.quantity) || 1);
          next[match.name] = { item: match, qty };
          added += qty;
        }
        if (added === 0) {
          alert(t(lang, 'Those items are no longer available on the menu.', 'Esos platos ya no están en el menú.'));
        } else {
          setCart((c) => ({ ...c, ...next }));
          setSheet(true);
        }
        // Drop ?reorder= so a reload doesn't re-add items.
        const url = new URL(window.location.href);
        url.searchParams.delete('reorder');
        window.history.replaceState({}, '', url.toString());
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        alert(t(lang, 'Reorder failed: ', 'No se pudo reordenar: ') + ((e as Error)?.message ?? 'unknown'));
      });
    return () => { cancelled = true; };
  }, [menu, lang]);

  // Restore an in-progress cart after an accidental refresh. Matched by item
  // name against the freshly-loaded menu so prices stay current and any dish
  // that's since gone off the menu is dropped. Skipped when ?reorder= is
  // already driving the cart. Runs once, after the menu is available.
  useEffect(() => {
    if (!menu || cartHydratedRef.current) return;
    cartHydratedRef.current = true;
    if (new URLSearchParams(window.location.search).get('reorder')) return;
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Record<string, { qty: number; note?: string }>;
      const flat = menu.flatMap((c) => c.items);
      const restored: Record<string, Line> = {};
      for (const [name, v] of Object.entries(saved)) {
        const item = flat.find((mi) => mi.name === name);
        const qty = Math.max(0, Math.floor(Number(v?.qty) || 0));
        if (item && qty > 0) restored[name] = { item, qty, ...(v?.note ? { note: v.note } : {}) };
      }
      if (Object.keys(restored).length) setCart(restored);
    } catch { /* ignore corrupt/unavailable storage */ }
  }, [menu]);

  // Persist the cart on every change so a refresh doesn't lose it. Guarded on
  // the hydration flag so the initial empty cart can't wipe saved data before
  // the restore above has had a chance to run.
  useEffect(() => {
    if (!cartHydratedRef.current) return;
    try {
      const items = Object.values(cart);
      if (!items.length) { localStorage.removeItem(CART_KEY); return; }
      const slim: Record<string, { qty: number; note?: string }> = {};
      for (const l of items) slim[l.item.name] = { qty: l.qty, ...(l.note ? { note: l.note } : {}) };
      localStorage.setItem(CART_KEY, JSON.stringify(slim));
    } catch { /* storage full / unavailable */ }
  }, [cart]);

  // Track active section for the category nav
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id.replace(/^order-/, '')); }),
      { rootMargin: '-40% 0px -55% 0px' }
    );
    (menu ?? []).forEach((cat) => { const el = document.getElementById(`order-${cat.id}`); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [menu]);

  // Deep-link: after the async menu renders, scroll to #order-<id> from the URL.
  useEffect(() => {
    if (!menu || !menu.length) return;
    const hash = window.location.hash;
    if (!/^#order-/.test(hash)) return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return () => clearTimeout(t);
  }, [menu]);

  // Scroll active nav pill into view
  useEffect(() => {
    if (!navRef.current || !activeSection) return;
    const pill = navRef.current.querySelector(`[data-id="${activeSection}"]`) as HTMLElement | null;
    if (pill) pill.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeSection]);

  const add = (item: OrderMenuItem) =>
    setCart((c) => ({ ...c, [item.name]: { item, qty: (c[item.name]?.qty ?? 0) + 1 } }));
  const bump = (name: string, d: number) =>
    setCart((c) => {
      const cur = c[name];
      if (!cur) return c;
      const qty = cur.qty + d;
      if (qty <= 0) { const { [name]: _, ...rest } = c; return rest; }
      return { ...c, [name]: { ...cur, qty } };
    });
  // Per-item kitchen note — "medium", "no onions", "extra ají", etc.
  // Empty string clears the note. ~200 char ceiling enforced in UI.
  const setLineNote = (name: string, note: string) =>
    setCart((c) => {
      const cur = c[name];
      if (!cur) return c;
      return { ...c, [name]: { ...cur, note: note.slice(0, 200) || undefined } };
    });

  const applyCode = async () => {
    const key = couponInput.trim().toUpperCase();
    if (!key) return;
    try {
      const res = await fetch(`${import.meta.env.PUBLIC_ORDER_API_URL?.replace(/\/$/, '')}/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ code: key }),
      });
      const data = await res.json();
      if (data.valid) { setAppliedCoupon({ code: data.code, pct: data.discount_pct }); setCouponError(''); }
      else { setAppliedCoupon(null); setCouponError(lang === 'en' ? 'Invalid coupon code.' : 'Código inválido.'); }
    } catch {
      setCouponError(lang === 'en' ? 'Could not validate code.' : 'No se pudo validar el código.');
    }
  };
  const removeCode = () => { setAppliedCoupon(null); setCouponInput(''); setCouponError(''); };

  const lines = Object.values(cart);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = useMemo(() => lines.reduce((s, l) => s + parseFloat(l.item.price) * l.qty, 0), [lines]);
  const couponSaving = appliedCoupon ? subtotal * (appliedCoupon.pct / 100) : 0;
  const tax = (subtotal - couponSaving) * pricing.taxRate;
  const serviceFee = computeServiceFee(pricing.fee, subtotal - couponSaving, fulfillmentType);
  const deliveryFee = fulfillmentType === 'delivery' ? deliveryFeeRate : 0;
  // Tip — % of the pre-tax food subtotal (18% pre-selected), or a custom $, or none.
  const tipAmount = tipChoice === 'none'
    ? 0
    : tipChoice === 'custom'
      ? Math.max(0, parseFloat(customTip) || 0)
      : subtotal * (parseInt(tipChoice, 10) / 100);
  const total = subtotal - couponSaving + tax + serviceFee + deliveryFee;
  const checkoutTotal = total + tipAmount; // tip is chosen at checkout
  // Delivery order value (food + tax) over the cap → block delivery, steer to pickup.
  // Matches the server rule; tip + delivery fee are excluded so a big tipper isn't blocked.
  const deliveryOverCap = deliveryMaxOrder > 0 && fulfillmentType === 'delivery' && (subtotal + tax) > deliveryMaxOrder;

  return (
    <div>
      <SiteNav lang={lang} setLang={setLang} current="order"
        announcement={storePaused ? (
          <div className="flex h-10 items-center justify-center gap-2 bg-ladrillo px-4 text-center text-cream">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
            </svg>
            <span className="truncate text-[0.8rem] font-medium sm:text-[0.86rem]">
              {pauseMessage} {lang === 'en' ? 'Call' : 'Llama'}{' '}
              <a className="underline underline-offset-2" href={`tel:+1${INFO.phones[0].replace(/\D/g, '')}`}>{INFO.phones[0]}</a>{' '}
              {lang === 'en' ? 'to order.' : 'para ordenar.'}
            </span>
          </div>
        ) : undefined} />

      {/* Online-ordering paused — popup on load; the nav carries a persistent strip. */}
      {storePaused && !pauseDismissed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5"
             style={{ background: 'rgba(30,41,59,0.72)' }}
             onClick={() => setPauseDismissed(true)}>
          <div className="w-full max-w-md rounded-2xl border border-line bg-cream-card p-8 text-center shadow-2xl"
               onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full text-ladrillo"
                 style={{ background: 'rgba(191,74,37,0.12)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
              </svg>
            </div>
            <h2 className="display text-[1.6rem] font-semibold text-ink leading-tight">
              {lang === 'en' ? 'Online ordering is paused' : 'Pedidos en línea en pausa'}
            </h2>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-soft whitespace-pre-line">{pauseMessage}</p>
            <p className="mt-2 text-[0.86rem] text-ink-mute">
              {lang === 'en'
                ? 'You can still browse the menu — or call us to order.'
                : 'Puedes ver el menú — o llámanos para ordenar.'}
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <a href={`tel:+1${INFO.phones[0].replace(/\D/g, '')}`}
                 className="rounded-full bg-ladrillo px-6 py-3 font-semibold text-cream transition-opacity hover:opacity-90">
                {lang === 'en' ? `Call ${INFO.phones[0]}` : `Llamar ${INFO.phones[0]}`}
              </a>
              <button onClick={() => setPauseDismissed(true)}
                      className="rounded-full border border-line px-6 py-3 font-semibold text-ink transition-colors hover:bg-cream-deep">
                {lang === 'en' ? 'Browse the menu' : 'Ver el menú'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="relative">
        {/* Red seal watermark scatter */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
          {ORDER_SEALS.map((s, i) => (
            <img key={i} src={asset('seal.jpg')} alt=""
              style={{
                position: 'absolute', width: s.size, height: s.size,
                top: s.top, [s.side]: s.offset,
                opacity: s.opacity,
                transform: `rotate(${s.rotate}deg)`,
                mixBlendMode: 'multiply',
              }}
            />
          ))}
        </div>
        {/* header */}
        <header className="pt-[140px] pb-10 bg-cream-deep">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
            <p className="kicker text-ladrillo flex items-center gap-3">
              <Chakana size={13} />
              {lang === 'en' ? 'Order Online' : 'Pedidos en Línea'}
            </p>
            <h1 className="display mt-3 text-[clamp(3rem,8vw,6rem)] font-semibold text-ink leading-[0.95]">
              {lang === 'en' ? 'Build your order' : 'Arma tu pedido'}
            </h1>

            {/* pickup / delivery toggle */}
            <div className="mt-5 flex items-center gap-1 rounded-full border border-line bg-cream-card p-1 w-fit">
              {(deliveryEnabled ? (['pickup', 'delivery'] as const) : (['pickup'] as const)).map((type) => (
                <button
                  key={type}
                  onClick={() => setFulfillmentType(type)}
                  className={`rounded-full px-5 py-2 text-[0.88rem] font-semibold transition-all duration-200 ${
                    fulfillmentType === type
                      ? 'bg-ladrillo text-cream shadow-sm'
                      : 'text-ink-mute hover:text-ink'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      {type === 'pickup'
                        ? <path d="M5 6V5a3 3 0 0 1 6 0v1M4 6h8l-1 8H5L4 6z" />
                        : <path d="M2 11h12M3 11l1-4h8l1 4M6 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM10 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />}
                    </svg>
                    {type === 'pickup'
                      ? (lang === 'en' ? 'Pickup' : 'Recoger')
                      : (lang === 'en' ? 'Delivery' : 'Delivery')}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[0.92rem] text-ink-soft">
              {fulfillmentType === 'pickup' ? (
                <>
                  <span><strong className="text-ink">{lang === 'en' ? 'Pickup at' : 'Recoger en'}:</strong> {INFO.address.street}, {INFO.address.city}</span>
                  <span><strong className="text-ink">{lang === 'en' ? 'Ready in' : 'Listo en'}:</strong> ~{INFO.pickupMinutes + prepBuffer} min</span>
                </>
              ) : (
                <>
                  <span><strong className="text-ink">{lang === 'en' ? 'Delivery via' : 'Entrega por'}:</strong> {lang === 'en' ? 'DoorDash or Uber' : 'DoorDash o Uber'}</span>
                  <span className="text-[0.82rem] text-ink-mute">
                    {lang === 'en'
                      ? 'Fee and ETA are quoted live based on your address at checkout.'
                      : 'La tarifa y el tiempo se cotizan en vivo según tu dirección al pagar.'}
                  </span>
                </>
              )}
              <span><strong className="text-ink">{lang === 'en' ? 'Today' : 'Hoy'}:</strong> {(() => {
                const td = storeHours?.today;
                if (td && !td.closed && td.open && td.close) {
                  const [oh, om] = td.open.split(':').map(Number);
                  const [ch, cm] = td.close.split(':').map(Number);
                  return `${fmtSlot(oh, om)} – ${fmtSlot(ch, cm)}`;
                }
                if (td?.closed) return lang === 'en' ? 'Closed today' : 'Cerrado hoy';
                return HOURS[(new Date().getDay() + 6) % 7]?.time ?? '';
              })()}</span>
              {menuSource === 'admin' && (
                <span><strong className="text-ink">{lang === 'en' ? 'Menu' : 'Carta'}:</strong> {lang === 'en' ? 'Live from admin' : 'Desde el admin'}</span>
              )}
            </div>
          </div>
        </header>
        <div className="text-line"><Cenefa weight={1.6} /></div>

        {/* sticky category nav — scrollable on mobile */}
        <div
          ref={navRef}
          className="sticky z-30 border-b border-line overflow-x-auto flex no-bar"
          style={{ top: storePaused ? 126 : 86, backgroundColor: 'var(--color-cream-deep)' }}
        >
          <div className="flex gap-0.5 px-3 py-2 mx-auto">
            {(menu ?? []).map((cat) => {
              const iconPath = catIconPath(cat.name.en ?? '');
              const isActive = activeSection === cat.id;
              return (
                <a
                  key={cat.id}
                  href={`#order-${cat.id}`}
                  data-id={cat.id}
                  className="shrink-0 flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[0.7rem] font-medium tracking-wide transition-colors duration-200 whitespace-nowrap"
                  style={{
                    backgroundColor: isActive ? 'var(--color-ink)' : 'transparent',
                    color: isActive ? 'var(--color-cream)' : 'var(--color-ink-mute)',
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`order-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setActiveSection(cat.id);
                  }}
                >
                  {iconPath && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                         style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }}>
                      <path d={iconPath} />
                    </svg>
                  )}
                  {pick(cat.name, lang)}
                </a>
              );
            })}
          </div>
        </div>

        {/* body */}
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 py-12 grid lg:grid-cols-[1fr_360px] gap-10 lg:gap-14 items-start">
          <div className="min-w-0">
            {menu === null ? (
              <div className="space-y-4 py-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex gap-4 rounded-[1.1rem] border border-line bg-cream-card p-3.5 animate-pulse">
                    <div className="h-[88px] w-[88px] shrink-0 rounded-[0.8rem] bg-ink/10" />
                    <div className="flex-1 space-y-2.5 py-1">
                      <div className="h-4 w-2/3 rounded-full bg-ink/10" />
                      <div className="h-3 w-full rounded-full bg-ink/10" />
                      <div className="h-3 w-1/3 rounded-full bg-ink/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : menu.map((cat, i) => {
              const availableNow = cat.availableNow !== false;
              return (
                <section key={cat.id} id={`order-${cat.id}`} className="mb-14 scroll-mt-[130px]">
                  {/* compact section photo header */}
                  <div className="relative h-28 sm:h-36 overflow-hidden rounded-[1.2rem] mb-5">
                    <img
                      src={asset(`sections/${cat.photo}.jpg`)}
                      alt={pick(cat.name, lang)}
                      loading={i < 2 ? 'eager' : 'lazy'}
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${availableNow ? '' : 'opacity-70'}`}
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(30,41,59,0.88) 0%,rgba(30,41,59,0.45) 55%,rgba(30,41,59,0) 100%)' }} />
                    <div className="absolute inset-0 flex items-center px-6">
                      <div>
                        <h2 className="display text-[1.7rem] sm:text-[2rem] font-semibold text-cream leading-none">{pick(cat.name, lang)}</h2>
                        {cat.blurb && <p className="mt-1 font-display italic text-[0.82rem] text-cream/70">{pick(cat.blurb, lang)}</p>}
                      </div>
                    </div>
                    {!availableNow && (
                      <span className="absolute top-3 right-4 flex items-center gap-1.5 rounded-full bg-ink/75 text-cream text-[0.68rem] font-medium px-3 py-1.5 tracking-wide">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                        </svg>
                        {lang === 'en' ? 'Not available now' : 'No disponible ahora'}
                      </span>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {cat.items.map((it) => {
                      const slug = it.apiId ?? null;
                      return (
                        <OrderCard key={it.name} it={it} cat={cat.photo} lang={lang} qty={cart[it.name]?.qty ?? 0}
                                   disabled={!availableNow || storePaused}
                                   favored={slug ? favIds.has(slug) : false}
                                   onToggleFavorite={slug ? () => onToggleFavorite(slug) : undefined}
                                   onAdd={() => add(it)} onBump={(d) => bump(it.name, d)} />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <aside data-lenis-prevent className="hidden lg:block sticky overflow-y-auto modal-scroll"
                 style={{ top: storePaused ? 196 : 156, maxHeight: `calc(100dvh - ${storePaused ? 196 : 156}px - 16px)` }}>
            <CartPanel lang={lang} lines={lines} subtotal={subtotal} tax={tax} serviceFee={serviceFee} serviceFeeLabel={pricing.fee.label} total={checkout ? checkoutTotal : total} tip={checkout ? tipAmount : 0}
                       deliveryFee={deliveryFee} fulfillmentType={fulfillmentType}
                       setFulfillmentType={setFulfillmentType}
                       deliveryEnabled={deliveryEnabled}
                       setLineNote={setLineNote}
                       couponInput={couponInput} setCouponInput={setCouponInput}
                       appliedCoupon={appliedCoupon} couponSaving={couponSaving}
                       couponError={couponError} applyCode={applyCode} removeCode={removeCode}
                       bump={bump} onCheckout={() => setCheckout(true)}
                       deliveryOverCap={deliveryOverCap} deliveryMaxOrder={deliveryMaxOrder}
                       paymentMode={paymentCfg?.configured ? paymentCfg.mode : null} />
          </aside>
        </div>
      </main>

      {/* mobile cart bar */}
      <AnimatePresence>
        {count > 0 && !sheet && !checkout && (
          <motion.button
            onClick={() => setSheet(true)}
            className="lg:hidden fixed bottom-4 inset-x-4 z-40 flex items-center justify-between rounded-full bg-ladrillo text-cream px-6 py-4 shadow-xl"
            initial={{ y: 90 }} animate={{ y: 0 }} exit={{ y: 90 }} transition={{ duration: 0.4, ease: EASE }}
          >
            <span className="font-semibold">{count} {lang === 'en' ? 'in order' : 'en pedido'}</span>
            <span className="font-semibold flex items-center gap-2">{money(total)} · {pick(UI.viewCart, lang)} →</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* mobile cart sheet */}
      <AnimatePresence>
        {sheet && (
          <motion.div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/60" onClick={() => setSheet(false)} />
            <motion.div data-lenis-prevent
                        className="modal-scroll relative bg-cream rounded-t-[1.8rem] max-h-[85dvh] overflow-y-auto overscroll-contain p-5"
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ duration: 0.42, ease: EASE }}>
              <div className="mx-auto h-1.5 w-12 rounded-full bg-line mb-4" />
              <CartPanel lang={lang} lines={lines} subtotal={subtotal} tax={tax} serviceFee={serviceFee} serviceFeeLabel={pricing.fee.label} total={checkout ? checkoutTotal : total} tip={checkout ? tipAmount : 0}
                         deliveryFee={deliveryFee} fulfillmentType={fulfillmentType}
                         setFulfillmentType={setFulfillmentType}
                         couponInput={couponInput} setCouponInput={setCouponInput}
                         appliedCoupon={appliedCoupon} couponSaving={couponSaving}
                         couponError={couponError} applyCode={applyCode} removeCode={removeCode}
                         bump={bump} onCheckout={() => { setSheet(false); setCheckout(true); }}
                         deliveryOverCap={deliveryOverCap} deliveryMaxOrder={deliveryMaxOrder}
                         paymentMode={paymentCfg?.configured ? paymentCfg.mode : null} bare />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* checkout */}
      <AnimatePresence>
        {checkout && (
          <Checkout lang={lang} total={checkoutTotal} subtotal={subtotal} tax={tax} serviceFee={serviceFee} serviceFeeLabel={pricing.fee.label} count={count}
                    lines={lines} deliveryFee={deliveryFee} deliveryFeeRate={deliveryFeeRate}
                    tipConfig={tipConfig} tipChoice={tipChoice} setTipChoice={setTipChoice} customTip={customTip} setCustomTip={setCustomTip} tipAmount={tipAmount}
                    couponCode={appliedCoupon?.code} couponSaving={couponSaving}
                    fulfillmentType={fulfillmentType} setFulfillmentType={setFulfillmentType}
                    deliveryEnabled={deliveryEnabled}
                    storeHours={storeHours}
                    prepBuffer={prepBuffer}
                    account={account}
                    onLiveQuote={(fee) => setDeliveryFeeRate(fee)}
                    onClose={() => setCheckout(false)}
                    onDone={() => { setCart({}); setCheckout(false); setAppliedCoupon(null); setCouponInput(''); }} />
        )}
      </AnimatePresence>

      <SiteFooter lang={lang} />
    </div>
  );
}

/* ── order card ───────────────────────────────────────────────── */
function OrderCard({ it, cat, lang, qty, onAdd, onBump, disabled, favored, onToggleFavorite }: {
  it: OrderMenuItem; cat: string; lang: Lang; qty: number;
  disabled?: boolean;
  favored?: boolean;
  onToggleFavorite?: () => void;
  onAdd: () => void; onBump: (d: number) => void;
}) {
  const [lightbox, setLightbox] = useState(false);
  const close = useCallback(() => setLightbox(false), []);
  const photoSrc = it.photoUrl || (it.apiId ? item(it.apiId) : itemForDish(it.name));

  return (
    <article className={`flex gap-4 rounded-[1.1rem] border p-3.5 transition-colors duration-300 ${it.isFavorite ? 'bg-ladrillo/10 border-ladrillo/35' : 'bg-cream-card border-line'} ${disabled ? '' : it.isFavorite ? 'hover:border-ladrillo/60' : 'hover:border-ladrillo/50'}`}>
      <button
        onClick={() => setLightbox(true)}
        className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[0.8rem] cursor-zoom-in"
        aria-label={`View photo of ${it.name}`}
      >
        <img
          src={photoSrc}
          alt={it.name}
          loading="lazy"
          className={`h-full w-full object-cover transition-all duration-300 hover:scale-105 ${disabled ? 'opacity-60' : ''}`}
          onError={(e) => {
            const img = e.currentTarget;
            const fallback = asset('logo-red.png');
            if (img.src.endsWith('logo-red.png')) return;
            img.src = fallback;
            img.classList.remove('object-cover');
            img.classList.add('object-contain', 'p-3', 'bg-cream-deep');
          }}
        />
      </button>
      {lightbox && <PhotoLightbox src={photoSrc} name={it.name} onClose={close} />}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="font-display text-[1.08rem] font-semibold text-ink leading-tight flex-1 min-w-0">{it.name}</h3>
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={favored ? (lang === 'en' ? 'Remove from favorites' : 'Quitar de favoritos') : (lang === 'en' ? 'Save to favorites' : 'Guardar en favoritos')}
              title={favored ? (lang === 'en' ? 'Saved to your favorites' : 'Guardado en tus favoritos') : (lang === 'en' ? 'Save for one-tap reorder' : 'Guardar para reorden rápido')}
              className="shrink-0 -m-1 p-1 transition-transform duration-200 hover:scale-110"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden
                   fill={favored ? 'var(--color-ladrillo)' : 'none'}
                   stroke={favored ? 'var(--color-ladrillo)' : 'var(--color-ink-mute, #8a7e6a)'}
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          )}
          {it.isFavorite && (
            <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-ladrillo text-cream text-[0.65rem] font-semibold px-2 py-0.5 leading-none tracking-wide mt-0.5">
              ★ Favorite
            </span>
          )}
        </div>
        <p className="text-[0.82rem] text-ink-mute leading-snug mt-0.5 line-clamp-2">{pick(it.desc, lang)}</p>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="numeral font-semibold text-ladrillo">${it.price}</span>
          {qty === 0 ? (
            <button onClick={disabled ? undefined : onAdd} disabled={disabled}
                    className="rounded-full bg-ink text-cream text-[0.8rem] font-semibold px-4 py-1.5 transition-transform duration-200 enabled:hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed">
              + {pick(UI.addToCart, lang)}
            </button>
          ) : (
            <Stepper qty={qty} onBump={onBump} />
          )}
        </div>
      </div>
    </article>
  );
}

function Stepper({ qty, onBump }: { qty: number; onBump: (d: number) => void }) {
  return (
    <div className="flex items-center gap-2.5 rounded-full bg-ink text-cream px-2 py-1">
      <button onClick={() => onBump(-1)} className="h-6 w-6 grid place-items-center text-[1.1rem] leading-none hover:text-aji">–</button>
      <span className="numeral text-[0.9rem] font-semibold w-4 text-center">{qty}</span>
      <button onClick={() => onBump(1)} className="h-6 w-6 grid place-items-center text-[1.1rem] leading-none hover:text-aji">+</button>
    </div>
  );
}

/* ── cart panel ───────────────────────────────────────────────── */
function CartPanel({ lang, lines, subtotal, tax, serviceFee = 0, serviceFeeLabel = 'Service Fee', total, tip = 0, deliveryFee, fulfillmentType, setFulfillmentType, deliveryEnabled = true,
  deliveryOverCap = false, deliveryMaxOrder = 0,
  couponInput, setCouponInput, appliedCoupon, couponSaving, couponError, applyCode, removeCode,
  bump, setLineNote, onCheckout, paymentMode, bare }: {
  lang: Lang; lines: Line[]; subtotal: number; tax: number; serviceFee?: number; serviceFeeLabel?: string; total: number; tip?: number;
  deliveryFee: number; fulfillmentType: 'pickup' | 'delivery';
  setFulfillmentType?: (t: 'pickup' | 'delivery') => void;
  deliveryEnabled?: boolean;
  deliveryOverCap?: boolean; deliveryMaxOrder?: number;
  couponInput: string; setCouponInput: (v: string) => void;
  appliedCoupon: { code: string; pct: number } | null;
  couponSaving: number; couponError: string;
  applyCode: () => void; removeCode: () => void;
  bump: (name: string, d: number) => void;
  setLineNote?: (name: string, note: string) => void;
  onCheckout: () => void;
  paymentMode?: 'sandbox' | 'production' | null;
  bare?: boolean;
}) {
  const empty = lines.length === 0;
  const typeLabel = fulfillmentType === 'delivery'
    ? (lang === 'en' ? 'Delivery' : 'Delivery')
    : (lang === 'en' ? 'Pickup' : 'Para llevar');

  return (
    <div className={bare ? '' : 'rounded-[1.4rem] border border-line bg-cream-card overflow-hidden'}>
      {!bare && <div className="text-ladrillo"><Cenefa weight={2.2} /></div>}
      <div className={bare ? '' : 'p-5'}>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[1.4rem] font-semibold text-ink">
            {lang === 'en' ? 'Your Order' : 'Tu Pedido'}
          </h2>
          <span className="kicker text-[0.62rem] text-ink-mute">{typeLabel}</span>
        </div>

        {empty ? (
          <p className="mt-6 mb-2 text-[0.92rem] text-ink-mute text-center py-8">
            {lang === 'en' ? 'Your order is empty — add a dish to begin.' : 'Tu pedido está vacío — agrega un plato.'}
          </p>
        ) : (
          <ul className="mt-4 space-y-3 pr-1">
            {lines.map((l) => (
              <li key={l.item.name} className="flex flex-col gap-1.5">
                <div className="flex gap-3 items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-[1rem] font-semibold text-ink leading-tight">{l.item.name}</p>
                    <p className="numeral text-[0.82rem] text-ink-mute">${l.item.price}</p>
                  </div>
                  <Stepper qty={l.qty} onBump={(d) => bump(l.item.name, d)} />
                  <span className="numeral text-[0.9rem] font-semibold text-ink w-14 text-right">
                    {money(parseFloat(l.item.price) * l.qty)}
                  </span>
                </div>
                {setLineNote && (
                  <CartLineNote
                    lang={lang}
                    value={l.note ?? ''}
                    onChange={(v) => setLineNote(l.item.name, v)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        {/* coupon */}
        <div className="mt-4 pt-4 border-t border-line">
          {appliedCoupon ? (
            <div className="flex items-center justify-between rounded-xl bg-limon/10 border border-limon/30 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-limon shrink-0">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
                <span className="text-[0.82rem] font-semibold text-ink">
                  {appliedCoupon.code} <span className="text-limon">−{appliedCoupon.pct}%</span>
                </span>
              </div>
              <button onClick={removeCode} className="text-[0.75rem] text-ink-mute hover:text-ladrillo transition-colors">
                {lang === 'en' ? 'Remove' : 'Quitar'}
              </button>
            </div>
          ) : (
            <div>
              <p className="kicker text-[0.6rem] text-ink-mute mb-1.5">
                {lang === 'en' ? 'Promo code' : 'Código promocional'}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Enter code' : 'Ingresa código'}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyCode(); }}
                  className="flex-1 min-w-0 rounded-xl border border-line bg-cream px-3 py-2 text-[0.88rem] text-ink placeholder:text-ink-faint focus:border-ladrillo focus:outline-none transition-colors font-mono tracking-wider"
                />
                <button
                  onClick={applyCode}
                  disabled={!couponInput.trim()}
                  className="shrink-0 rounded-xl bg-ink text-cream text-[0.8rem] font-semibold px-3.5 py-2 disabled:opacity-40 hover:bg-ink/80 transition-colors"
                >
                  {lang === 'en' ? 'Apply' : 'Aplicar'}
                </button>
              </div>
              {couponError && (
                <p className="mt-1.5 text-[0.75rem] text-ladrillo">{couponError}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-line space-y-1.5 text-[0.9rem]">
          <Row label={lang === 'en' ? 'Subtotal' : 'Subtotal'} value={money(subtotal)} />
          {couponSaving > 0 && (
            <div className="flex justify-between text-limon font-medium">
              <span>{lang === 'en' ? `Coupon (${appliedCoupon!.pct}% off)` : `Cupón (${appliedCoupon!.pct}% dto.)`}</span>
              <span className="numeral">−{money(couponSaving)}</span>
            </div>
          )}
          <Row label={lang === 'en' ? 'Estimated tax' : 'Impuesto estimado'} value={money(tax)} />
          {serviceFee > 0 && (
            <Row label={serviceFeeLabel} value={money(serviceFee)} />
          )}
          {deliveryFee > 0 && (
            <Row label={lang === 'en' ? 'Delivery fee' : 'Costo de entrega'} value={money(deliveryFee)} />
          )}
          {tip > 0 && (
            <Row label={lang === 'en' ? 'Tip' : 'Propina'} value={money(tip)} />
          )}
          <div className="flex justify-between pt-2 mt-1 border-t border-line">
            <span className="font-display text-[1.15rem] font-semibold text-ink">Total</span>
            <span className="numeral text-[1.15rem] font-semibold text-ladrillo">{money(total)}</span>
          </div>
        </div>

        {setFulfillmentType && deliveryEnabled && (
          <div className="mt-4 grid grid-cols-2 gap-2 p-1 rounded-full bg-cream border border-line">
            {(['pickup', 'delivery'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFulfillmentType(type)}
                className={`rounded-full py-2 text-[0.82rem] font-semibold transition-colors ${
                  fulfillmentType === type
                    ? 'bg-ladrillo text-cream'
                    : 'text-ink-mute hover:text-ink'
                }`}
              >
                {type === 'pickup'
                  ? (lang === 'en' ? 'Pickup' : 'Para llevar')
                  : (lang === 'en' ? 'Delivery' : 'Entrega')}
              </button>
            ))}
          </div>
        )}

        {deliveryOverCap && (
          <div className="mt-3 rounded-xl border border-ladrillo/40 bg-ladrillo/8 px-3.5 py-3 text-[0.82rem] text-ink leading-snug">
            {lang === 'en'
              ? <>Orders over <strong>${deliveryMaxOrder.toFixed(0)}</strong> are too large for delivery. Switch to <strong>Pickup</strong>, or call us at <a href="tel:+10000000000" className="underline text-ladrillo">(000) 000-0000</a> for catering.</>
              : <>Los pedidos de más de <strong>${deliveryMaxOrder.toFixed(0)}</strong> son muy grandes para entrega. Elige <strong>Para llevar</strong>, o llámanos al <a href="tel:+10000000000" className="underline text-ladrillo">(000) 000-0000</a> para catering.</>}
          </div>
        )}

        <button
          onClick={onCheckout}
          disabled={empty || deliveryOverCap}
          className="mt-3 w-full rounded-full bg-ladrillo text-cream font-semibold py-3.5 transition-all duration-300 enabled:hover:bg-ladrillo-deep disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pick(UI.checkout, lang)} {!empty && !deliveryOverCap && '→'}
        </button>
        {paymentMode === 'sandbox' ? (
          <p className="mt-2.5 text-[0.72rem] text-ink-faint text-center">
            {lang === 'en'
              ? 'Sandbox mode — test cards only, no real charges.'
              : 'Modo sandbox — sólo tarjetas de prueba, sin cargos reales.'}
          </p>
        ) : !paymentMode ? (
          <p className="mt-2.5 text-[0.72rem] text-ink-faint text-center">
            {lang === 'en'
              ? 'Demo ordering flow — no payment is processed.'
              : 'Flujo de pedido demostrativo — no se procesa ningún pago.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-soft">
      <span>{label}</span>
      <span className="numeral">{value}</span>
    </div>
  );
}

/* ── Per-item kitchen note ──────────────────────────────────────
 * Hidden by default ("+ note"). Click expands a small textarea that
 * auto-saves on change. Common kitchen-friendly cues: "medium",
 * "no onions", "extra ají", "gluten free if possible".
 * ─────────────────────────────────────────────────────────────── */
function CartLineNote({ lang, value, onChange }: { lang: Lang; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(value.length > 0);
  const placeholder = lang === 'en'
    ? 'e.g. medium, no onions, extra ají'
    : 'ej. al gusto, sin cebolla, ají aparte';
  if (! open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-[0.72rem] text-ink-mute hover:text-ladrillo underline transition-colors"
      >
        + {lang === 'en' ? 'add note for the kitchen' : 'agregar nota para la cocina'}
      </button>
    );
  }
  return (
    <div className="rounded-lg bg-cream-deep/40 border border-line p-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={200}
        rows={2}
        className="w-full bg-transparent text-[0.82rem] text-ink placeholder:text-ink-faint resize-none focus:outline-none"
        autoFocus
      />
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[0.66rem] text-ink-faint">{value.length}/200</span>
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false); }}
          className="text-[0.66rem] text-ladrillo underline hover:text-ladrillo-deep"
        >
          {lang === 'en' ? 'clear' : 'borrar'}
        </button>
      </div>
    </div>
  );
}

/* ── checkout flow ────────────────────────────────────────────── */
type DoordashResult = { delivery_id: string; tracking_url: string | null; eta_minutes: number; demo: boolean } | null;

function Checkout({ lang, total, subtotal, tax, serviceFee = 0, serviceFeeLabel = 'Service Fee', count, lines, deliveryFee, deliveryFeeRate,
  tipConfig, tipChoice, setTipChoice, customTip, setCustomTip, tipAmount, couponCode, couponSaving,
  fulfillmentType, setFulfillmentType, deliveryEnabled = true, storeHours, prepBuffer = 0, account, onLiveQuote, onClose, onDone }: {
  lang: Lang; total: number; subtotal: number; tax: number; serviceFee?: number; serviceFeeLabel?: string; count: number;
  lines: Line[]; deliveryFee: number; deliveryFeeRate: number; couponCode?: string; couponSaving: number;
  tipConfig: TipConfig; tipChoice: string; setTipChoice: (c: string) => void;
  customTip: string; setCustomTip: (v: string) => void; tipAmount: number;
  fulfillmentType: 'pickup' | 'delivery';
  setFulfillmentType: (t: 'pickup' | 'delivery') => void;
  deliveryEnabled?: boolean;
  storeHours?: StoreHours | null;
  prepBuffer?: number;
  account?: AccountSnapshot | null;
  onLiveQuote?: (fee: number) => void;
  onClose: () => void; onDone: () => void;
}) {
  const [step, setStep] = useState<'details' | 'payment' | 'done'>('details');
  const [details, setDetails] = useState({ name: '', email: '', phone: '', requestedTime: 'asap' });
  const [address, setAddress] = useState<DeliveryAddress>({ street: '', apt: '', city: '', zip: '' });

  // Pre-fill from the signed-in customer when we have one. Picks the default
  // address (or first address) for delivery. Runs once on first account arrival
  // so the customer can still edit fields manually after.
  const hasPrefilled = useRef(false);
  useEffect(() => {
    if (hasPrefilled.current) return;
    if (!account?.customer) return;
    const c = account.customer;
    setDetails((d) => ({
      ...d,
      name: d.name || c.name || '',
      email: d.email || c.email || '',
      phone: d.phone || c.phone || '',
    }));
    const defaultAddr = account.addresses.find((a) => a.is_default) ?? account.addresses[0];
    if (defaultAddr) {
      setAddress((a) => ({
        street: a.street || defaultAddr.line1,
        apt:    a.apt    || (defaultAddr.line2 ?? ''),
        city:   a.city   || defaultAddr.city,
        zip:    a.zip    || defaultAddr.zip,
      }));
    }
    // A signed-in customer's saved tip preference wins over the house default.
    if (c.default_tip_pct != null && tipConfig.enabled) {
      setTipChoice(c.default_tip_pct === 0 ? 'none' : String(c.default_tip_pct));
    }
    hasPrefilled.current = true;
  }, [account]);
  const [card, setCard] = useState({ number: '', exp: '', cvc: '' });
  const cardMeta = extractCardMeta(card.number);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState(`PT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [doordash, setDoordash] = useState<DoordashResult>(null);
  const [dispatchDisabled, setDispatchDisabled] = useState(false);
  const [paymentCfg, setPaymentCfg] = useState<PaymentConfig | null>(null);
  useEffect(() => { fetchPaymentConfig().then(setPaymentCfg); }, []);
  const liveCharges = !!paymentCfg?.configured;

  // Live DoorDash quote — fires when the address is fully entered, debounced.
  const [quote, setQuote] = useState<{ fee: number; etaMinutes: number; source: 'doordash' | 'shipday' | 'fallback' | 'out_of_range' } | null>(null);
  const [quoting, setQuoting] = useState(false);
  useEffect(() => {
    if (fulfillmentType !== 'delivery') return;
    if (!address.street.trim() || !address.city.trim() || !address.zip.trim()) {
      setQuote(null);
      return;
    }
    setQuoting(true);
    const handle = setTimeout(async () => {
      const q = await fetchDeliveryQuote(address);
      if (q) {
        setQuote(q);
        onLiveQuote?.(q.fee);
      }
      setQuoting(false);
    }, 600);
    return () => { clearTimeout(handle); setQuoting(false); };
  }, [fulfillmentType, address.street, address.city, address.zip, address.apt]);

  // Manager-set hours (restaurant-local) when configured; else fall back to the
  // static table + device clock. null today = "always open" → fall back too.
  const liveHours = useMemo<LiveHours | null>(() => {
    const td = storeHours?.today;
    if (!storeHours || !td) return null;
    if (td.closed) return { closed: true, nowMin: 0, openMin: 0, closeMin: 0 };
    if (!td.open || !td.close) return null; // open all day → fall back
    return { closed: false, nowMin: hhmmToMin(storeHours.now), openMin: hhmmToMin(td.open), closeMin: hhmmToMin(td.close) };
  }, [storeHours]);

  const times = useMemo(() => {
    const all = buildTimeSlots(lang, INFO.pickupMinutes + prepBuffer, liveHours);
    // Delivery is ASAP-only — a courier can't reliably honor a scheduled
    // window, so we don't offer future slots. Pickup keeps the full picker
    // (the kitchen times it). all[0] is ASAP when open, or the closed message.
    return fulfillmentType === 'delivery' ? all.slice(0, 1) : all;
  }, [lang, fulfillmentType, liveHours]);

  // Delivery can close before pickup (manager-set cutoff). When it's past the
  // delivery window, steer the customer to pickup instead of letting them order.
  const deliveryClosed = fulfillmentType === 'delivery' && storeHours?.deliveryOpen === false;
  const deliveryCutoffLabel = storeHours?.deliveryCutoff
    ? fmtSlot(hhmmToMin(storeHours.deliveryCutoff) / 60 | 0, hhmmToMin(storeHours.deliveryCutoff) % 60)
    : null;

  // If the current choice isn't offered anymore (e.g. switched to delivery
  // after picking a future pickup slot), snap back to the first slot (ASAP).
  useEffect(() => {
    if (!times.some((tm) => tm.value === details.requestedTime)) {
      setDetails((d) => ({ ...d, requestedTime: times[0]?.value ?? 'asap' }));
    }
  }, [times]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps = ['details', 'payment', 'done'] as const;
  const t = (en: string, es: string) => (lang === 'en' ? en : es);

  const addressOk = fulfillmentType === 'pickup' ||
    (address.street.trim() && address.city.trim() && address.zip.trim());
  // Block forward-progress while the live quote says the address is out of range.
  const addressOutOfRange = fulfillmentType === 'delivery' && quote?.source === 'out_of_range';
  const canContinue = !!(details.name.trim() && details.email.trim() && details.phone.trim() && addressOk && !addressOutOfRange && !deliveryClosed);

  const placeOrder = async () => {
    setSubmitting(true);
    setError('');
    try {
      // If gateway is configured, tokenize the card BEFORE submitting.
      // The browser never sends the raw PAN to our server.
      let acceptToken;
      if (liveCharges && paymentCfg) {
        try {
          acceptToken = await tokenizeCard(paymentCfg, card);
        } catch (tokErr) {
          throw new Error(
            tokErr instanceof Error ? tokErr.message : 'Could not validate card.'
          );
        }
      }

      const result = await submitOrder(
        fulfillmentType,
        details,
        lines,
        fulfillmentType === 'delivery' ? address : undefined,
        couponCode,
        cardMeta,
        fulfillmentType === 'delivery' ? quote?.fee : undefined,
        acceptToken,
        Math.round(tipAmount * 100),
      );
      if (result?.id) setOrderId(result.id);
      if (result?.doordash) setDoordash(result.doordash);
      if (result?.dispatch_disabled) setDispatchDisabled(true);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Order service is unavailable.', 'El servicio de pedidos no está disponible.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-[120] flex items-center justify-center p-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-ink/70" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md bg-cream rounded-[1.6rem] overflow-hidden"
        initial={{ y: 40, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <div
          data-lenis-prevent
          className="modal-scroll max-h-[90dvh] overflow-y-auto overscroll-contain"
        >
        <div className="text-ladrillo"><Cenefa weight={2.4} /></div>
        <div className="p-6 sm:p-7">
          {/* progress */}
          <div className="flex items-center gap-2 mb-6">
            {steps.map((s, i) => (
              <span key={s} className="h-1 flex-1 rounded-full transition-colors duration-300"
                    style={{ background: steps.indexOf(step) >= i ? 'var(--color-ladrillo)' : 'var(--color-line)' }} />
            ))}
          </div>

          {step === 'details' && (
            <div>
              <h2 className="font-display text-[1.7rem] font-semibold text-ink">
                {t('Order details', 'Datos del pedido')}
              </h2>

              {/* Signed-in pill — shows we pre-filled from the account */}
              {account?.customer && (
                <div className="mt-3 flex items-center gap-2 rounded-full bg-cream-deep border border-line px-3 py-1.5 text-[0.78rem] w-fit">
                  <span className="text-ladrillo">●</span>
                  <span className="text-ink-mute">
                    {t('Signed in as', 'Conectado como')}
                  </span>
                  <span className="font-semibold text-ink">{account.customer.email}</span>
                  <a href="/account" className="ml-1 text-ink-mute underline hover:text-ink">
                    {t('change', 'cambiar')}
                  </a>
                </div>
              )}

              {/* pickup / delivery toggle */}
              <div className="mt-3 flex items-center gap-1 rounded-full border border-line bg-cream-deep p-1 w-fit text-[0.82rem]">
                {(deliveryEnabled ? (['pickup', 'delivery'] as const) : (['pickup'] as const)).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFulfillmentType(type)}
                    className={`rounded-full px-4 py-1.5 font-semibold transition-all duration-200 ${
                      fulfillmentType === type
                        ? 'bg-ladrillo text-cream shadow-sm'
                        : 'text-ink-mute hover:text-ink'
                    }`}
                  >
                    {type === 'pickup' ? t('Pickup', 'Recoger') : t('Delivery', 'Entrega')}
                  </button>
                ))}
              </div>

              <p className="text-[0.85rem] text-ink-mute mt-2">
                {fulfillmentType === 'pickup'
                  ? `${INFO.address.street}, ${INFO.address.city}`
                  : t('Enter your delivery address below.', 'Ingresa tu dirección de entrega.')}
              </p>

              <div className="mt-4 space-y-3">
                <Field label={t('Full name', 'Nombre completo')} placeholder={t('Your full name', 'Tu nombre completo')}
                       value={details.name} onChange={(v) => setDetails((d) => ({ ...d, name: v }))} />
                <Field label="Email" placeholder={t('you@example.com', 'tucorreo@ejemplo.com')} type="email"
                       value={details.email} onChange={(v) => setDetails((d) => ({ ...d, email: v }))} />
                <Field label={t('Phone', 'Teléfono')} placeholder="(818) 555-0142" type="tel"
                       value={details.phone} onChange={(v) => setDetails((d) => ({ ...d, phone: formatPhone(v) }))} />

                {fulfillmentType === 'delivery' && (
                  <div className="space-y-3 pt-1">
                    <div className="h-px bg-line" />
                    <p className="kicker text-[0.6rem] text-ink-mute">{t('Delivery address', 'Dirección de entrega')}</p>
                    {deliveryClosed && (
                      <div className="rounded-xl border-2 border-ladrillo/40 bg-ladrillo/10 px-3.5 py-3 text-[0.86rem] text-ink leading-snug">
                        <div className="font-semibold mb-1">
                          <span aria-hidden className="mr-1">🌙</span>
                          {t('Delivery is closed for today', 'La entrega está cerrada por hoy')}
                        </div>
                        <div className="text-[0.82rem] text-ink-soft">
                          {deliveryCutoffLabel
                            ? t(`Last delivery order is ${deliveryCutoffLabel}. Please switch to Pickup above, or try again tomorrow.`,
                                `El último pedido a domicilio es a las ${deliveryCutoffLabel}. Cambia a Recoger arriba, o vuelve mañana.`)
                            : t('Please switch to Pickup above, or try again tomorrow.', 'Cambia a Recoger arriba, o vuelve mañana.')}
                        </div>
                      </div>
                    )}
                    <DeliveryAreaMap lang={lang} address={address} />
                    <Field label={t('Street address', 'Calle y número')} placeholder="8324 Reseda Blvd"
                           value={address.street} onChange={(v) => setAddress((a) => ({ ...a, street: v }))} />
                    <Field label={t('Apt / Unit (optional)', 'Apt / Unidad (opcional)')} placeholder="Apt 2B"
                           value={address.apt ?? ''} onChange={(v) => setAddress((a) => ({ ...a, apt: v }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t('City', 'Ciudad')} placeholder="Anytown"
                             value={address.city} onChange={(v) => setAddress((a) => ({ ...a, city: v }))} />
                      <Field label={t('ZIP', 'Código postal')} placeholder="91324"
                             value={address.zip} onChange={(v) => setAddress((a) => ({ ...a, zip: v }))} />
                    </div>
                    {addressOutOfRange ? (
                      <div className="mt-1 rounded-xl border-2 border-ladrillo/40 bg-ladrillo/10 px-3.5 py-3 text-[0.86rem] text-ink leading-snug">
                        <div className="font-semibold mb-1">
                          <span aria-hidden className="mr-1">⚠️</span>
                          {t('Out of delivery range', 'Fuera del rango de entrega')}
                        </div>
                        <div className="text-[0.82rem] text-ink-soft">
                          {t(
                            'No courier can deliver to this address — it\'s too far from the restaurant. Please choose Pickup above, or try a closer address (within ~8 mi of Anytown).',
                            'Ningún courier puede entregar a esta dirección — está fuera del radio del restaurante. Por favor elige Recoger arriba, o prueba una dirección más cercana (a unos 13 km de Anytown).'
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 rounded-xl border border-line bg-cream-deep/60 px-3.5 py-3 text-[0.82rem] text-ink-soft leading-snug">
                        <span aria-hidden className="mr-1">🚗</span>
                        {quoting && (
                          <span className="text-ink-mute italic">
                            {t('Checking couriers for this address…', 'Consultando couriers para esta dirección…')}
                          </span>
                        )}
                        {!quoting && (quote?.source === 'doordash' || quote?.source === 'shipday') && (
                          <span>
                            <strong>{t('Live courier quote', 'Cotización en vivo')}:</strong>{' '}
                            ${quote.fee.toFixed(2)} · ~{quote.etaMinutes} min ETA
                          </span>
                        )}
                        {!quoting && quote?.source === 'fallback' && (
                          <span>
                            {t('Default rate · live quote temporarily unavailable.', 'Tarifa por defecto · cotización en vivo no disponible.')}
                          </span>
                        )}
                        {!quoting && !quote && t(
                          'Delivery fee and estimated time are quoted live once your address is filled in. You\'ll see the exact amount on the next step, before placing the order.',
                          'La tarifa de entrega y el tiempo estimado se cotizan en vivo en cuanto completes tu dirección. Verás el monto exacto en el siguiente paso, antes de realizar el pedido.'
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="kicker text-[0.62rem] text-ink-mute">
                    {fulfillmentType === 'pickup' ? t('Pickup time', 'Hora de recojo') : t('Delivery time', 'Hora de entrega')}
                  </label>
                  {fulfillmentType === 'delivery' ? (
                    <div className="mt-1 w-full rounded-xl border border-line bg-cream-card px-3.5 py-3 text-[0.95rem] text-ink">
                      {times[0]?.label ?? t('ASAP', 'Lo antes posible')}
                    </div>
                  ) : (
                    <select
                      value={details.requestedTime}
                      onChange={(e) => setDetails((d) => ({ ...d, requestedTime: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-line bg-cream-card px-3.5 py-3 text-[0.95rem] text-ink"
                    >
                      {times.map((tm) => <option key={tm.value} value={tm.value}>{tm.label}</option>)}
                    </select>
                  )}
                </div>
              </div>
              <button onClick={() => setStep('payment')}
                      disabled={!canContinue}
                      className="mt-6 w-full rounded-full bg-ladrillo text-cream font-semibold py-3.5 hover:bg-ladrillo-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {t('Continue to payment', 'Continuar al pago')} →
              </button>
            </div>
          )}

          {step === 'payment' && (
            <div>
              <h2 className="font-display text-[1.7rem] font-semibold text-ink">{t('Payment', 'Pago')}</h2>
              <p className="text-[0.9rem] text-ink-mute mt-1">
                {liveCharges
                  ? t(
                      paymentCfg?.mode === 'sandbox'
                        ? 'Sandbox mode — only Authorize.net test cards will succeed.'
                        : 'Card is tokenized securely in your browser. We never see the full number.',
                      paymentCfg?.mode === 'sandbox'
                        ? 'Modo de prueba — solo las tarjetas de prueba de Authorize.net serán aceptadas.'
                        : 'La tarjeta se procesa de forma segura en tu navegador.'
                    )
                  : orderApiEnabled
                  ? t('Authorize.net tokenization is ready for Luqra credentials.', 'La tokenización de Authorize.net queda lista para las credenciales de Luqra.')
                  : t('Proposal mode — connect the order service URL to activate submission.', 'Modo propuesta — conecta la URL del servicio para activar el pedido.')}
              </p>
              <div className="mt-5 space-y-3">
                <div>
                  <label className="kicker text-[0.62rem] text-ink-mute">
                    {t('Card number', 'Número de tarjeta')}
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="•••• •••• •••• ••••"
                      value={card.number}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 19);
                        const groups = digits.match(/.{1,4}/g) ?? [];
                        setCard((c) => ({ ...c, number: groups.join(' ') }));
                      }}
                      className="w-full rounded-xl border border-line bg-cream-card px-3.5 py-3 pr-20 text-[0.95rem] text-ink placeholder:text-ink-faint focus:border-ladrillo focus:outline-none transition-colors numeral"
                    />
                    {cardMeta.brand && cardMeta.brand !== 'unknown' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ink/10 px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-ink">
                        {cardMeta.brand === 'amex' ? 'Amex' : cardMeta.brand === 'mastercard' ? 'MC' : cardMeta.brand}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="kicker text-[0.62rem] text-ink-mute">
                      {t('Expiry', 'Vencimiento')}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="08 / 28"
                      value={card.exp}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                        const formatted = digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
                        setCard((c) => ({ ...c, exp: formatted }));
                      }}
                      className="mt-1 w-full rounded-xl border border-line bg-cream-card px-3.5 py-3 text-[0.95rem] text-ink placeholder:text-ink-faint focus:border-ladrillo focus:outline-none transition-colors numeral"
                    />
                  </div>
                  <div>
                    <label className="kicker text-[0.62rem] text-ink-mute">CVC</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      value={card.cvc}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setCard((c) => ({ ...c, cvc: digits }));
                      }}
                      className="mt-1 w-full rounded-xl border border-line bg-cream-card px-3.5 py-3 text-[0.95rem] text-ink placeholder:text-ink-faint focus:border-ladrillo focus:outline-none transition-colors numeral"
                    />
                  </div>
                </div>
              </div>
              {/* Tip — admin-driven (preset %s + default), both pickup & delivery */}
              {tipConfig.enabled && (
              <div className="mt-5 rounded-xl border border-line bg-cream-card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[0.95rem] font-semibold text-ink">{t('Add a tip', 'Agregar propina')}</span>
                  <span className="numeral text-[0.85rem] text-ink-mute">{tipAmount > 0 ? money(tipAmount) : t('No tip', 'Sin propina')}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...tipConfig.presets.map(String), 'custom', 'none'].map((opt) => {
                    const active = tipChoice === opt;
                    const label = opt === 'custom' ? t('Other', 'Otro') : opt === 'none' ? t('None', 'No') : `${opt}%`;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setTipChoice(opt)}
                        className={`flex-1 min-w-[56px] rounded-xl border px-2 py-2.5 text-[0.85rem] font-semibold transition-colors ${active ? 'border-ladrillo bg-ladrillo text-white' : 'border-line bg-cream-deep text-ink hover:border-ladrillo'}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {tipChoice === 'custom' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-ink-mute">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customTip}
                      onChange={(e) => setCustomTip(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-line bg-cream-card px-3.5 py-2.5 text-[0.95rem] text-ink placeholder:text-ink-faint focus:border-ladrillo focus:outline-none numeral"
                    />
                  </div>
                )}
              </div>
              )}

              <div className="mt-5 rounded-xl bg-cream-deep p-4 space-y-1.5 text-[0.9rem]">
                <Row label={t('Subtotal', 'Subtotal')} value={money(subtotal)} />
                {couponSaving > 0 && (
                  <div className="flex justify-between text-limon font-medium">
                    <span>{t('Coupon', 'Cupón')} {couponCode && <span className="font-mono text-[0.8em]">({couponCode})</span>}</span>
                    <span className="numeral">−{money(couponSaving)}</span>
                  </div>
                )}
                <Row label={t('Estimated tax', 'Impuesto estimado')} value={money(tax)} />
                {serviceFee > 0 && (
                  <Row label={serviceFeeLabel} value={money(serviceFee)} />
                )}
                {deliveryFee > 0 && (
                  <div>
                    <Row label={t('Delivery fee', 'Costo de entrega')} value={money(deliveryFee)} />
                    {quoting && (
                      <div className="text-[0.74rem] text-ink-mute text-right mt-0.5">
                        {t('Updating quote…', 'Actualizando cotización…')}
                      </div>
                    )}
                    {quote && !quoting && (
                      <div className="text-[0.74rem] text-ink-mute text-right mt-0.5">
                        {quote.source === 'doordash' || quote.source === 'shipday'
                          ? t(`Live courier quote · ~${quote.etaMinutes} min ETA`, `Cotización en vivo · ~${quote.etaMinutes} min`)
                          : t(`Default rate · live courier quote unavailable`, `Tarifa por defecto · cotización del courier no disponible`)}
                      </div>
                    )}
                  </div>
                )}
                {tipAmount > 0 && (
                  <Row label={t('Tip', 'Propina')} value={money(tipAmount)} />
                )}
                <div className="flex justify-between pt-1.5 border-t border-line">
                  <span className="font-semibold text-ink">Total · {count} {t('items', 'platos')}</span>
                  <span className="numeral font-semibold text-ladrillo">{money(total)}</span>
                </div>
              </div>
              {error && (
                <p className="mt-4 rounded-xl border border-ladrillo/25 bg-ladrillo/10 px-3.5 py-3 text-[0.82rem] text-ladrillo">
                  {error}
                </p>
              )}
              <button onClick={placeOrder}
                      disabled={submitting}
                      className="mt-5 w-full rounded-full bg-ladrillo text-cream font-semibold py-3.5 hover:bg-ladrillo-deep transition-colors disabled:opacity-55 disabled:cursor-wait">
                {submitting ? t('Sending...', 'Enviando...') : `${t('Place order', 'Realizar pedido')} · ${money(total)}`}
              </button>
              <button onClick={() => setStep('details')} className="mt-2 text-[0.85rem] text-ink-mute uline mx-auto block w-fit">
                ← {t('Back', 'Atrás')}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-2">
              <motion.div className="mx-auto h-16 w-16 rounded-full grid place-items-center text-cream"
                          style={{ background: 'var(--color-limon)' }}
                          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, ease: EASE }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </motion.div>
              <h2 className="font-display text-[1.8rem] font-semibold text-ink mt-4">
                {t('Order placed!', '¡Pedido realizado!')}
              </h2>
              <p className="text-[0.95rem] text-ink-mute mt-1">
                {t('Order', 'Pedido')} <span className="numeral font-semibold text-ink">{orderId}</span>
              </p>

              {fulfillmentType === 'delivery' && doordash ? (
                <div className="mt-4 rounded-xl bg-cream-deep border border-line p-4 text-left space-y-2">
                  <div className="flex items-center gap-2">
                    {/* DoorDash icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ladrillo shrink-0">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                    <span className="font-display font-semibold text-ink text-[0.95rem]">
                      {t('Driver dispatched via DoorDash', 'Conductor enviado por DoorDash')}
                    </span>
                  </div>
                  <div className="text-[0.85rem] text-ink-soft space-y-1 pl-6">
                    <p><span className="text-ink-mute">{t('Delivery ID:', 'ID de entrega:')}</span> <span className="numeral font-medium text-ink">{doordash.delivery_id}</span></p>
                    <p><span className="text-ink-mute">{t('Estimated arrival:', 'Llegada estimada:')}</span> <span className="numeral font-medium text-ink">~{doordash.eta_minutes} min</span></p>
                  </div>
                </div>
              ) : fulfillmentType === 'pickup' ? (
                <p className="mt-2 text-[0.92rem] text-ink-mute">
                  {t(`Ready in about ${INFO.pickupMinutes + prepBuffer} minutes.`, `Listo en unos ${INFO.pickupMinutes + prepBuffer} minutos.`)}
                </p>
              ) : dispatchDisabled ? (
                <p className="mt-2 text-[0.92rem] text-ink-mute">
                  {t(
                    'Order received — kitchen has been notified. (Driver dispatch is currently disabled in test mode; no courier will arrive.)',
                    'Pedido recibido — la cocina ha sido notificada. (El envío de conductor está deshabilitado en modo de prueba; ningún courier llegará.)'
                  )}
                </p>
              ) : (
                <p className="mt-2 text-[0.92rem] text-ink-mute">
                  {t('A driver will arrive in about 45 minutes.', 'Un conductor llegará en unos 45 minutos.')}
                </p>
              )}

              <p className="mt-3 text-[0.78rem] text-ink-faint">
                {liveCharges
                  ? t('Card charged successfully. A confirmation email is on its way.', 'Tarjeta cargada correctamente. Se envió un correo de confirmación.')
                  : orderApiEnabled
                  ? t('Order captured. Payment activates when Luqra credentials are installed.', 'Pedido capturado. El pago se activa cuando instalemos las credenciales de Luqra.')
                  : t('Proposal confirmation — no payment was processed.', 'Confirmación de propuesta — no se procesó ningún pago.')}
              </p>
              <button onClick={onDone}
                      className="mt-6 w-full rounded-full bg-ink text-cream font-semibold py-3.5 hover:bg-ink-soft transition-colors">
                {t('Done', 'Listo')}
              </button>
            </div>
          )}
        </div>
        </div>{/* end modal scroll wrapper */}
      </motion.div>
    </motion.div>
  );
}

function Field({ label, placeholder, type = 'text', value, onChange }: {
  label: string; placeholder: string; type?: string;
  value?: string; onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label className="kicker text-[0.62rem] text-ink-mute">{label}</label>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-cream-card px-3.5 py-3 text-[0.95rem] text-ink placeholder:text-ink-faint focus:border-ladrillo focus:outline-none transition-colors"
      />
    </div>
  );
}
