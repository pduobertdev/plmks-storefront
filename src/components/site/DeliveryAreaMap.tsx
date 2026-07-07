import { useEffect, useRef, useState } from 'react';
import { geocodeAddress } from '../../lib/orderApi';

/* ── Delivery area map ───────────────────────────────────────────────
 *
 * A small Leaflet + OpenStreetMap embed. It shows the restaurant pin +
 * coverage circle, and — once the customer types an address — geocodes
 * that address (free OpenStreetMap Nominatim, no API key), drops a
 * destination pin, and reports the real distance from the restaurant.
 *
 * This is the customer-facing "is my address real?" check. The live
 * ShipDay/DoorDash quote at checkout is still the source of truth for
 * price and hard out-of-range blocking; the map is the visual confirm.
 * ────────────────────────────────────────────────────────────────── */

// 123 Main Street, Anytown CA 91325 (matches Layout.astro JSON-LD).
const PICKUP = { lat: 34.2204451, lng: -118.5096546 };
const RADIUS_METERS = 12875; // ≈ 8 miles — matches copy + observed live coverage
const RADIUS_MILES = 8;
const LEAFLET_VERSION = '1.9.4';

type LeafletGlobal = {
  map: (id: HTMLElement, opts?: Record<string, unknown>) => any;
  tileLayer: (url: string, opts?: Record<string, unknown>) => any;
  marker: (latlng: [number, number], opts?: Record<string, unknown>) => any;
  circle: (latlng: [number, number], opts?: Record<string, unknown>) => any;
  divIcon: (opts: Record<string, unknown>) => any;
  latLngBounds: (corners: [number, number][]) => any;
};

declare global {
  interface Window {
    L?: LeafletGlobal;
  }
}

let leafletPromise: Promise<LeafletGlobal> | null = null;

function loadLeaflet(): Promise<LeafletGlobal> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    // CSS (idempotent)
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
      document.head.appendChild(link);
    }
    // JS
    const script = document.createElement('script');
    script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
    script.async = true;
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error('Leaflet loaded but window.L is missing'));
    };
    script.onerror = () => reject(new Error('Failed to load Leaflet from CDN'));
    document.head.appendChild(script);
  });

  return leafletPromise;
}

function pinIcon(L: LeafletGlobal, color: string) {
  return L.divIcon({
    className: 'pt-pin',
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    html: `
      <div style="width:28px;height:36px;position:relative;filter:drop-shadow(0 2px 4px rgba(30,41,59,0.35));">
        <svg viewBox="0 0 28 36" width="28" height="36" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z" fill="${color}"/>
          <circle cx="14" cy="14" r="5" fill="#f8fafc"/>
        </svg>
      </div>`,
  });
}

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type DeliveryAddress = { street: string; apt?: string; city: string; zip: string };
type GeoStatus = 'idle' | 'searching' | 'found' | 'notfound';

type Props = {
  lang: 'en' | 'es';
  className?: string;
  address?: DeliveryAddress;
};

export default function DeliveryAreaMap({ lang, className = '', address }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const [error, setError] = useState(false);
  const [geo, setGeo] = useState<GeoStatus>('idle');
  const [dest, setDest] = useState<{ lat: number; lng: number } | null>(null);

  const distanceMi = dest ? haversineMiles(PICKUP, dest) : null;

  // ── Init the map once ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          center: [PICKUP.lat, PICKUP.lng],
          zoom: 11,
          scrollWheelZoom: false,
          zoomControl: true,
          attributionControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap',
        }).addTo(map);

        L.circle([PICKUP.lat, PICKUP.lng], {
          radius: RADIUS_METERS,
          color: '#bf4a25',
          weight: 2,
          fillColor: '#bf4a25',
          fillOpacity: 0.12,
        }).addTo(map);

        L.marker([PICKUP.lat, PICKUP.lng], { icon: pinIcon(L, '#bf4a25') }).addTo(map);

        const sw: [number, number] = [PICKUP.lat - 0.11, PICKUP.lng - 0.14];
        const ne: [number, number] = [PICKUP.lat + 0.11, PICKUP.lng + 0.14];
        map.fitBounds(L.latLngBounds([sw, ne]), { padding: [8, 8] });

        mapRef.current = map;
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* noop */ }
        mapRef.current = null;
        destMarkerRef.current = null;
      }
    };
  }, []);

  // ── Geocode the typed address (debounced, free Nominatim) ────────
  useEffect(() => {
    const street = address?.street?.trim();
    const city = address?.city?.trim();
    const zip = address?.zip?.trim();
    if (!street || !city || !zip) {
      setGeo('idle');
      setDest(null);
      return;
    }

    setGeo('searching');
    let cancelled = false;
    const handle = setTimeout(async () => {
      // Server-side geocode (US Census → Nominatim) — strong on US home
      // addresses, so it agrees with the courier's geocoder far more often.
      const hit = await geocodeAddress({ street, city, zip });
      if (cancelled) return;
      if (hit) {
        setDest({ lat: hit.lat, lng: hit.lng });
        setGeo('found');
      } else {
        setDest(null);
        setGeo('notfound');
      }
    }, 800);

    return () => { cancelled = true; clearTimeout(handle); };
  }, [address?.street, address?.city, address?.zip]);

  // ── Reflect the geocoded destination on the map ──────────────────
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    if (destMarkerRef.current) {
      try { map.removeLayer(destMarkerRef.current); } catch { /* noop */ }
      destMarkerRef.current = null;
    }

    if (!dest) return;

    const inRange = distanceMi != null && distanceMi <= RADIUS_MILES;
    destMarkerRef.current = L.marker([dest.lat, dest.lng], {
      icon: pinIcon(L, inRange ? '#2f7d4f' : '#a3341c'),
    }).addTo(map);

    map.fitBounds(
      L.latLngBounds([
        [PICKUP.lat, PICKUP.lng],
        [dest.lat, dest.lng],
      ]),
      { padding: [34, 34], maxZoom: 14 }
    );
  }, [dest, distanceMi]);

  const t = (en: string, es: string) => (lang === 'en' ? en : es);

  if (error) {
    return (
      <div className={`rounded-xl border border-line bg-cream-deep/60 px-3.5 py-3 text-[0.82rem] text-ink-soft ${className}`}>
        <span aria-hidden className="mr-1">🗺️</span>
        {t(
          'Delivery area map unavailable right now. Couriers deliver within roughly 8 miles of the restaurant.',
          'Mapa de área de entrega no disponible. Los couriers entregan aproximadamente a 8 millas del restaurante.'
        )}
      </div>
    );
  }

  const headerRight =
    geo === 'found' && distanceMi != null
      ? lang === 'en'
        ? `${distanceMi.toFixed(1)} mi from restaurant`
        : `${(distanceMi * 1.60934).toFixed(1)} km del restaurante`
      : t('~7 mi from restaurant', '~11 km del restaurante');

  return (
    <div className={`rounded-xl overflow-hidden border border-line bg-cream-deep/60 ${className}`}>
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-line bg-cream-card/70">
        <div className="flex items-center gap-1.5">
          <span aria-hidden>🚗</span>
          <span className="text-[0.78rem] font-semibold text-ink tracking-wide">
            {t('Delivery area', 'Área de entrega')}
          </span>
        </div>
        <span className="text-[0.7rem] text-ink-mute">{headerRight}</span>
      </div>
      <div
        ref={containerRef}
        data-lenis-prevent
        className="w-full h-[220px] bg-cream"
        aria-label={t('Map of the delivery area around Sample Bistro', 'Mapa del área de entrega cerca de Sample Bistro')}
      />

      {/* Geocode status line — the "is my address real?" confirmation */}
      {geo === 'searching' && (
        <p className="px-3.5 py-2 text-[0.72rem] text-ink-mute leading-snug border-t border-line italic">
          {t('Locating your address…', 'Localizando tu dirección…')}
        </p>
      )}
      {geo === 'found' && (
        <p className="px-3.5 py-2 text-[0.72rem] leading-snug border-t border-line" style={{ color: '#2f7d4f' }}>
          <span aria-hidden className="mr-1">✓</span>
          {t('Address located on the map', 'Dirección ubicada en el mapa')}
          {distanceMi != null && distanceMi > RADIUS_MILES && (
            <span className="text-ink-mute">
              {' '}· {t('looks farther than our usual range', 'parece más lejos de nuestro rango habitual')}
            </span>
          )}
        </p>
      )}
      {geo === 'notfound' && (
        <p className="px-3.5 py-2 text-[0.72rem] leading-snug border-t border-line text-ink-mute">
          <span aria-hidden className="mr-1">📍</span>
          {t(
            'We couldn\'t drop an exact pin for this address, but we\'ll still confirm delivery and the fee at checkout. Double-check the street, city, and ZIP so the driver finds you.',
            'No pudimos colocar un marcador exacto, pero confirmaremos la entrega y la tarifa al finalizar. Revisa la calle, ciudad y código postal para que el repartidor te encuentre.'
          )}
        </p>
      )}
      {geo === 'idle' && (
        <p className="px-3.5 py-2 text-[0.72rem] text-ink-mute leading-snug border-t border-line">
          {t(
            'Enter your address below — we\'ll drop a pin and confirm the exact fee at checkout.',
            'Ingresa tu dirección abajo — colocaremos un marcador y confirmaremos la tarifa exacta al finalizar.'
          )}
        </p>
      )}
    </div>
  );
}
