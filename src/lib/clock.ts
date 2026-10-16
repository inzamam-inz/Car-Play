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
