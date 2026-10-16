// Ground speed from the device GPS (navigator.geolocation).
// coords.speed is metres/second derived from Doppler, null when there is no fix.

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
