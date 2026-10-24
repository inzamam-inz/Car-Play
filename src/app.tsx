import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  loadLayout, saveLayout, loadNotes, saveNotes, loadSettings, saveSettings,
  DEFAULT_SETTINGS, type Note, type Settings, type Tile,
} from './lib/store';
import { fetchWeather, fmtTemp, codeLabel, type Wx } from './lib/weather';
import { nowParts } from './lib/clock';
import { capabilityReport, isStandalone } from './lib/platform';
import { SessionKeeper, bindVisibilityReacquire } from './lib/session';
import { useGeo } from './lib/speed';
import { useTrip } from './lib/trip';
import { enterCarMode, exitCarMode } from './lib/fullscreen';
import { ClockBody, NotesBody, ShortcutBody, SpeedBody, WeatherBody, YouTubeBody, activateTile } from './tiles/bodies';
import { AddTilePanel, NotesPanel, SettingsPanel, WeatherPanel, YouTubePanel } from './panels/panels';
import { NavigationView } from './views/navigation';
import { Icon, type IconName } from './ui/icons';

// The four left-rail destinations. There is no bottom bar.
type ViewKey = 'dashboard' | 'navigation' | 'settings' | 'edit';

const COLS = 12;
const ROWS = 4;

interface Placed {
  tile: Tile;
  x: number;
  y: number;
  w: number;
  h: number;
}

// First-fit rectangle packing into 12x4 pages. Placement is explicit
// (rendered as gridColumn/gridRow), so a page can never overflow.
function packPages(tiles: Tile[]): Placed[][] {
  const pages: Placed[][] = [];
  const fresh = () => Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  let grid: boolean[][] = fresh();
  let cur: Placed[] = [];
  for (const tile of tiles) {
    const w = tile.size === '3' ? 3 : tile.size === '12' ? 12 : 6;
    const h = tile.tall ? 2 : 1;
    let found: Placed | null = null;
    for (let y = 0; y <= ROWS - h && !found; y++) {
      for (let x = 0; x <= COLS - w && !found; x++) {
        let ok = true;
        for (let dy = 0; dy < h && ok; dy++)
          for (let dx = 0; dx < w; dx++)
            if (grid[y + dy][x + dx]) { ok = false; break; }
        if (ok) {
          for (let dy = 0; dy < h; dy++)
            for (let dx = 0; dx < w; dx++) grid[y + dy][x + dx] = true;
          found = { tile, x, y, w, h };
        }
      }
    }
    if (!found) {
      pages.push(cur);
      cur = [];
      grid = fresh();
      for (let dy = 0; dy < h; dy++)
        for (let dx = 0; dx < w; dx++) grid[dy][dx] = true;
      found = { tile, x: 0, y: 0, w, h };
    }
    cur.push(found);
  }
  if (cur.length) pages.push(cur);
  return pages;
}

export function App() {
  const [tiles, setTilesState] = useState<Tile[]>([]);
  const [notes, setNotesState] = useState<Note[]>([]);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<ViewKey>('dashboard');
  const [panel, setPanel] = useState<string | null>(null);
  /** Tile currently being reconfigured from the Edit view. */
  const [editTile, setEditTile] = useState<Tile | null>(null);
  /** Destination shown in the Navigation view; '' means current location. */
  const [navDest, setNavDest] = useState('');
  const [page, setPage] = useState(0);
  const [wx, setWx] = useState<Wx | null>(null);
  const [clock, setClock] = useState(nowParts());
  const [awake, setAwake] = useState(false);
  const [carMode, setCarMode] = useState(isStandalone());
  const [debug, setDebug] = useState('');
  const keeper = useRef(new SessionKeeper());

  // One GPS watcher for the whole app: the speed tile, the navigation view and
  // the trip recorder all read the same fixes.
  const geo = useGeo();
  const trip = useTrip(geo);

  useEffect(() => {
    (async () => {
      const [t, n, s] = await Promise.all([loadLayout(), loadNotes(), loadSettings()]);
      setTilesState(t); setNotesState(n); setSettingsState(s); setLoaded(true);
    })();
    const ci = setInterval(() => setClock(nowParts()), 10_000);
    bindVisibilityReacquire(keeper.current, () => awake);
    setDebug(capabilityReport());
    return () => clearInterval(ci);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTiles = (t: Tile[]) => { setTilesState(t); saveLayout(t); setPage(0); };
  const setNotes = (n: Note[]) => { setNotesState(n); saveNotes(n); };
  const setSettings = (s: Settings) => { setSettingsState(s); saveSettings(s); };

  const refreshWx = async () => {
    const w = await fetchWeather(settings.city);
    if (w) setWx(w);
  };
  useEffect(() => {
    if (!loaded) return;
    refreshWx();
    const i = setInterval(refreshWx, 15 * 60_000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, settings.city]);

  const night = settings.theme === 'night' || (settings.theme === 'auto' && (clock.hour >= 18 || clock.hour < 6));
  useEffect(() => {
    document.documentElement.dataset.theme = night ? 'night' : 'day';
  }, [night]);

  // A trip is pointless if the screen sleeps and the browser freezes the page,
  // so hold the screen awake while tracking, then let it go when the trip ends.
  // If the user already had it on, leave their choice alone.
  const autoAwake = useRef(false);
  useEffect(() => {
    if (!trip.active) {
      if (!autoAwake.current) return;
      autoAwake.current = false;
      void keeper.current.release();
      setAwake(false);
      return;
    }
    if (awake) return;
    keeper.current
      .enable()
      .then((mode) => {
        if (mode === 'none') return;
        autoAwake.current = true;
        setAwake(true);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!trip.active]);

  const pages = useMemo(() => packPages(tiles), [tiles]);
  useEffect(() => {
    if (page > pages.length - 1) setPage(Math.max(0, pages.length - 1));
  }, [pages.length, page]);

  const go = (v: ViewKey) => { setView(v); setPanel(null); setEditTile(null); setPage(0); };

  const closePanel = () => { setPanel(null); setEditTile(null); };
  /** Open the add-tile tray, optionally pre-loaded to edit an existing tile. */
  const openAdd = (t: Tile | null) => { setEditTile(t); setPanel('add'); };

  // Tiles ask for a panel; the add-tile form lives inside the Edit view.
  const openPanel = (p: string) => {
    if (p === 'shortcuts') return go('edit');
    if (p === 'settings') return go('settings');
    setPanel(p);
  };

  /** Location tiles land in the Navigation view with the place pre-selected. */
  const navigateTo = (dest: string) => {
    setNavDest(dest);
    setView('navigation');
    setPanel(null);
    setEditTile(null);
    setPage(0);
  };

  const toggleAwake = async () => {
    if (awake) { await keeper.current.release(); setAwake(false); }
    else { await keeper.current.enable(); setAwake(true); }
  };
  const toggleCar = async () => {
    if (carMode && !isStandalone()) { await exitCarMode(); setCarMode(false); }
    else { const ok = await enterCarMode(); setCarMode(ok || isStandalone()); }
  };

  const moveTile = (id: string, dir: -1 | 1) => {
    const i = tiles.findIndex((t) => t.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= tiles.length) return;
    const next = [...tiles];
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
    setTiles(next);
  };
  const cycleSize = (id: string) => {
    setTiles(
      tiles.map((t) =>
        t.id === id ? { ...t, size: t.size === '3' ? '6' : t.size === '6' ? '12' : '3' } : t,
      ),
    );
  };
  const deleteTile = (id: string) => setTiles(tiles.filter((x) => x.id !== id));

  const ctx = { tiles, notes, settings, wx, openPanel, navigateTo };

  // touch swipe between pages
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: any) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: any) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 60) setPage((p) => Math.min(pages.length - 1, Math.max(0, p + (dx < 0 ? 1 : -1))));
    touchX.current = null;
  };

  const grid = (editing: boolean) => (
    <div class="pages" style={{ transform: `translateX(-${page * 100}%)` }}>
      {pages.map((pg, i) => (
        <div class="page" key={i}>
          {pg.map((p) => {
            const t = p.tile;
            return (
              <div
                key={t.id}
                class={`tile${editing ? ' editing' : ''}`}
                style={{ gridColumn: `${p.x + 1} / span ${p.w}`, gridRow: `${p.y + 1} / span ${p.h}` }}
                onClick={() => {
                  if (editing) {
                    // Locations and links are configurable; taps open the form.
                    if (t.kind === 'maps' || t.kind === 'shortcut') openAdd(t);
                    return;
                  }
                  if (t.kind === 'notes') openPanel('notes');
                  else activateTile(t, ctx);
                }}
              >
                {editing && (
                  <div class="tile-tools" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => moveTile(t.id, -1)} title="Move earlier"><Icon name="chevL" size={18} /></button>
                    <button onClick={() => moveTile(t.id, 1)} title="Move later"><Icon name="chevR" size={18} /></button>
                    <button onClick={() => cycleSize(t.id)} title="Resize"><Icon name="expand" size={18} /></button>
                    <button onClick={() => deleteTile(t.id)} title="Remove"><Icon name="x" size={18} /></button>
                  </div>
                )}
                {t.kind === 'clock' && <ClockBody />}
                {t.kind === 'speed' && <SpeedBody settings={settings} geo={geo} />}
                {t.kind === 'weather' && <WeatherBody wx={wx} settings={settings} />}
                {t.kind === 'notes' && <NotesBody notes={notes} />}
                {(t.kind === 'shortcut' || t.kind === 'maps') && <ShortcutBody tile={t} />}
                {t.kind === 'youtube' && <YouTubeBody settings={settings} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  if (!loaded) return <div style={{ padding: 40, fontSize: 20 }}>Loading Gari…</div>;

  return (
    <div class="shell">
      <header class="statusbar">
        <div>
          <span class="time">{clock.time}</span>
          <span class="date">{clock.date}</span>
        </div>
        <div class="wx">
          {wx ? `${fmtTemp(wx.tempC, settings.units)} · ${codeLabel(wx.code)} · ${wx.place}` : 'Locating…'}
        </div>
        <div class="right">
          {!isStandalone() && (
            <button class="icon-btn" onClick={toggleCar} title="Fullscreen and lock landscape">
              <Icon name="expand" size={19} />
            </button>
          )}
          <button class={`icon-btn${awake ? ' on' : ''}`} onClick={toggleAwake} title="Keep screen awake">
            <Icon name="bolt" size={19} />
          </button>
          <button
            class={`icon-btn${settings.brightness > 0 ? ' on' : ''}`}
            onClick={() => setSettings({ ...settings, brightness: settings.brightness > 0 ? 0 : 0.4 })}
            title="Dim display"
          >
            <Icon name="dim" size={19} />
          </button>
          <button class="icon-btn" onClick={() => setSettings({ ...settings, theme: night ? 'day' : 'night' })} title="Day / night">
            <Icon name={night ? 'moon' : 'sun'} size={19} />
          </button>
        </div>
      </header>

      <nav class="rail">
        <RailBtn active={view === 'dashboard'} icon="dash" label="Dashboard" onClick={() => go('dashboard')} />
        <RailBtn active={view === 'navigation'} icon="nav" label="Navigation" onClick={() => go('navigation')} />
        <RailBtn active={view === 'settings'} icon="gear" label="Settings" onClick={() => go('settings')} />
        <div class="rail-spacer" />
        <RailBtn active={view === 'edit'} icon="pencil" label="Edit" onClick={() => go('edit')} />
      </nav>

      <main class="main">
        {view === 'dashboard' && (
          <div class="view-dash" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {!pages.length && (
              <p class="hint empty">No tiles yet — open Edit in the left rail to build your dash.</p>
            )}
            {grid(false)}
            {pages.length > 1 && (
              <div class="dots">{pages.map((_, i) => <i key={i} class={i === page ? 'on' : ''} />)}</div>
            )}
            <div class="rotate-hint">Rotate to landscape for the full dash</div>
          </div>
        )}

        {view === 'navigation' && (
          <NavigationView
            settings={settings}
            tiles={tiles}
            geo={geo}
            trip={trip}
            dest={navDest}
            setDest={setNavDest}
            onEdit={() => go('edit')}
          />
        )}

        {view === 'settings' && (
          <div class="view-scroll">
            <SettingsPanel
              settings={settings}
              setSettings={setSettings}
              tiles={tiles}
              setTiles={setTiles}
              notes={notes}
              setNotes={setNotes}
              wxRefresh={refreshWx}
            />
            <div class="debug">{debug}</div>
          </div>
        )}

        {view === 'edit' && (
          <div class="view-col">
            <div class="edit-bar">
              <span class="micro">Edit dashboard · tap a location or link to change it</span>
              <div class="row">
                <button class="btn primary" onClick={() => openAdd(null)}>
                  <Icon name="plus" size={16} /> Add tile
                </button>
              </div>
            </div>
            <div class="edit-canvas">
              {!pages.length && <p class="hint empty">No tiles yet — tap Add tile to start.</p>}
              {grid(true)}
            </div>
          </div>
        )}
      </main>

      <div class={`scrim${panel ? ' open' : ''}`} onClick={closePanel} />
      <section class={`tray${panel ? ' open' : ''}`}>
        {panel === 'notes' && <NotesPanel notes={notes} setNotes={setNotes} />}
        {panel === 'weather' && <WeatherPanel wx={wx} settings={settings} refresh={refreshWx} />}
        {panel === 'youtube' && <YouTubePanel settings={settings} setSettings={setSettings} />}
        {panel === 'add' && (
          <AddTilePanel
            key={editTile?.id ?? 'new'}
            tiles={tiles}
            setTiles={setTiles}
            editTile={editTile}
            onClose={closePanel}
          />
        )}
        {panel && (
          <div class="row" style={{ marginTop: 16 }}>
            <button class="btn" onClick={closePanel}>Close</button>
          </div>
        )}
      </section>

      <div class="dim" style={{ opacity: settings.brightness }} />
    </div>
  );
}

function RailBtn({ active, icon, label, onClick }: { active: boolean; icon: IconName; label: string; onClick: () => void }) {
  return (
    <button class={`rail-btn${active ? ' active' : ''}`} onClick={onClick}>
      <Icon name={icon} size={22} />
      {label}
    </button>
  );
}
