/* ── Customer account API ─────────────────────────────────────────────
 * Magic-link login + account dashboard for returning customers.
 *
 * Auth model: an HttpOnly `pt_session` cookie is set by the backend on
 * successful verifyCode(). Every helper here uses credentials:'include'
 * so the cookie travels on every fetch from this browser.
 *
 * Spec: plmks-order-service/docs/superpowers/specs/2026-06-12-customer-accounts-design.md
 * ─────────────────────────────────────────────────────────────────── */

const API = import.meta.env.PUBLIC_ORDER_API_URL ?? '';

export type CustomerSnapshot = {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  marketing_consent_email: boolean;
  default_tip_pct: number | null;
  referral_code: string | null;
  birthday_month: number | null;
  birthday_day: number | null;
};

export type AccountAddress = {
  id: number;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zip: string;
  is_default: boolean;
};

export type AccountOrderSummary = {
  id: string;
  short_id: string;
  placed_at: string;
  status: string;
  fulfillment_type: 'pickup' | 'delivery';
  item_count: number;
  first_item_name: string | null;
  total_cents: number;
};

export type AccountFavorite = {
  menu_item_id: string;
  name: string;
  name_es: string;
  price_cents: number;
  qty_default: number;
};

export type AccountSnapshot = {
  customer: CustomerSnapshot;
  recent_orders: AccountOrderSummary[];
  addresses: AccountAddress[];
  default_address_id: number | null;
  favorites: AccountFavorite[];
  active_coupon: { code: string; discount_pct: number; expires_at: string | null } | null;
  loyalty: {
    total_orders: number;
    next_reward_at: number;
    orders_to_next_reward: number;
    lifetime_value_cents: number;
    reward_pct?: number;
  };
};

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
      else if (body?.message) msg = body.message;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function requestLoginCode(email: string): Promise<void> {
  await api('/api/auth/request-code', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function verifyLoginCode(email: string, code: string): Promise<CustomerSnapshot> {
  const r = await api<{ customer: CustomerSnapshot }>('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  return r.customer;
}

export async function logout(): Promise<void> {
  await api('/api/auth/logout', { method: 'POST', body: '{}' });
}

export async function fetchAccount(): Promise<AccountSnapshot | null> {
  try {
    const r = await api<{ data: AccountSnapshot }>('/api/me');
    return r.data;
  } catch (e) {
    // 401 means not logged in — treat as null, not an error
    return null;
  }
}

export async function reorderFromOrder(orderId: string): Promise<{ items: Array<{ menu_item_id: string; name: string; quantity: number; unit_price_cents: number }> }> {
  const r = await api<{ data: { items: any[] } }>('/api/me/reorder', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId }),
  });
  return r.data;
}

export async function updateProfile(payload: Partial<{ name: string; phone: string; marketing_consent_email: boolean; default_tip_pct: number; birthday_month: number | null; birthday_day: number | null }>): Promise<void> {
  await api('/api/me/profile', { method: 'PUT', body: JSON.stringify(payload) });
}

export async function saveAddress(payload: Omit<AccountAddress, 'id'> & { id?: number }): Promise<AccountAddress> {
  const isEdit = !!payload.id;
  const r = await api<{ data: AccountAddress }>(
    isEdit ? `/api/me/addresses/${payload.id}` : '/api/me/addresses',
    { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) }
  );
  return r.data;
}

export async function deleteAddress(id: number): Promise<void> {
  await api(`/api/me/addresses/${id}`, { method: 'DELETE' });
}

export async function toggleFavorite(menuItemId: string, on: boolean): Promise<void> {
  await api(`/api/me/favorites/${encodeURIComponent(menuItemId)}`, {
    method: on ? 'POST' : 'DELETE',
    body: '{}',
  });
}
