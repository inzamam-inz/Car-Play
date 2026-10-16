import { useState } from 'preact/hooks';
import type { Note, Settings, Tile } from '../lib/store';
import { uid } from '../lib/store';
import { fetchWeather, fmtTemp, codeLabel } from '../lib/weather';
import type { Wx } from '../lib/weather';
import { mapsUrl } from '../lib/clock';

export function NotesPanel({
  notes, setNotes, quickAdd,
}: {
  notes: Note[];
  setNotes: (n: Note[]) => void;
  quickAdd: string;
}) {
  const [text, setText] = useState(quickAdd);
  const add = () => {
    const t = text.trim();
    if (!t) return;
    setNotes([{ id: uid(), text: t, done: false, updatedAt: Date.now() }, ...notes]);
    setText('');
  };
  return (
    <div>
      <h2>Notes</h2>
      <div class="row">
        <input
          style={{ flex: 1 }}
          placeholder="Quick capture…"
          value={text}
          onInput={(e) => setText((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button class="btn primary" onClick={add}>Add</button>
      </div>
      <div class="list">
        {notes.map((n) => (
          <div class={`note-item${n.done ? ' done' : ''}`} key={n.id}>
            <div class="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ flex: 1 }}>{n.text}</span>
              <button class="btn" onClick={() => setNotes(notes.map((x) => (x.id === n.id ? { ...x, done: !x.done } : x)))}>
                {n.done ? 'Undo' : 'Done'}
              </button>
              <button class="btn danger" onClick={() => setNotes(notes.filter((x) => x.id !== n.id))}>✕</button>
            </div>
          </div>
        ))}
        {!notes.length && <p class="hint">Nothing here yet. Saved on-device, works offline.</p>}
      </div>
    </div>
  );
}

export function WeatherPanel({ wx, refresh }: { wx: Wx | null; refresh: () => void }) {
  return (
    <div>
      <h2>Weather</h2>
      {wx ? (
        <p style={{ fontSize: 20 }}>
          {fmtTemp(wx.tempC, 'metric')} · {codeLabel(wx.code)} · {wx.place}
          <br />
          <span class="hint">Updated {wx.time}</span>
        </p>
      ) : (
        <p class="hint">No reading yet. Allow location (one tap in the browser prompt) or set a city in Settings.</p>
      )}
      <button class="btn primary" onClick={refresh}>Refresh</button>
    </div>
  );
}

export function ShortcutsPanel({
  tiles, setTiles,
}: {
  tiles: Tile[];
  setTiles: (t: Tile[]) => void;
}) {
  const [kind, setKind] = useState<'shortcut' | 'maps'>('shortcut');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [icon, setIcon] = useState('🔗');
  const add = () => {
    if (!title.trim() || !target.trim()) return;
    const t: Tile = {
      id: uid(), kind, size: '3', title: title.trim(), icon: icon || '🔗',
      ...(kind === 'maps' ? { address: target.trim() } : { url: target.trim() }),
    };
    setTiles([...tiles, t]);
    setTitle('');
    setTarget('');
  };
  const test = () => {
    if (!target.trim()) return;
    window.open(kind === 'maps' ? mapsUrl(target.trim()) : target.trim(), '_blank', 'noopener');
  };
  return (
    <div>
      <h2>{kind === 'maps' ? 'Navigation shortcut' : 'Link shortcut'}</h2>
      <div class="row">
        <button class={`btn${kind === 'shortcut' ? ' primary' : ''}`} onClick={() => setKind('shortcut')}>Link</button>
        <button class={`btn${kind === 'maps' ? ' primary' : ''}`} onClick={() => setKind('maps')}>Maps</button>
      </div>
      <div class="field"><label>Title</label><input value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder="Home, Fuel, …" /></div>
      <div class="field"><label>{kind === 'maps' ? 'Destination' : 'URL'}</label><input value={target} onInput={(e) => setTarget((e.target as HTMLInputElement).value)} placeholder={kind === 'maps' ? '123 Main St' : 'https://…'} /></div>
      <div class="field"><label>Emoji icon</label><input value={icon} onInput={(e) => setIcon((e.target as HTMLInputElement).value)} /></div>
      <div class="row">
        <button class="btn primary" onClick={add}>Add tile</button>
        <button class="btn" onClick={test}>Test open</button>
      </div>
    </div>
  );
}

export function YouTubePanel({ settings, setSettings }: { settings: Settings; setSettings: (s: Settings) => void }) {
  return (
    <div>
      <h2>YouTube</h2>
      <p class="hint">Embedded playlist plays while the screen is on. Ads may play; some videos block embedding. YouTube Music has no embed API — use the shortcut tile to hand off.</p>
      <div class="field">
        <label>Playlist ID (starts with PL) or video ID</label>
        <input value={settings.ytPlaylist} onInput={(e) => setSettings({ ...settings, ytPlaylist: (e.target as HTMLInputElement).value })} />
      </div>
      <div class="row">
        <button class="btn" onClick={() => window.open('https://music.youtube.com', '_blank', 'noopener')}>Open YouTube Music</button>
      </div>
    </div>
  );
}

export function SettingsPanel({
  settings, setSettings, tiles, setTiles, notes, setNotes, wxRefresh,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  tiles: Tile[];
  setTiles: (t: Tile[]) => void;
  notes: Note[];
  setNotes: (n: Note[]) => void;
  wxRefresh: () => void;
}) {
  const [imp, setImp] = useState('');
  return (
    <div>
      <h2>Settings</h2>
      <div class="row">
        <div class="field">
          <label>Theme</label>
          <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: (e.target as HTMLSelectElement).value as Settings['theme'] })}>
            <option value="night">Night (Tesla dark)</option>
            <option value="day">Day</option>
            <option value="auto">Auto (18:00–06:00 night)</option>
          </select>
        </div>
        <div class="field">
          <label>Units</label>
          <select value={settings.units} onChange={(e) => setSettings({ ...settings, units: (e.target as HTMLSelectElement).value as Settings['units'] })}>
            <option value="metric">°C</option>
            <option value="imperial">°F</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>City override (blank = GPS)</label>
        <input value={settings.city} onInput={(e) => setSettings({ ...settings, city: (e.target as HTMLInputElement).value })} placeholder="e.g. Berlin" />
      </div>
      <div class="row">
        <button class="btn" onClick={() => { wxRefresh(); }}>Refresh weather</button>
        <button class="btn" onClick={() => setTiles(tiles)}>Save layout</button>
      </div>
      <h2 style={{ marginTop: 20 }}>Backup</h2>
      <div class="row">
        <button class="btn" onClick={() => {
          const { exportAll } = require_export();
          navigator.clipboard?.writeText(exportAll(tiles, notes, settings)).catch(() => {});
          alert('Backup JSON copied to clipboard');
        }}>Copy backup JSON</button>
      </div>
      <div class="field">
        <label>Paste backup JSON to restore</label>
        <textarea value={imp} onInput={(e) => setImp((e.target as HTMLTextAreaElement).value)} placeholder='{"app":"gari",…}' />
      </div>
      <div class="row">
        <button class="btn primary" onClick={() => {
          const { parseImport } = require_export();
          const o = parseImport(imp);
          if (!o) return alert('Invalid backup');
          setTiles(o.tiles); setNotes(o.notes); setSettings(o.settings);
        }}>Restore</button>
      </div>
      <h2 style={{ marginTop: 20 }}>Install</h2>
      <p class="hint">
        Brave Android “Add to Home screen” opens a normal tab (toolbar stays). Use the ⛶ button in the status bar for true fullscreen.
        For a chrome-free icon: Android → install via Chrome · iPad → Safari → Share → Add to Home Screen.
        Keep screen awake: enable “Stay awake” in the status bar; on iPad also set Auto-Lock → Never while driving.
      </p>
    </div>
  );
}

// Avoid circular import: store is tiny, import lazily via static import hoisted by bundler.
import { exportAll as _exportAll, parseImport as _parseImport } from '../lib/store';
function require_export() { return { exportAll: _exportAll, parseImport: _parseImport }; }

export function LauncherPanel({ openPanel }: { openPanel: (p: string) => void }) {
  const apps = [
    { e: '📝', l: 'Notes', p: 'notes' },
    { e: '🌤️', l: 'Weather', p: 'weather' },
    { e: '▶️', l: 'YouTube', p: 'youtube' },
    { e: '🔗', l: 'Shortcuts', p: 'shortcuts' },
    { e: '⚙️', l: 'Settings', p: 'settings' },
  ];
  return (
    <div>
      <h2>Apps</h2>
      <div class="app-grid">
        {apps.map((a) => (
          <button class="app-cell" key={a.p} onClick={() => openPanel(a.p)}>
            <span class="e">{a.e}</span>{a.l}
          </button>
        ))}
      </div>
    </div>
  );
}
