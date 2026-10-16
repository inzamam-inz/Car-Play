// Google Maps embed without an API key. The `output=embed` endpoint is meant
// for framing and needs no key, but it cannot do turn-by-turn navigation —
// so destination chips deep-link into the real Maps app instead.

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

/** Turn-by-turn deep link for a coordinate pair. */
export function navToCoords(lat: number, lon: number, mapsUrl: (d: string) => string): string {
  return mapsUrl(`${lat},${lon}`);
}
