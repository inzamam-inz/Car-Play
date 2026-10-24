// Ground speed from the device GPS (navigator.geolocation).
// coords.speed is metres/second derived from Doppler, null when there is no fix.
import { useEffect, useState } from 'preact/hooks';

export function formatSpeed(
  mps: number | null | undefined,
  units: 'metric' | 'imperial',
): { value: string; unit: string } {
  const unit = units === 'metric' ? 'km/h' : 'mph';
  if (mps == null || !Number.isFinite(mps)) return { value: '—', unit };
  const v = units === 'metric' ? mps * 3.6 : mps * 2.236936;
  return { value: String(Math.round(Math.max(0, v))), unit };
}

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function compass(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg)) return 'Stationary';
  const i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return DIRS[i];
}

export interface Geo {
  mps: number | null;
  heading: number | null;
  lat: number | null;
  lon: number | null;
  /** Horizontal accuracy in metres; null when the fix omits it. */
  accuracy: number | null;
  /** Fix timestamp (epoch ms), used by the trip tracker to integrate distance. */
  at: number | null;
  error: string;
}

// Single shared GPS watcher, mounted once in App so the trip tracker and every
// speed readout see the same fixes.
export function useGeo(): Geo {
  const [geo, setGeo] = useState<Geo>({
    mps: null,
    heading: null,
    lat: null,
    lon: null,
    accuracy: null,
    at: null,
    error: '',
  });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeo((g) => ({ ...g, error: 'GPS unavailable' }));
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) =>
        setGeo({
          mps: p.coords.speed,
          heading: p.coords.heading,
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          accuracy: p.coords.accuracy ?? null,
          at: p.timestamp,
          error: '',
        }),
      () => setGeo((g) => ({ ...g, error: 'GPS blocked' })),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return geo;
}
