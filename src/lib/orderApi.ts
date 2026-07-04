import { MENU } from '../data/content';
import type { MenuCategory, MenuItem, T } from '../data/content';
import { dishSlug } from './assets';

const API_URL = import.meta.env.PUBLIC_ORDER_API_URL?.replace(/\/$/, '') ?? '';

export type OrderMenuItem = MenuItem & {
  apiId?: string;
  photoUrl?: string | null;
  isFavorite?: boolean;
};

export type OrderMenuCategory = Omit<MenuCategory, 'items'> & {
  items: OrderMenuItem[];
  availableNow?: boolean;
};

export type OrderLineInput = {
  item: OrderMenuItem;
  qty: number;
  note?: string;
};

export type OrderDetailsInput = {
  name: string;
  email: string;
  phone: string;
  requestedTime: string;
};

export type DeliveryAddress = {
  street: string;
  apt?: string;
  city: string;
  zip: string;
};

export type PaymentConfig = {
  configured: boolean;
  mode: 'sandbox' | 'production';
  publicClientKey: string | null;
  acceptJsUrl: string;
  apiLoginId: string | null;
};

export async function fetchPaymentConfig(): Promise<PaymentConfig | null> {
  if (!orderApiEnabled) return null;
  try {
    const res = await fetch(`${API_URL}/api/config`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const payload = await res.json();
    const p = payload?.data?.payment;
    if (!p) return null;
    return {
      configured:       !!p.configured,
      mode:             p.mode === 'production' ? 'production' : 'sandbox',
      publicClientKey:  p.public_client_key ?? null,
      acceptJsUrl:      p.accept_js_url ?? 'https://jstest.authorize.net/v1/Accept.js',
      apiLoginId:       p.api_login_id ?? null,
    };
  } catch {
    return null;
  }
}

export type ServiceFee = {
  enabled: boolean;
  label: string;
  type: 'flat' | 'percent';
  amount: number;   // dollars when flat, percent number when percent
  taxable: boolean;
  appliesTo: 'both' | 'pickup' | 'delivery';
};
export type PricingConfig = { taxRate: number; fee: ServiceFee };

export const PRICING_DEFAULT: PricingConfig = {
  taxRate: 0.095,
  fee: { enabled: false, label: 'Service Fee', type: 'flat', amount: 0, taxable: false, appliesTo: 'both' },
};

/** Tax rate + optional service/kitchen fee — admin-driven, so the cart
 *  matches what the server charges. Falls back to 9.5% / no fee offline. */
export async function fetchPricingConfig(): Promise<PricingConfig> {
  if (!orderApiEnabled) return PRICING_DEFAULT;
  try {
    const res = await fetch(`${API_URL}/api/config`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return PRICING_DEFAULT;
    const d = (await res.json())?.data ?? {};
    const f = d.service_fee ?? {};
    return {
      taxRate: typeof d.tax_rate === 'number' ? d.tax_rate : PRICING_DEFAULT.taxRate,
      fee: {
        enabled: !!f.enabled,
        label: typeof f.label === 'string' && f.label ? f.label : 'Service Fee',
        type: f.type === 'percent' ? 'percent' : 'flat',
        amount: typeof f.amount === 'number' ? f.amount : 0,
        taxable: !!f.taxable,
        appliesTo: f.applies_to === 'pickup' || f.applies_to === 'delivery' ? f.applies_to : 'both',
      },
    };
  } catch {
    return PRICING_DEFAULT;
  }
}

/** Service fee in dollars for a given post-discount subtotal + fulfillment. */
export function computeServiceFee(
  fee: ServiceFee,
  subtotalAfterDiscount: number,
  fulfillment: 'pickup' | 'delivery',
): number {
  if (!fee.enabled) return 0;
  if (fee.appliesTo !== 'both' && fee.appliesTo !== fulfillment) return 0;
  return fee.type === 'percent'
    ? (subtotalAfterDiscount * fee.amount) / 100
    : fee.amount;
}

export const DELIVERY_FEE_DEFAULT = 3.99;

// Today's effective hours from admin Settings (weekly row or holiday override).
// `today` is null when no hours are configured (= always open). Times are "HH:mm"
// in the restaurant's timezone; `now` is the restaurant-local clock so slots
// don't drift with the customer's device timezone.
export type StoreHours = {
  now: string;                 // "HH:mm" restaurant-local
  isOpen: boolean;
  deliveryOpen: boolean;
  deliveryCutoff: string | null;
  today: { closed: boolean; open: string | null; close: string | null; delivery_close: string | null; label: string | null } | null;
};

export type StoreStatus = { accepting: boolean; pauseMessage: string; hours: StoreHours | null };

/**
 * Master online-ordering switch + live hours from admin Settings. When accepting
 * is false, the order page tells the customer up front. Hours drive the pickup
 * time-slot picker and the delivery cutoff. Fails open.
 */
export async function fetchStoreStatus(): Promise<StoreStatus> {
  if (!orderApiEnabled) return { accepting: true, pauseMessage: '', hours: null };
  try {
    const res = await fetch(`${API_URL}/api/config`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { accepting: true, pauseMessage: '', hours: null };
    const payload = await res.json();
    const s = payload?.data?.store;
    const h = s?.hours;
    return {
      accepting: s?.accepting !== false,
      pauseMessage: s?.pause_message || "We're not taking online orders at the moment.",
      hours: h ? {
        now: h.now ?? '',
        isOpen: h.is_open !== false,
        deliveryOpen: h.delivery_open !== false,
        deliveryCutoff: h.delivery_cutoff ?? null,
        today: h.today ?? null,
      } : null,
    };
  } catch {
    return { accepting: true, pauseMessage: '', hours: null };
  }
}

export type StoreHoursRow = { closed: boolean; open: string | null; close: string | null; delivery_close: string | null; label: string | null };
export type StoreHoliday = StoreHoursRow & { date: string };

const DOW_LABELS: { en: string; es: string }[] = [
  { en: 'Sunday', es: 'Domingo' }, { en: 'Monday', es: 'Lunes' }, { en: 'Tuesday', es: 'Martes' },
  { en: 'Wednesday', es: 'Miércoles' }, { en: 'Thursday', es: 'Jueves' }, { en: 'Friday', es: 'Viernes' },
  { en: 'Saturday', es: 'Sábado' },
];
const MONTHS: Record<'en' | 'es', string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
};

export function to12h(hm: string | null | undefined): string {
  if (!hm) return '';
  const [h, m] = hm.split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const ap = h >= 12 ? 'PM' : 'AM';
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${String(m || 0).padStart(2, '0')} ${ap}`;
}

export function hoursLabel(row: StoreHoursRow | null, lang: 'en' | 'es'): string {
  if (!row || row.closed) return lang === 'en' ? 'Closed' : 'Cerrado';
  if (row.open && row.close) return `${to12h(row.open)} – ${to12h(row.close)}`;
  return lang === 'en' ? 'Open' : 'Abierto';
}

export function holidayDateLabel(date: string, lang: 'en' | 'es'): string {
  const [, m, d] = date.split('-').map(Number);
  if (!m || !d) return date;
  return lang === 'en' ? `${MONTHS.en[m - 1]} ${d}` : `${d} ${MONTHS.es[m - 1]}`;
}

/** Mon->Sun display rows from the live week (null entry = closed). */
export function weekRows(week: (StoreHoursRow | null)[], lang: 'en' | 'es'): { dow: number; day: string; time: string }[] {
  return [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    dow: d,
    day: DOW_LABELS[d][lang],
    time: hoursLabel(week[d] ?? null, lang),
  }));
}

export async function fetchStoreHours(): Promise<{ week: (StoreHoursRow | null)[]; holidays: StoreHoliday[]; dow: number } | null> {
  if (!orderApiEnabled) return null;
  try {
    const res = await fetch(`${API_URL}/api/config`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const h = (await res.json())?.data?.store?.hours;
    if (!h || !Array.isArray(h.week)) return null;
    return {
      week: h.week,
      holidays: Array.isArray(h.holidays) ? h.holidays : [],
      dow: typeof h.dow === 'number' ? h.dow : new Date().getDay(),
    };
  } catch {
    return null;
  }
}

export async function fetchPrepBuffer(): Promise<number> {
  if (!orderApiEnabled) return 0;
  try {
    const res = await fetch(`${API_URL}/api/config`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return 0;
    const payload = await res.json();
    return Math.max(0, Number(payload?.data?.prep_buffer_min ?? 0)) || 0;
  } catch {
    return 0;
  }
}

export async function fetchDeliveryFee(): Promise<number> {
  if (!orderApiEnabled) return DELIVERY_FEE_DEFAULT;
  try {
    const res = await fetch(`${API_URL}/api/config`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return DELIVERY_FEE_DEFAULT;
    const payload = await res.json();
    return (payload?.data?.delivery_fee_cents ?? 399) / 100;
  } catch {
    return DELIVERY_FEE_DEFAULT;
  }
}

/**
 * Master delivery toggle from admin Settings. When false, the customer
 * can only place pickup orders — the delivery option is hidden entirely
 * in the cart and on the order page. Defaults to true on error/offline.
 */
export async function fetchDeliveryEnabled(): Promise<boolean> {
  if (!orderApiEnabled) return true;
  try {
    const res = await fetch(`${API_URL}/api/config`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return true;
    const payload = await res.json();
    return payload?.data?.delivery_enabled !== false;
  } catch {
    return true;
  }
}

/**
 * Max food-subtotal (in dollars) we'll deliver. Above it a courier's car
 * can't fit the order → customer is steered to pickup / catering call.
 * 0 means no cap. Defaults generously on error so we never wrongly block.
 */
export async function fetchDeliveryMaxOrder(): Promise<number> {
  if (!orderApiEnabled) return 0;
  try {
    const res = await fetch(`${API_URL}/api/config`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return 0;
    const payload = await res.json();
    const cents = payload?.data?.delivery_max_order_cents;
    return typeof cents === 'number' ? cents / 100 : 0;
  } catch {
    return 0;
  }
}

export type DeliveryQuote = {
  fee: number;        // dollars
  etaMinutes: number;
  source: 'doordash' | 'shipday' | 'fallback' | 'out_of_range';
  message?: string;   // human-readable explanation, present when out_of_range
};

/**
 * Live quote from DoorDash Drive (or fallback) for a given dropoff address.
 * Called when the customer has finished entering street + city + zip in checkout.
 *
 * source values:
 *   - 'doordash'     → real live quote, fee is what DoorDash will charge
 *   - 'fallback'     → DoorDash is unconfigured / transient error, default rate shown
 *   - 'out_of_range' → DoorDash refuses (distance_too_long / not in service area).
 *                      The order MUST NOT proceed with delivery. fee = 0.
 */
export async function fetchDeliveryQuote(address: DeliveryAddress): Promise<DeliveryQuote | null> {
  if (!orderApiEnabled) return null;
  try {
    const res = await fetch(`${API_URL}/api/delivery/quote`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const data = payload?.data ?? {};
    const source: DeliveryQuote['source'] =
      data.source === 'doordash' ? 'doordash'
      : data.source === 'shipday' ? 'shipday'
      : data.source === 'out_of_range' ? 'out_of_range'
      : 'fallback';
    return {
      fee: (data.fee_cents ?? 0) / 100,
      etaMinutes: data.eta_minutes ?? 45,
      source,
      message: data.message,
    };
  } catch {
    return null;
  }
}

export type GeocodeHit = { lat: number; lng: number; source: string };

/** Geocode an address for the checkout map pin (Census → Nominatim, server-side). */
export async function geocodeAddress(address: DeliveryAddress): Promise<GeocodeHit | null> {
  if (!API_URL) return null;
  try {
    const params = new URLSearchParams({
      street: address.street,
      city: address.city,
      zip: address.zip,
    });
    const res = await fetch(`${API_URL}/api/geocode?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return payload?.data ?? null;
  } catch {
    return null;
  }
}

// '' = same-origin: the clone's backend serves this storefront, so /api/* always exists.
export const orderApiEnabled = true;

type ApiMenuItem = {
  id: string;
  name: T;
  description: T;
  price_cents: number;
  available: boolean;
  is_favorite?: boolean;
  photo_url?: string | null;
};

type ApiMenuCategory = {
  id: number | string;
  name: T;
  available_now?: boolean;
  items: ApiMenuItem[];
};

async function _fetchMenu(all: boolean): Promise<OrderMenuCategory[] | null> {
  if (!orderApiEnabled) return null;
  const url = all ? `${API_URL}/api/menu?all=1` : `${API_URL}/api/menu`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });

  if (!response.ok) {
    throw new Error('Menu service is unavailable.');
  }

  const payload = await response.json();
  const categories = (payload?.data ?? []) as ApiMenuCategory[];
  const fallbackByName = new Map(MENU.map((category) => [category.name.en, category]));

  return categories.map((category, index) => {
    const fallback = fallbackByName.get(category.name.en) ?? MENU[index] ?? MENU[0];

    return {
      id: String(category.id),
      name: category.name,
      blurb: fallback.blurb,
      photo: fallback.photo,
      availableNow: category.available_now !== false,
      items: category.items
        .filter((item) => item.available)
        .map((item) => ({
          apiId: item.id,
          photoUrl: item.photo_url,
          isFavorite: item.is_favorite === true,
          name: item.name.en,
          desc: item.description,
          price: (item.price_cents / 100).toFixed(2),
        })),
    };
  });
}

/** Menu display page — returns ALL categories regardless of time/day. */
export async function fetchDisplayMenu(): Promise<OrderMenuCategory[] | null> {
  return _fetchMenu(true);
}

/** Order page — returns only categories available right now (time + day filtered). */
export async function fetchOrderMenu(): Promise<OrderMenuCategory[] | null> {
  return _fetchMenu(false);
}

export type CardMeta = {
  brand?: string;
  last4?: string;
};

/** Detect card brand from the first digits. Returns one of the values accepted by the API. */
export function detectCardBrand(num: string): string | undefined {
  const digits = num.replace(/\D/g, '');
  if (!digits) return undefined;
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^(6011|65|64[4-9])/.test(digits)) return 'discover';
  if (/^35/.test(digits)) return 'jcb';
  if (/^3(0[0-5]|[689])/.test(digits)) return 'diners';
  if (/^62/.test(digits)) return 'unionpay';
  return 'unknown';
}

export function extractCardMeta(num: string): CardMeta {
  const digits = num.replace(/\D/g, '');
  return {
    brand: digits.length >= 1 ? detectCardBrand(digits) : undefined,
    last4: digits.length >= 4 ? digits.slice(-4) : undefined,
  };
}

export type AcceptToken = {
  dataDescriptor: string;
  dataValue: string;
};

/* ── Accept.js loader ─────────────────────────────────────────────
 * Loads the Authorize.net Accept.js script once and tokenizes the
 * card in the browser. The browser only ever sees the merchant's
 * PUBLIC client key — the secret transaction key stays server-side.
 *
 * tokenizeCard() returns {dataDescriptor, dataValue} which the
 * backend forwards to createTransactionRequest. We never send the
 * raw PAN to our own server, so PCI scope stays at SAQ-A.
 * ────────────────────────────────────────────────────────────────── */
declare global {
  interface Window {
    Accept?: {
      dispatchData: (
        secureData: {
          authData: { clientKey: string; apiLoginID: string };
          cardData: {
            cardNumber: string;
            month: string;
            year: string;
            cardCode: string;
          };
        },
        callback: (response: {
          messages: { resultCode: 'Ok' | 'Error'; message: { code: string; text: string }[] };
          opaqueData?: { dataDescriptor: string; dataValue: string };
        }) => void
      ) => void;
    };
  }
}

let acceptJsPromise: Promise<void> | null = null;
function loadAcceptJs(url: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.Accept) return Promise.resolve();
  if (acceptJsPromise) return acceptJsPromise;

  acceptJsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.charset = 'utf-8';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Accept.js'));
    document.head.appendChild(s);
  });
  return acceptJsPromise;
}

export async function tokenizeCard(
  cfg: PaymentConfig,
  card: { number: string; exp: string; cvc: string },
): Promise<AcceptToken> {
  if (!cfg.configured || !cfg.publicClientKey || !cfg.apiLoginId) {
    throw new Error('Card processing is not configured yet.');
  }

  await loadAcceptJs(cfg.acceptJsUrl);
  if (!window.Accept) throw new Error('Accept.js failed to initialize.');

  const digits = card.number.replace(/\D/g, '');
  // exp can be "MM/YY" or "MM/YYYY" — Accept.js wants 2 or 4-digit year
  const [mmRaw, yyRaw] = card.exp.split('/').map((s) => s.trim());
  if (!mmRaw || !yyRaw) throw new Error('Card expiration date is invalid.');
  const month = mmRaw.padStart(2, '0');
  const year  = yyRaw.length === 2 ? yyRaw : yyRaw.slice(-2);

  return new Promise<AcceptToken>((resolve, reject) => {
    window.Accept!.dispatchData(
      {
        authData: { clientKey: cfg.publicClientKey!, apiLoginID: cfg.apiLoginId! },
        cardData: { cardNumber: digits, month, year, cardCode: card.cvc.replace(/\D/g, '') },
      },
      (response) => {
        if (response.messages.resultCode === 'Ok' && response.opaqueData) {
          resolve({
            dataDescriptor: response.opaqueData.dataDescriptor,
            dataValue:      response.opaqueData.dataValue,
          });
        } else {
          const msg = response.messages.message?.[0]?.text ?? 'Could not process card.';
          reject(new Error(msg));
        }
      }
    );
  });
}

export type TipConfig = { enabled: boolean; defaultPct: number; presets: number[] };
export const TIP_DEFAULT: TipConfig = { enabled: true, defaultPct: 18, presets: [15, 18, 20] };

/** Admin-driven tip settings: whether to offer a tip, the pre-selected %, and
 *  the preset buttons. Falls back to 18% / 15·18·20 offline. */
export async function fetchTipConfig(): Promise<TipConfig> {
  if (!orderApiEnabled) return TIP_DEFAULT;
  try {
    const res = await fetch(`${API_URL}/api/config`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return TIP_DEFAULT;
    const t = (await res.json())?.data?.tips ?? {};
    const presets = Array.isArray(t.presets)
      ? t.presets.map((n: unknown) => parseInt(String(n), 10)).filter((n: number) => n > 0)
      : [];
    return {
      enabled: t.enabled !== false,
      defaultPct: typeof t.default_pct === 'number' ? t.default_pct : 18,
      presets: presets.length ? presets : [15, 18, 20],
    };
  } catch {
    return TIP_DEFAULT;
  }
}

export async function submitOrder(
  type: 'pickup' | 'delivery',
  details: OrderDetailsInput,
  lines: OrderLineInput[],
  deliveryAddress?: DeliveryAddress,
  couponCode?: string,
  cardMeta?: CardMeta,
  deliveryFeeOverride?: number,  // dollars — from live DoorDash quote
  acceptToken?: AcceptToken,
  tipCents?: number,             // customer tip, integer cents
) {
  if (!orderApiEnabled) {
    return null;
  }

  const fulfillment: Record<string, unknown> = {
    type,
    requested_time: details.requestedTime,
  };

  if (type === 'delivery' && deliveryAddress) {
    fulfillment.address = deliveryAddress;
    fulfillment.delivery_fee_cents = Math.round((deliveryFeeOverride ?? DELIVERY_FEE_DEFAULT) * 100);
  }

  const response = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer: {
        name: details.name,
        email: details.email,
        phone: details.phone,
      },
      fulfillment,
      payment: {
        nonce: acceptToken?.dataValue ?? 'accept-js-pending',
        ...(acceptToken ? {
          accept_data_descriptor: acceptToken.dataDescriptor,
          accept_data_value:      acceptToken.dataValue,
        } : {}),
        ...(cardMeta?.brand ? { card_brand: cardMeta.brand } : {}),
        ...(cardMeta?.last4 ? { card_last4: cardMeta.last4 } : {}),
      },
      items: lines.map((line) => ({
        menu_item_id: line.item.apiId ?? dishSlug(line.item.name),
        quantity: line.qty,
        ...(line.note && line.note.trim() ? { note: line.note.trim() } : {}),
      })),
      ...(couponCode ? { coupon_code: couponCode } : {}),
      ...(tipCents && tipCents > 0 ? { tip_cents: Math.round(tipCents) } : {}),
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message ?? 'Order service is unavailable.');
  }

  // Return the full data object — includes id, status, pricing, and doordash (if delivery was dispatched)
  return payload?.data ?? null;
}
