export function nowParts(): { time: string; date: string; hour: number } {
  const d = new Date();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  return { time, date, hour: d.getHours() };
}

export function mapsUrl(dest: string): string {
  const q = encodeURIComponent(dest || '');
  const ua = navigator.userAgent;
  // iOS prefers Apple Maps universal link; everything else gets Google.
  if (/iPad|iPhone|iPod/.test(ua)) return `https://maps.apple.com/?daddr=${q}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

/**
 * Deep link that hands a destination to the phone's own maps app.
 *
 * A route inside an iframe can never be live turn-by-turn, so this is the exit
 * hatch: `geo:` is an Android intent (opens the Maps app, or a chooser if
 * several are installed), `maps://` is Apple Maps and is present on every iOS
 * device. Desktop, which has no such app, gets the Maps website.
 */
export function navAppUrl(dest: string): string {
  // encodeURIComponent leaves !'()* alone; intent URIs (geo:) are picky, so
  // escape them too rather than trust every handler.
  const q = encodeURIComponent(dest || '').replace(
    /['!()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  if (!q) return '';
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (iOS) return `maps://?daddr=${q}`;
  if (/Android/.test(ua)) return `geo:0,0?q=${q}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}
