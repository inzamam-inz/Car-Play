import { useState } from 'preact/hooks';
import type { Note, Settings, Tile } from '../lib/store';
import { uid, exportAll, parseImport, DEFAULT_TILES, DEFAULT_SETTINGS } from '../lib/store';
import { fmtTemp, codeLabel } from '../lib/weather';
import type { Wx } from '../lib/weather';
import { mapsUrl } from '../lib/clock';
import { Icon, type IconName } from '../ui/icons';

export function NotesPanel({
  notes, setNotes,
}: {
  notes: Note[];
  setNotes: (n: Note[]) => void;
}) {
  const [text, setText] = useState('');
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
          placeholder="Type a note…"
          value={text}
          onInput={(e) => setText((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button class="btn primary" onClick={add}>Add</button>
      </div>
      <div class="list">
        {notes.map((n) => (
          <div class={`note-item${n.done ? ' done' : ''}`} key={n.id}>
            <button
              class="icon-btn"
              title={n.done ? 'Mark open' : 'Mark done'}
              onClick={() => setNotes(notes.map((x) => (x.id === n.id ? { ...x, done: !x.done } : x)))}
            >
              <Icon name={n.done ? 'check' : 'dash'} size={18} />
            </button>
            <span>{n.text}</span>
            <button class="icon-btn" title="Delete" onClick={() => setNotes(notes.filter((x) => x.id !== n.id))}>
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
        {!notes.length && <p class="hint">Nothing here yet. Saved on this device, works offline.</p>}
      </div>
    </div>
  );
}

export function WeatherPanel({ wx, settings, refresh }: { wx: Wx | null; settings: Settings; refresh: () => void }) {
  return (
    <div>
      <h2>Weather</h2>
      {wx ? (
        <>
          <div style={{ fontSize: 34, fontWeight: 600 }}>{fmtTemp(wx.tempC, settings.units)}</div>
          <p class="hint">
            {codeLabel(wx.code)} · {wx.place}
            <br />
            Updated {wx.time}
          </p>
        </>
      ) : (
        <p class="hint">
          No reading yet. Allow location when prompted, or set a city in Settings.
        </p>
      )}
      <button class="btn" onClick={refresh}>
        <Icon name="refresh" size={16} /> Refresh
      </button>
    </div>
  );
}

const ICON_CHOICES: IconName[] = ['pin', 'link', 'fuel', 'music', 'car', 'notes', 'clock', 'play', 'gear'];

export function ShortcutsPanel({
  tiles, setTiles,
}: {
  tiles: Tile[];
  setTiles: (t: Tile[]) => void;
}) {
  const [kind, setKind] = useState<'shortcut' | 'maps'>('shortcut');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [icon, setIcon] = useState<IconName>('link');
  const valid = title.trim() && target.trim();

  const add = () => {
    if (!valid) return;
    const t: Tile = {
      id: uid(),
      kind,
      size: '3',
      title: title.trim(),
      icon,
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
      <h2>Add tile</h2>
      <div class="row">
        <button class={`btn${kind === 'shortcut' ? ' primary' : ''}`} onClick={() => setKind('shortcut')}>
          <Icon name="link" size={16} /> Link
        </button>
        <button class={`btn${kind === 'maps' ? ' primary' : ''}`} onClick={() => setKind('maps')}>
          <Icon name="pin" size={16} /> Maps
        </button>
      </div>
      <div class="field">
        <label>Title</label>
        <input value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder="Home, Fuel…" />
      </div>
      <div class="field">
        <label>{kind === 'maps' ? 'Destination' : 'URL'}</label>
        <input
          value={target}
          onInput={(e) => setTarget((e.target as HTMLInputElement).value)}
          placeholder={kind === 'maps' ? '221B Baker Street' : 'https://…'}
        />
      </div>
      <div class="field">
        <label>Icon</label>
        <div class="picker">
          {ICON_CHOICES.map((n) => (
            <button key={n} class={icon === n ? 'on' : ''} onClick={() => setIcon(n)} title={n}>
              <Icon name={n} size={20} />
            </button>
          ))}
        </div>
      </div>
      <div class="row">
        <button class="btn primary" disabled={!valid} onClick={add}>
          <Icon name="plus" size={16} /> Add tile
        </button>
        <button class="btn" disabled={!target.trim()} onClick={test}>Test open</button>
      </div>
    </div>
  );
}

export function YouTubePanel({ settings, setSettings }: { settings: Settings; setSettings: (s: Settings) => void }) {
  return (
    <div>
      <h2>YouTube</h2>
      <p class="hint">
        The embedded playlist plays while the screen is on. Ads may play and some videos block embedding.
        YouTube Music has no embed API, so it opens as a shortcut instead.
      </p>
      <div class="field">
        <label>Playlist ID (starts with PL) or video ID</label>
        <input
          value={settings.ytPlaylist}
          placeholder="PLxxxxxxxxxxxxxx"
          onInput={(e) => setSettings({ ...settings, ytPlaylist: (e.target as HTMLInputElement).value })}
        />
      </div>
      <button class="btn" onClick={() => window.open('https://music.youtube.com', '_blank', 'noopener')}>
        <Icon name="music" size={16} /> Open YouTube Music
      </button>
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
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <h2>Settings</h2>
      <div class="row">
        <div class="field">
          <label>Theme</label>
          <select
            value={settings.theme}
            onChange={(e) => setSettings({ ...settings, theme: (e.target as HTMLSelectElement).value as Settings['theme'] })}
          >
            <option value="night">Night</option>
            <option value="day">Day</option>
            <option value="auto">Auto (18:00–06:00)</option>
          </select>
        </div>
        <div class="field">
          <label>Units</label>
          <select
            value={settings.units}
            onChange={(e) => setSettings({ ...settings, units: (e.target as HTMLSelectElement).value as Settings['units'] })}
          >
            <option value="metric">Celsius</option>
            <option value="imperial">Fahrenheit</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>City override (blank = GPS)</label>
        <input
          value={settings.city}
          onInput={(e) => setSettings({ ...settings, city: (e.target as HTMLInputElement).value })}
          placeholder="e.g. Berlin"
        />
      </div>
      <button class="btn" onClick={wxRefresh}>
        <Icon name="refresh" size={16} /> Refresh weather
      </button>

      <div style={{ marginTop: 26 }}><h2>Backup</h2></div>
      <div class="row">
        <button
          class="btn"
          onClick={async () => {
            const json = exportAll(tiles, notes, settings);
            try {
              await navigator.clipboard.writeText(json);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {
              const blob = new Blob([json], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'gari-backup.json';
              a.click();
            }
          }}
        >
          {copied ? <Icon name="check" size={16} /> : <Icon name="notes" size={16} />}
          {copied ? 'Copied' : 'Copy backup'}
        </button>
        <button
          class="btn danger"
          onClick={() => {
            if (!confirm('Reset tiles, notes and settings to defaults?')) return;
            setTiles(DEFAULT_TILES); setNotes([]); setSettings(DEFAULT_SETTINGS);
          }}
        >
          <Icon name="trash" size={16} /> Reset all
        </button>
      </div>
      <div class="field">
        <label>Paste backup JSON to restore</label>
        <textarea
          value={imp}
          onInput={(e) => setImp((e.target as HTMLTextAreaElement).value)}
          placeholder='{"app":"gari", …}'
        />
      </div>
      <button
        class="btn primary"
        onClick={() => {
          const o = parseImport(imp);
          if (!o) return alert('That does not look like a Gari backup.');
          setTiles(o.tiles); setNotes(o.notes); setSettings(o.settings);
        }}
      >
        Restore
      </button>

      <div style={{ marginTop: 26 }}><h2>Install &amp; display</h2></div>
      <p class="hint">
        Brave on Android adds a home-screen shortcut that keeps the toolbar — tap the
        expand icon in the top bar for true fullscreen. For a chrome-free app icon,
        install from Chrome on Android or Safari on iPad (Share → Add to Home Screen).
        On iPad, set Auto-Lock to Never while driving so the display stays on.
      </p>
    </div>
  );
}

export function LauncherPanel({ openPanel }: { openPanel: (p: string) => void }) {
  const apps: { icon: IconName; label: string; panel: string }[] = [
    { icon: 'notes', label: 'Notes', panel: 'notes' },
    { icon: 'cloud', label: 'Weather', panel: 'weather' },
    { icon: 'play', label: 'YouTube', panel: 'youtube' },
    { icon: 'plus', label: 'Add tile', panel: 'shortcuts' },
    { icon: 'gear', label: 'Settings', panel: 'settings' },
  ];
  return (
    <div>
      <h2>Apps</h2>
      <div class="app-grid">
        {apps.map((a) => (
          <button class="app-cell" key={a.panel} onClick={() => openPanel(a.panel)}>
            <Icon name={a.icon} size={22} />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
