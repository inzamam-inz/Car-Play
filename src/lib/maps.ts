// Google Maps embed without an API key. Two keyless endpoints are used:
// `output=embed` for a place viewport, and the classic `f=d` form for
// directions. Both are frameable; neither can track your position.
// (Deep-linking into the Maps app lives in clock.ts as `mapsUrl`.)

export function embedUrl(opts: {
  dest?: string;
  lat?: number | null;
  lon?: number | null;
}): string {
  const { dest, lat, lon } = opts;
  if (dest) return `https://www.google.com/maps?q=${encodeURIComponent(dest)}&z=14&output=embed`;
  if (lat != null && lon != null) return `https://www.google.com/maps?q=${lat},${lon}&z=15&output=embed`;
  return '';
}

/**
 * Keyless directions embed. The classic `output=embed` endpoint accepts
 * saddr/daddr and renders the route plus Google's step list inside the frame,
 * so navigation stays in the app instead of opening a tab.
 */
export function directionsUrl(from: string, to: string): string {
  const qs = new URLSearchParams({ f: 'd', saddr: from, daddr: to, output: 'embed' });
  return `https://maps.google.com/maps?${qs.toString()}`;
}
