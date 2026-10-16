// GPS + Open-Meteo (no API key). Cached so offline still shows last reading.
import { get, set } from 'idb-keyval';

export interface Wx {
  tempC: number;
  code: number;
  time: string;
  place: string;
}

const K_WX = 'gari.wx.v1';
const K_POS = 'gari.pos.v1';

export function codeLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Cloudy';
  if (code <= 49) return 'Fog';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 99) return 'Storm';
  return '—';
}
export function codeKind(code: number): 'sun' | 'cloud' {
  return code === 0 ? 'sun' : 'cloud';
}

function gps(): Promise<GeolocationPosition> {
  return new Promise((res, rej) => {
    if (!('geolocation' in navigator)) return rej(new Error('no-geolocation'));
    navigator.geolocation.getCurrentPosition(res, rej, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 600_000,
    });
  });
}

async function geocodeCity(city: string): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
    );
    const j = await r.json();
    const hit = j?.results?.[0];
    if (!hit) return null;
    return { lat: hit.latitude, lon: hit.longitude, name: hit.name };
  } catch {
    return null;
  }
}

export async function fetchWeather(cityOverride: string): Promise<Wx | null> {
  let lat: number | null = null;
  let lon: number | null = null;
  let place = '';
  if (cityOverride.trim()) {
    const g = await geocodeCity(cityOverride.trim());
    if (g) {
      ({ lat, lon } = g);
      place = g.name;
    }
  }
  if (lat == null) {
    try {
      const pos = await gps();
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
      place = 'GPS';
      set(K_POS, { lat, lon }).catch(() => {});
    } catch {
      const cached = await get<{ lat: number; lon: number }>(K_POS).catch(() => undefined);
      if (cached) {
        lat = cached.lat;
        lon = cached.lon;
        place = 'Last fix';
      }
    }
  }
  if (lat == null || lon == null) return get<Wx>(K_WX).catch(() => null).then((v) => v ?? null);
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
    );
    const j = await r.json();
    const wx: Wx = {
      tempC: Math.round(j.current.temperature_2m),
      code: j.current.weather_code,
      time: j.current.time,
      place,
    };
    set(K_WX, wx).catch(() => {});
    return wx;
  } catch {
    return (await get<Wx>(K_WX).catch(() => undefined)) ?? null;
  }
}

export const fmtTemp = (c: number, units: 'metric' | 'imperial') =>
  units === 'imperial' ? `${Math.round((c * 9) / 5 + 32)}°F` : `${c}°C`;
