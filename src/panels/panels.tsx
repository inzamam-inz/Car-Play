import { useState } from 'preact/hooks';
import type { Note, Settings, Tile } from '../lib/store';
import { uid, exportAll, parseImport, DEFAULT_TILES, DEFAULT_SETTINGS, BUILTIN_TILES } from '../lib/store';
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

const ICON_CHOICES: IconName[] = [
  'pin', 'home', 'work', 'fuel', 'car', 'music', 'link', 'play', 'notes', 'clock', 'gear',
];

// Presets for the place form. Fuel is a search phrase rather than a single
// address, which is what "directions to fuel" actually means in practice.
const PLACE_PRESETS: { title: string; icon: IconName; target?: string }[] = [
  { title: 'Home', icon: 'home' },
  { title: 'Work', icon: 'work' },
  { title: 'Fuel', icon: 'fuel', target: 'gas station' },
  { title: 'Custom', icon: 'pin' },
];

export function AddTilePanel({
  tiles, setTiles, editTile, onClose,
}: {
  tiles: Tile[];
  setTiles: (t: Tile[]) => void;
  /** When set, the panel edits this tile instead of creating one. */
  editTile: Tile | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<'place' | 'link' | null>(() =>
    editTile ? (editTile.kind === 'maps' ? 'place' : 'link') : null,
  );
  const [editId, setEditId] = useState<string | null>(editTile?.id ?? null);
  const [title, setTitle] = useState(editTile?.title ?? '');
  const [target, setTarget] = useState(
    editTile ? (editTile.kind === 'maps' ? editTile.address ?? '' : editTile.url ?? '') : '',
  );
  const [icon, setIcon] = useState<IconName>((editTile?.icon as IconName) ?? 'pin');

  const valid = title.trim() && target.trim();

  const addQuick = (b: (typeof BUILTIN_TILES)[number]) => {
    const t: Tile = {
      id: uid(),
      kind: b.kind,
      size: b.size,
      tall: b.tall,
      title: b.title,
      icon: b.icon,
      ...(b.url ? { url: b.url } : {}),
    };
    setTiles([...tiles, t]);
    onClose();
  };

  const openForm = (kind: 'place' | 'link') => {
    setForm(kind);
    setEditId(null);
    setTitle('');
    setTarget('');
    setIcon(kind === 'place' ? 'pin' : 'link');
  };

  const submit = () => {
    if (!valid) return;
    const t = title.trim();
    const v = target.trim();
    if (editId) {
      const existing = tiles.find((x) => x.id === editId);
      if (!existing) return;
      const next: Tile = {
        ...existing,
        title: t,
        icon,
        ...(form === 'place' ? { address: v, url: undefined } : { url: v, address: undefined }),
      };
      setTiles(tiles.map((x) => (x.id === editId ? next : x)));
    } else {
      const next: Tile = {
        id: uid(),
        kind: form === 'place' ? 'maps' : 'shortcut',
        size: '3',
        title: t,
        icon,
        ...(form === 'place' ? { address: v } : { url: v }),
      };
      setTiles([...tiles, next]);
    }
    onClose();
  };

  const test = () => {
    if (!target.trim()) return;
    window.open(form === 'place' ? mapsUrl(target.trim()) : target.trim(), '_blank', 'noopener');
  };

  if (!form) {
    return (
      <div>
        <h2>Add tile</h2>
        <div class="field">
          <label>Quick add</label>
          <div class="picker">
            {BUILTIN_TILES.map((b) => (
              <button key={b.title} class="builtin" title={`Add ${b.title}`} onClick={() => addQuick(b)}>
                <Icon name={b.icon} size={18} />
                {b.title}
              </button>
            ))}
          </div>
        </div>
        <div class="field">
          <label>With details</label>
          <div class="picker">
            <button class="builtin" onClick={() => openForm('place')}>
              <Icon name="pin" size={18} /> Location
            </button>
            <button class="builtin" onClick={() => openForm('link')}>
              <Icon name="link" size={18} /> Web link
            </button>
          </div>
        </div>
        <p class="hint">
          Location covers Home, Work, fuel and any custom place. YouTube Music has no embed API,
          so its tile opens the site.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2>{editId ? 'Edit' : 'Add'} {form === 'place' ? 'location' : 'link'}</h2>

      {form === 'place' && (
        <div class="field">
          <label>Preset</label>
          <div class="picker">
            {PLACE_PRESETS.map((p) => (
              <button
                key={p.title}
                class={`builtin${title === p.title ? ' on' : ''}`}
                onClick={() => {
                  setTitle(p.title === 'Custom' ? '' : p.title);
                  setIcon(p.icon);
                  if (p.target) setTarget(p.target);
                }}
              >
                <Icon name={p.icon} size={18} />
                {p.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div class="field">
        <label>Title</label>
        <input
          value={title}
          onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          placeholder={form === 'place' ? 'Home, Fuel, Gym…' : 'Radio, Podcast…'}
        />
      </div>

      <div class="field">
        <label>{form === 'place' ? 'Address or search' : 'URL'}</label>
        <input
          value={target}
          onInput={(e) => setTarget((e.target as HTMLInputElement).value)}
          placeholder={form === 'place' ? '221B Baker Street — or gas station' : 'https://…'}
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
        <button class="btn primary" disabled={!valid} onClick={submit}>
          <Icon name={editId ? 'check' : 'plus'} size={16} /> {editId ? 'Save' : 'Add tile'}
        </button>
        <button class="btn" disabled={!target.trim()} onClick={test}>Test open</button>
        <button class="btn" onClick={() => { setForm(null); setEditId(null); }}>Back</button>
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
        <label>Paste backup JSON to restore</label>        <textarea
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
