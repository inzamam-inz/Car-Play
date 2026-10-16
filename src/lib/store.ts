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

const K_LAYOUT = 'gari.layout.v1';
const K_NOTES = 'gari.notes.v1';
const K_SETTINGS = 'gari.settings.v1';

export const DEFAULT_TILES: Tile[] = [
  { id: 't-clock', kind: 'clock', size: '6', title: 'Clock', icon: '🕒' },
  { id: 't-weather', kind: 'weather', size: '6', title: 'Weather', icon: '🌤️' },
  { id: 't-notes', kind: 'notes', size: '6', tall: true, title: 'Quick notes', icon: '📝' },
  { id: 't-yt', kind: 'youtube', size: '6', tall: true, title: 'YouTube', icon: '▶️' },
  { id: 't-home', kind: 'maps', size: '3', title: 'Home', icon: '🏠', address: '' },
  { id: 't-work', kind: 'maps', size: '3', title: 'Work', icon: '💼', address: '' },
  { id: 't-ytm', kind: 'shortcut', size: '6', title: 'YouTube Music', icon: '🎵', url: 'https://music.youtube.com' },
  { id: 't-fuel', kind: 'shortcut', size: '6', title: 'Nearby fuel', icon: '⛽', url: 'https://www.google.com/maps/search/fuel+near+me' },
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
  return v?.length ? v : DEFAULT_TILES;
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
      tiles: o.tiles,
      notes: Array.isArray(o.notes) ? o.notes : [],
      settings: { ...DEFAULT_SETTINGS, ...o.settings },
    };
  } catch {
    return null;
  }
}
