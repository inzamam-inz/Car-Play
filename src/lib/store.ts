import { get, set } from 'idb-keyval';

export type TileSize = '3' | '6' | '12';
export type TileKind =
  | 'clock'
  | 'weather'
  | 'notes'
  | 'shortcut'
  | 'youtube'
  | 'maps';

export interface Tile {
  id: string;
  kind: TileKind;
  size: TileSize;
  tall?: boolean;
  title: string;
  /** icon name from src/ui/icons.tsx */
  icon: string;
  /** kind-specific config */
  url?: string; // shortcut / youtube embed / ytmusic link
  address?: string; // maps destination
}

export interface Note {
  id: string;
  text: string;
  done: boolean;
  updatedAt: number;
}

export interface Settings {
  theme: 'auto' | 'night' | 'day';
  units: 'metric' | 'imperial';
  brightness: number; // 0..0.6 dim overlay
  city: string; // manual weather override, empty = GPS
  ytPlaylist: string; // youtube playlist or video id
}

const K_LAYOUT = 'gari.layout.v2'; // v2: icon names instead of emoji
const K_NOTES = 'gari.notes.v1';
const K_SETTINGS = 'gari.settings.v1';

const SIZES: TileSize[] = ['3', '6', '12'];
const KIND_ICON: Record<TileKind, string> = {
  clock: 'clock',
  weather: 'cloud',
  notes: 'notes',
  youtube: 'play',
  maps: 'pin',
  shortcut: 'link',
};

// Tiles can arrive from older versions, hand-edited backups, or partial
// writes. Coerce everything so a bad value can never break the grid packing.
export function normalizeTiles(input: unknown): Tile[] {
  if (!Array.isArray(input)) return DEFAULT_TILES;
  const out = input
    .filter((t) => t && typeof t === 'object')
    .map((t: any): Tile => {
      const kind: TileKind = (['clock', 'weather', 'notes', 'shortcut', 'youtube', 'maps'] as string[]).includes(t.kind)
        ? t.kind
        : 'shortcut';
      const size: TileSize = SIZES.includes(t.size) ? t.size : '6';
      return {
        id: typeof t.id === 'string' && t.id ? t.id : uid(),
        kind,
        size,
        tall: !!t.tall,
        title: typeof t.title === 'string' && t.title ? t.title : 'Tile',
        icon: typeof t.icon === 'string' && t.icon in KIND_ICON ? t.icon : KIND_ICON[kind],
        url: typeof t.url === 'string' ? t.url : undefined,
        address: typeof t.address === 'string' ? t.address : undefined,
      };
    });
  return out.length ? out : DEFAULT_TILES;
}

// 12x4 grid. This default set packs into exactly one page (no overflow).
//   row 1    clock 6 + weather 6
//   rows 2-3 notes 6 (tall) + youtube 6 (tall)
//   row 4    home 3 + work 3 + fuel 3 + yt music 3
export const DEFAULT_TILES: Tile[] = [
  { id: 't-clock', kind: 'clock', size: '6', title: 'Clock', icon: 'clock' },
  { id: 't-weather', kind: 'weather', size: '6', title: 'Weather', icon: 'cloud' },
  { id: 't-notes', kind: 'notes', size: '6', tall: true, title: 'Notes', icon: 'notes' },
  { id: 't-yt', kind: 'youtube', size: '6', tall: true, title: 'YouTube', icon: 'play' },
  { id: 't-home', kind: 'maps', size: '3', title: 'Home', icon: 'pin', address: '' },
  { id: 't-work', kind: 'maps', size: '3', title: 'Work', icon: 'pin', address: '' },
  { id: 't-fuel', kind: 'shortcut', size: '3', title: 'Fuel', icon: 'fuel', url: 'https://www.google.com/maps/search/fuel+near+me' },
  { id: 't-ytm', kind: 'shortcut', size: '3', title: 'YT Music', icon: 'music', url: 'https://music.youtube.com' },
];

export const DEFAULT_SETTINGS: Settings = {
  theme: 'night',
  units: 'metric',
  brightness: 0,
  city: '',
  ytPlaylist: '',
};

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export async function loadLayout(): Promise<Tile[]> {
  const v = await get<Tile[]>(K_LAYOUT).catch(() => undefined);
  return normalizeTiles(v);
}
export const saveLayout = (t: Tile[]) => set(K_LAYOUT, t);

export async function loadNotes(): Promise<Note[]> {
  const v = await get<Note[]>(K_NOTES).catch(() => undefined);
  return v ?? [];
}
export const saveNotes = (n: Note[]) => set(K_NOTES, n);

export async function loadSettings(): Promise<Settings> {
  const v = await get<Settings>(K_SETTINGS).catch(() => undefined);
  return { ...DEFAULT_SETTINGS, ...v };
}
export const saveSettings = (s: Settings) => set(K_SETTINGS, s);

export function exportAll(t: Tile[], n: Note[], s: Settings): string {
  return JSON.stringify({ app: 'gari', v: 1, tiles: t, notes: n, settings: s }, null, 2);
}

export function parseImport(json: string): { tiles: Tile[]; notes: Note[]; settings: Settings } | null {
  try {
    const o = JSON.parse(json);
    if (o?.app !== 'gari' || !Array.isArray(o.tiles)) return null;
    return {
      tiles: normalizeTiles(o.tiles),
      notes: Array.isArray(o.notes) ? o.notes : [],
      settings: { ...DEFAULT_SETTINGS, ...o.settings },
    };
  } catch {
    return null;
  }
}
