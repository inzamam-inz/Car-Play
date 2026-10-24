import type { Tile, Note, Settings } from '../lib/store';
import type { Wx } from '../lib/weather';
import { codeLabel, fmtTemp, codeKind } from '../lib/weather';
import { compass, formatSpeed, useGeo } from '../lib/speed';
import { nowParts } from '../lib/clock';
import { Icon } from '../ui/icons';
import { useEffect, useState } from 'preact/hooks';

export interface TileCtx {
  tiles: Tile[];
  notes: Note[];
  settings: Settings;
  wx: Wx | null;
  openPanel: (p: string) => void;
  /** Show a destination inside the Navigation view (no new tab). */
  navigateTo: (dest: string) => void;
}

export function ClockBody() {
  const [t, setT] = useState(nowParts());
  useEffect(() => {
    const i = setInterval(() => setT(nowParts()), 10_000);
    return () => clearInterval(i);
  }, []);
  return (
    <>
      <div class="t-top"><Icon name="clock" size={16} /><span class="micro">Local</span></div>
      <div class="t-big hero">{t.time}</div>
      <div class="t-sub">{t.date}</div>
    </>
  );
}

export function WeatherBody({ wx, settings }: { wx: Wx | null; settings: Settings }) {
  if (!wx) {
    return (
      <>
        <div class="t-top"><Icon name="cloud" size={16} /><span class="micro">Weather</span></div>
        <div class="t-sub">Waiting for location…</div>
      </>
    );
  }
  return (
    <>
      <div class="t-top">
        <Icon name={codeKind(wx.code)} size={16} />
        <span class="micro">{codeLabel(wx.code)}</span>
      </div>
      <div class="t-big">{fmtTemp(wx.tempC, settings.units)}</div>
      <div class="t-sub">{wx.place}</div>
    </>
  );
}

export function SpeedBody({ settings }: { settings: Settings }) {
  const geo = useGeo();
  const { value, unit } = formatSpeed(geo.mps, settings.units);
  return (
    <>
      <div class="t-top">
        <Icon name="speed" size={16} />
        <span class="micro">Speed</span>
      </div>
      <div class="t-big">
        {value}
        <span class="t-unit">{unit}</span>
      </div>
      <div class="t-sub">{geo.error || compass(geo.heading)}</div>
    </>
  );
}

export function NotesBody({ notes }: { notes: Note[] }) {
  const open = notes.filter((n) => !n.done).slice(0, 3);
  return (
    <>
      <div class="t-top"><Icon name="notes" size={16} /><span class="micro">Notes</span></div>
      {open.length ? (
        <div class="t-lines">
          {open.map((n) => <span key={n.id}>{n.text}</span>)}
        </div>
      ) : (
        <div class="t-sub">Nothing yet — tap to add</div>
      )}
    </>
  );
}

export function ShortcutBody({ tile }: { tile: Tile }) {
  const isMaps = tile.kind === 'maps';
  return (
    <>
      <div class="t-top">
        <Icon name={tile.icon || (isMaps ? 'pin' : 'link')} size={16} />
        <span class="micro">{isMaps ? 'Navigate' : 'Open'}</span>
      </div>
      <div class="t-label">{tile.title}</div>
      <div class="t-sub">{isMaps ? tile.address || 'Set destination' : hostOf(tile.url)}</div>
    </>
  );
}

function hostOf(url?: string): string {
  if (!url) return 'Set link';
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url.slice(0, 28);
  }
}

export function YouTubeBody({ settings }: { settings: Settings }) {
  const id = settings.ytPlaylist.trim();
  if (!id) {
    return (
      <>
        <div class="t-top"><Icon name="play" size={16} /><span class="micro">YouTube</span></div>
        <div class="t-sub">Add a playlist in Settings</div>
      </>
    );
  }
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
  if (tile.kind === 'clock') return;
  if (tile.kind === 'speed') return;
  if (tile.kind === 'notes') return ctx.openPanel('notes');
  if (tile.kind === 'weather') return ctx.openPanel('weather');
  if (tile.kind === 'youtube') return ctx.openPanel('youtube');
  if (tile.kind === 'maps') {
    // Navigation happens in the Navigation view, not a new browser tab.
    if (!tile.address) return ctx.openPanel('shortcuts');
    ctx.navigateTo(tile.address);
    return;
  }
  if (tile.url) window.open(tile.url, '_blank', 'noopener');
  else ctx.openPanel('shortcuts');
}
