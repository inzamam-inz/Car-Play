import type { Tile, Note, Settings } from '../lib/store';
import type { Wx } from '../lib/weather';
import { codeIcon, codeLabel, fmtTemp } from '../lib/weather';
import { mapsUrl, nowParts } from '../lib/clock';
import { useEffect, useState } from 'preact/hooks';

export interface TileCtx {
  tiles: Tile[];
  notes: Note[];
  settings: Settings;
  wx: Wx | null;
  openPanel: (p: string) => void;
}

export function ClockBody() {
  const [t, setT] = useState(nowParts());
  useEffect(() => {
    const i = setInterval(() => setT(nowParts()), 10_000);
    return () => clearInterval(i);
  }, []);
  return (
    <>
      <div style={{ fontSize: 38, fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05 }}>{t.time}</div>
      <div class="t-label">{t.date}</div>
    </>
  );
}

export function WeatherBody({ wx, settings }: { wx: Wx | null; settings: Settings }) {
  if (!wx) return <div class="t-value">No data yet — check connection / GPS</div>;
  return (
    <>
      <div class="t-icon">{codeIcon(wx.code)}</div>
      <div style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.05 }}>{fmtTemp(wx.tempC, settings.units)}</div>
      <div class="t-label">
        {codeLabel(wx.code)} · {wx.place}
      </div>
    </>
  );
}

export function NotesBody({ notes }: { notes: Note[] }) {
  const open = notes.filter((n) => !n.done).slice(0, 4);
  if (!notes.length) return <div class="t-value">Tap to add your first note</div>;
  return (
    <>
      {open.map((n) => (
        <div class="t-value" style={{ fontSize: 17, color: 'var(--text)' }} key={n.id}>
          • {n.text.slice(0, 60)}
        </div>
      ))}
      <div class="t-value">
        {open.length} open / {notes.length} total
      </div>
    </>
  );
}

export function ShortcutBody({ tile }: { tile: Tile }) {
  return (
    <>
      <div class="t-icon">{tile.icon}</div>
      <div class="t-label">{tile.title}</div>
      <div class="t-value">{tile.kind === 'maps' ? tile.address || 'Set destination…' : hostOf(tile.url)}</div>
    </>
  );
}

function hostOf(url?: string): string {
  if (!url) return 'Set link…';
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url.slice(0, 28);
  }
}

export function YouTubeBody({ settings }: { settings: Settings }) {
  const id = settings.ytPlaylist.trim();
  if (!id) return <div class="t-value">Set a playlist ID in Settings</div>;
  const src = id.startsWith('PL')
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(id)}&playsinline=1&rel=0`
    : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?playsinline=1&rel=0`;
  return (
    <div class="yt-wrap">
      <iframe src={src} title="YouTube" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
    </div>
  );
}

export function activateTile(tile: Tile, ctx: TileCtx) {
  if (tile.kind === 'notes') return ctx.openPanel('notes');
  if (tile.kind === 'weather') return ctx.openPanel('weather');
  if (tile.kind === 'youtube') return ctx.openPanel('youtube');
  if (tile.kind === 'clock') return;
  if (tile.kind === 'maps') {
    if (!tile.address) return ctx.openPanel('shortcuts');
    window.open(mapsUrl(tile.address), '_blank', 'noopener');
    return;
  }
  if (tile.url) window.open(tile.url, '_blank', 'noopener');
  else ctx.openPanel('shortcuts');
}
