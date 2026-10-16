import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  loadLayout, saveLayout, loadNotes, saveNotes, loadSettings, saveSettings,
  type Note, type Settings, type Tile,
} from './lib/store';
import { DEFAULT_SETTINGS } from './lib/store';
import { fetchWeather, fmtTemp, type Wx } from './lib/weather';
import { nowParts } from './lib/clock';
import { capabilityReport, isStandalone } from './lib/platform';
import { SessionKeeper, bindVisibilityReacquire } from './lib/session';
import { enterCarMode, exitCarMode } from './lib/fullscreen';
import { ClockBody, NotesBody, ShortcutBody, WeatherBody, YouTubeBody, activateTile } from './tiles/bodies';
import { LauncherPanel, NotesPanel, SettingsPanel, ShortcutsPanel, WeatherPanel, YouTubePanel } from './panels/panels';

type RailKey = 'home' | 'notes' | 'weather' | 'youtube' | 'settings';

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
  const fresh = () =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(false));
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
  const [rail, setRail] = useState<RailKey>('home');
  const [panel, setPanel] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(false);
  const [wx, setWx] = useState<Wx | null>(null);
  const [clock, setClock] = useState(nowParts());
  const [awake, setAwake] = useState(false);
  const [carMode, setCarMode] = useState(isStandalone());
  const [debug, setDebug] = useState('');
  const keeper = useRef(new SessionKeeper());
  const holdTimer = useRef<any>(null);

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

  const pages = useMemo(() => packPages(tiles), [tiles]);
  useEffect(() => {
    if (page > pages.length - 1) setPage(Math.max(0, pages.length - 1));
  }, [pages.length, page]);

  const openPanel = (p: string) => {
    setPanel(p);
    if (p === 'notes') setRail('notes');
    if (p === 'weather') setRail('weather');
    if (p === 'youtube') setRail('youtube');
    if (p === 'settings') setRail('settings');
  };
  const railGo = (r: RailKey) => {
    setRail(r);
    if (r === 'home') setPanel(null);
    else openPanel(r === 'notes' ? 'notes' : r);
  };

  const toggleAwake = async () => {
    if (awake) { await keeper.current.release(); setAwake(false); }
    else { await keeper.current.enable(); setAwake(true); }
  };
  const toggleCar = async () => {
    if (carMode && !isStandalone()) { await exitCarMode(); setCarMode(false); }
    else { const ok = await enterCarMode(); setCarMode(ok || isStandalone()); }
  };

  const startHold = () => { holdTimer.current = setTimeout(() => setEditing(true), 550); };
  const endHold = () => clearTimeout(holdTimer.current);
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
        t.id === id
          ? { ...t, size: t.size === '3' ? '6' : t.size === '6' ? '12' : '3' }
          : t,
      ),
    );
  };
  const deleteTile = (id: string) => {
    setTiles(tiles.filter((x) => x.id !== id));
  };

  const ctx = { tiles, notes, settings, wx, openPanel };

  // touch swipe between pages
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: any) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: any) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 60) setPage((p) => Math.min(pages.length - 1, Math.max(0, p + (dx < 0 ? 1 : -1))));
    touchX.current = null;
  };

  if (!loaded) return <div style={{ padding: 40, fontSize: 20 }}>Loading Gari...</div>;

  return (
    <div class="shell">
      <header class="statusbar">
        <div>
          <span class="clock">{clock.time}</span>
          <span class="date">{clock.date}</span>
        </div>
        <div class="wx">{wx ? `${fmtTemp(wx.tempC, settings.units)} - ${wx.place}` : 'Locating...'}</div>
        <div class="right">
          {!isStandalone() && (
            <button class="chip" onClick={toggleCar} title="Fullscreen + landscape">⛶ Car</button>
          )}
          <button class={`chip${awake ? ' on' : ''}`} onClick={toggleAwake} title="Keep screen awake">
            {awake ? '☀ Awake' : '🌙 Wake'}
          </button>
          <button class="chip" onClick={() => setSettings({ ...settings, theme: night ? 'day' : 'night' })}>
            {night ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <nav class="rail">
        <RailBtn active={rail === 'home'} icon="🏠" label="Home" onClick={() => railGo('home')} />
        <RailBtn active={rail === 'notes'} icon="📝" label="Notes" onClick={() => railGo('notes')} />
        <RailBtn active={rail === 'weather'} icon="🌤️" label="Wx" onClick={() => railGo('weather')} />
        <RailBtn active={rail === 'youtube'} icon="▶️" label="Tube" onClick={() => railGo('youtube')} />
        <RailBtn active={rail === 'settings'} icon="⚙️" label="Set" onClick={() => railGo('settings')} />
      </nav>

      <main class="canvas" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {!pages.length && (
          <div style={{ padding: 40 }}>
            <p class="hint">No tiles yet. Tap Edit, then add a tile to build your dash.</p>
          </div>
        )}
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
                    onTouchStart={startHold}
                    onTouchEnd={endHold}
                    onMouseDown={startHold}
                    onMouseUp={endHold}
                    onClick={() => {
                      if (editing) return;
                      if (t.kind === 'notes') openPanel('notes');
                      else activateTile(t, ctx);
                    }}
                  >
                    {editing && (
                      <div class="tile-tools" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => moveTile(t.id, -1)}>◀</button>
                        <button onClick={() => moveTile(t.id, 1)}>▶</button>
                        <button onClick={() => cycleSize(t.id)}>⤢</button>
                        <button onClick={() => deleteTile(t.id)}>✕</button>
                      </div>
                    )}
                    {t.kind === 'clock' && <ClockBody />}
                    {t.kind === 'weather' && <WeatherBody wx={wx} settings={settings} />}
                    {t.kind === 'notes' && (
                      <div>
                        <div class="t-icon">📝</div>
                        <div class="t-label">Notes</div>
                        <NotesBody notes={notes} />
                      </div>
                    )}
                    {(t.kind === 'shortcut' || t.kind === 'maps') && <ShortcutBody tile={t} />}
                    {t.kind === 'youtube' && (
                      <div>
                        <div class="t-label">▶ YouTube</div>
                        <YouTubeBody settings={settings} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {pages.length > 1 && (
          <div class="dots">{pages.map((_, i) => <i key={i} class={i === page ? 'on' : ''} />)}</div>
        )}
        <div class="rotate-hint">🔄 Rotate to landscape for the full dash</div>
      </main>

      <footer class="dock">
        <div class="group">
          <button class="dock-btn" onClick={() => {
            const v = prompt('Quick note:');
            if (v && v.trim()) setNotes([{ id: `${Date.now()}`, text: v.trim(), done: false, updatedAt: Date.now() }, ...notes]);
          }}>
            ✏️ Note
          </button>
          {editing && (
            <button class="dock-btn" onClick={() => openPanel('shortcuts')}>＋ Add tile</button>
          )}
        </div>
        <div class="group">
          <button class="dock-btn primary" onClick={() => openPanel('launcher')}>🚗 Apps</button>
        </div>
        <div class="group">
          <button class="dock-btn" onClick={() => setEditing(!editing)}>{editing ? '✓ Done' : 'Edit'}</button>
          <button class="dock-btn" onClick={() => setSettings({ ...settings, brightness: settings.brightness > 0 ? 0 : 0.35 })}>🔆</button>
        </div>
      </footer>

      <div class={`scrim${panel ? ' open' : ''}`} onClick={() => setPanel(null)} />
      <section class={`tray${panel ? ' open' : ''}`}>
        {panel === 'notes' && <NotesPanel notes={notes} setNotes={setNotes} quickAdd="" />}
        {panel === 'weather' && <WeatherPanel wx={wx} refresh={refreshWx} />}
        {panel === 'shortcuts' && <ShortcutsPanel tiles={tiles} setTiles={setTiles} />}
        {panel === 'youtube' && <YouTubePanel settings={settings} setSettings={setSettings} />}
        {panel === 'settings' && (
          <SettingsPanel settings={settings} setSettings={setSettings} tiles={tiles} setTiles={setTiles} notes={notes} setNotes={setNotes} wxRefresh={refreshWx} />
        )}
        {panel === 'launcher' && <LauncherPanel openPanel={openPanel} />}
        {panel && (
          <div>
            <div class="row" style={{ marginTop: 16 }}>
              <button class="btn" onClick={() => setPanel(null)}>Close</button>
            </div>
            {panel === 'settings' && <div class="debug">{debug}</div>}
          </div>
        )}
      </section>

      <div class="dim" style={{ opacity: settings.brightness }} />
    </div>
  );
}

function RailBtn({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button class={`rail-btn${active ? ' active' : ''}`} onClick={onClick}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      {label}
    </button>
  );
}
