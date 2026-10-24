// Trip recorder. Distance is integrated from successive GPS fixes, so this
// needs no routing service and no API key — it measures what actually happened
// rather than what a route predicted.
//
// The whole thing is deliberately defensive: a car dashboard loses signal in
// tunnels, parks under roofs, and gets coarse network fixes in cities. A trip
// that occasionally under-reads is useful; one that jumps 2 km because of a bad
// fix is not.
import { del, get, set } from 'idb-keyval';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Geo } from './speed';

export interface Trip {
  /** Human label captured when tracking started. */
  dest: string;
  startedAt: number;
  endedAt: number | null;
  /** Metres travelled, summed from accepted fixes. */
  distance: number;
  /** Best instantaneous speed seen, m/s. */
  maxMps: number;
  /** Milliseconds spent above walking pace. */
  movingMs: number;
  fixes: number;
}

const KEY = 'gari.trip.v1';
const LAST_KEY = 'gari.trip.last.v1';

/** A fix worse than this cannot tell a car park from a motorway. */
const MAX_ACCURACY_M = 100;
/** Above this implied speed it is a GPS teleport, not travel (~300 km/h). */
const MAX_JUMP_MPS = 85;
/** Below this a "movement" is jitter while stationary. */
const MIN_STEP_M = 3;
/** Walking pace; below it we are not moving for trip purposes. */
const MOVING_MPS = 1;
/** Do not resurrect a trip from last week. */
const RESUME_WINDOW_MS = 6 * 60 * 60 * 1000;
const SAVE_EVERY_MS = 5000;

const EARTH_R = 6_371_000;

/** Great-circle metres between two fixes. */
export function distanceM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Duration as m:ss, or h:mm:ss once it passes an hour. */
export function fmtDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function distanceParts(
  metres: number,
  units: 'metric' | 'imperial',
): { value: string; unit: string } {
  const unit = units === 'metric' ? 'km' : 'mi';
  if (!Number.isFinite(metres) || metres < 0) return { value: '—', unit };
  const v = units === 'metric' ? metres / 1000 : metres / 1609.344;
  // Metres matter on short trips; one decimal is enough once you are past 10.
  return { value: v < 10 ? v.toFixed(2) : v.toFixed(1), unit };
}

export function fmtDistance(metres: number, units: 'metric' | 'imperial'): string {
  const p = distanceParts(metres, units);
  return `${p.value} ${p.unit}`;
}

/** Elapsed wall-clock time, frozen at `endedAt` once the trip is over. */
export function elapsedMs(t: Trip, now: number): number {
  return Math.max(0, (t.endedAt ?? now) - t.startedAt);
}

export interface TripApi {
  /** Trip being tracked right now. */
  active: Trip | null;
  /** Trip stopped during this session, shown until dismissed. */
  done: Trip | null;
  /** Most recent completed trip, restored across reloads. */
  last: Trip | null;
  /** Wall clock, updated once a second while tracking. */
  now: number;
  start: (dest: string) => void;
  stop: () => void;
  dismiss: () => void;
}

interface Fix {
  lat: number;
  lon: number;
  at: number;
}

export interface FixInput extends Fix {
  accuracy: number | null;
  mps: number | null;
}

export interface StepResult {
  trip: Trip;
  /** Fix to carry into the next step. */
  prev: Fix;
  /** Whether the odometer moved (used to throttle persistence). */
  moved: boolean;
}

/**
 * Fold one GPS fix into a trip.
 *
 * Pure on purpose: the filtering rules below are where a trip log goes wrong,
 * so they are unit-testable without a device. Returns the fix to remember even
 * when it is rejected, so one bad fix cannot poison every later comparison.
 */
export function stepTrip(t: Trip, prev: Fix | null, f: FixInput): StepResult {
  const fix: Fix = { lat: f.lat, lon: f.lon, at: f.at };

  // A coarse fix is worse than no fix: it would invent distance.
  if (f.accuracy != null && f.accuracy > MAX_ACCURACY_M) {
    return { trip: t, prev: fix, moved: false };
  }

  if (!prev) {
    // First fix of a trip: no previous point, so nothing to measure yet.
    return { trip: { ...t, fixes: t.fixes + 1 }, prev: fix, moved: false };
  }

  const dt = (fix.at - prev.at) / 1000;
  if (dt <= 0.25) return { trip: t, prev, moved: false }; // the same fix twice

  const d = distanceM(prev.lat, prev.lon, fix.lat, fix.lon);
  const implied = d / dt;
  if (implied > MAX_JUMP_MPS) return { trip: t, prev: fix, moved: false }; // teleport

  const inst = f.mps != null && Number.isFinite(f.mps) ? f.mps : implied;
  return {
    trip: {
      ...t,
      distance: t.distance + (d < MIN_STEP_M ? 0 : d),
      maxMps: Math.max(t.maxMps, inst),
      movingMs: t.movingMs + (inst >= MOVING_MPS ? Math.round(dt * 1000) : 0),
      fixes: t.fixes + 1,
    },
    prev: fix,
    moved: true,
  };
}

function normalizeTrip(raw: unknown): Trip | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const startedAt = num(t.startedAt);
  if (!startedAt) return null;
  return {
    dest: typeof t.dest === 'string' ? t.dest : '',
    startedAt,
    endedAt: typeof t.endedAt === 'number' ? t.endedAt : null,
    distance: Math.max(0, num(t.distance)),
    maxMps: Math.max(0, num(t.maxMps)),
    movingMs: Math.max(0, num(t.movingMs)),
    fixes: Math.max(0, num(t.fixes)),
  };
}

/** Storage is best-effort: a private-mode browser must not break the trip. */
const save = (key: string, t: Trip) => {
  void set(key, t).catch(() => {});
};
const drop = (key: string) => {
  void del(key).catch(() => {});
};

export function useTrip(geo: Geo): TripApi {
  const [active, setActive] = useState<Trip | null>(null);
  const [done, setDone] = useState<Trip | null>(null);
  const [last, setLast] = useState<Trip | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // The authoritative trip lives in a ref so the GPS effect can read the latest
  // value without depending on (and re-running for) the rendered copy.
  const trip = useRef<Trip | null>(null);
  const prev = useRef<Fix | null>(null);
  const savedAt = useRef(0);

  const commit = (next: Trip | null) => {
    trip.current = next;
    setActive(next);
  };

  // Restore across a reload: Android can kill a backgrounded PWA mid-drive, and
  // losing the odometer is worse than an unexpected resume. Offset is dropped
  // (no previous fix), so distance cannot jump on the first new fix.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const t = normalizeTrip(await get(KEY));
        const fresh = t && Date.now() - t.startedAt < RESUME_WINDOW_MS;
        if (alive && fresh && t && t.endedAt == null && !trip.current) {
          prev.current = null;
          commit(t);
          setNow(Date.now());
        }
      } catch {
        /* best effort */
      }
      try {
        const l = normalizeTrip(await get(LAST_KEY));
        if (alive && l && l.endedAt != null) setLast(l);
      } catch {
        /* best effort */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Absorb fixes. Only runs while a trip is live.
  useEffect(() => {
    const t = trip.current;
    if (!t || t.endedAt != null) return;
    const { lat, lon, at, accuracy, mps } = geo;
    if (lat == null || lon == null || at == null) return;

    const step = stepTrip(t, prev.current, { lat, lon, at, accuracy, mps });
    prev.current = step.prev;
    if (step.trip === t) return;
    commit(step.trip);

    const wall = Date.now();
    if (step.moved && wall - savedAt.current > SAVE_EVERY_MS) {
      savedAt.current = wall;
      save(KEY, step.trip);
    }
  }, [geo.lat, geo.lon, geo.at, geo.accuracy, geo.mps]);

  // The clock has to tick even when no fix arrives (tunnel, parked).
  const startedAt = active?.startedAt ?? 0;
  useEffect(() => {
    if (!startedAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const start = (dest: string) => {
    const t: Trip = {
      dest,
      startedAt: Date.now(),
      endedAt: null,
      distance: 0,
      maxMps: 0,
      movingMs: 0,
      fixes: 0,
    };
    prev.current = null;
    setDone(null);
    setNow(Date.now());
    commit(t);
    save(KEY, t);
  };

  const stop = () => {
    const t = trip.current;
    if (!t || t.endedAt != null) return;
    const ended: Trip = { ...t, endedAt: Date.now() };
    commit(null);
    prev.current = null;
    setDone(ended);
    setLast(ended);
    setNow(Date.now());
    save(LAST_KEY, ended);
    drop(KEY);
  };

  const dismiss = () => setDone(null);

  return { active, done, last, now, start, stop, dismiss };
}
