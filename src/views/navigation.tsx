import { useRef, useState } from 'preact/hooks';
import type { Settings, Tile } from '../lib/store';
import { embedUrl, directionsUrl } from '../lib/maps';
import { navAppUrl } from '../lib/clock';
import { compass, formatSpeed, type Geo } from '../lib/speed';
import {
  distanceParts,
  elapsedMs,
  fmtDuration,
  type Trip,
  type TripApi,
} from '../lib/trip';
import { Icon } from '../ui/icons';

// Three states, three views: a live trip (the map is useless to someone already
// driving with Google Maps, so the board shows numbers instead), the summary of
// a trip just stopped, and the normal place/route preview.
export function NavigationView({
  settings,
  tiles,
  geo,
  trip,
  dest,
  setDest,
  onEdit,
}: {
  settings: Settings;
  tiles: Tile[];
  geo: Geo;
  trip: TripApi;
  /** Address or search phrase currently shown, '' for wherever we are. */
  dest: string;
  setDest: (d: string) => void;
  onEdit: () => void;
}) {
  if (trip.active) {
    return <TripView settings={settings} geo={geo} trip={trip.active} now={trip.now} stop={trip.stop} />;
  }
  if (trip.done) {
    return <TripSummary settings={settings} trip={trip.done} now={trip.now} dismiss={trip.dismiss} />;
  }
  return (
    <PlaceView
      settings={settings}
      tiles={tiles}
      geo={geo}
      dest={dest}
      setDest={setDest}
      onEdit={onEdit}
      last={trip.last}
      now={trip.now}
      start={trip.start}
    />
  );
}

/** Live trip board. Takes the whole view while tracking. */
function TripView({
  settings,
  geo,
  trip,
  now,
  stop,
}: {
  settings: Settings;
  geo: Geo;
  trip: Trip;
  now: number;
  stop: () => void;
}) {
  const elapsed = elapsedMs(trip, now);
  const speed = formatSpeed(geo.mps, settings.units);
  const avg = formatSpeed(elapsed > 0 ? trip.distance / (elapsed / 1000) : null, settings.units);
  const max = formatSpeed(trip.maxMps, settings.units);
  const dist = distanceParts(trip.distance, settings.units);

  return (
    <div class="nav-grid">
      <section class="trip-board">
        <div class="trip-head">
          <span class="trip-live"><i /> Tracking</span>
          <span class="micro trip-dest" title={trip.dest}>{trip.dest || 'Trip'}</span>
        </div>

        <div class="trip-hero">
          <span class="trip-speed">{speed.value}</span>
          <span class="trip-unit">{speed.unit}</span>
        </div>

        <div class="trip-stats">
          <Stat label="Elapsed" value={fmtDuration(elapsed)} />
          <Stat label="Distance" value={dist.value} unit={dist.unit} />
          <Stat label="Average" value={avg.value} unit={avg.unit} />
          <Stat label="Max" value={max.value} unit={max.unit} />
          <Stat label="Moving" value={fmtDuration(trip.movingMs)} />
          <Stat label="Heading" value={compass(geo.heading)} />
        </div>

        <div class="trip-foot">
          <p class="hint">
            {geo.error
              ? `${geo.error} — recording from the last good fix.`
              : 'Stop when you arrive. Destination changes wait until the trip ends.'}
          </p>
          <button class="btn danger" onClick={stop}>
            <Icon name="x" size={16} /> Stop trip
          </button>
        </div>
      </section>
    </div>
  );
}

/** What the trip added up to, once stopped. */
function TripSummary({
  settings,
  trip,
  now,
  dismiss,
}: {
  settings: Settings;
  trip: Trip;
  now: number;
  dismiss: () => void;
}) {
  const elapsed = elapsedMs(trip, now);
  const dist = distanceParts(trip.distance, settings.units);
  const avg = formatSpeed(elapsed > 0 ? trip.distance / (elapsed / 1000) : null, settings.units);
  const max = formatSpeed(trip.maxMps, settings.units);
  const ended = trip.endedAt ?? now;

  return (
    <div class="nav-grid">
      <section class="trip-board">
        <div class="trip-head">
          <span class="micro">Trip complete</span>
          <span class="micro trip-dest" title={trip.dest}>{trip.dest || 'Trip'}</span>
        </div>

        <div class="trip-hero">
          <span class="trip-speed">{dist.value}</span>
          <span class="trip-unit">{dist.unit}</span>
        </div>

        <div class="trip-stats">
          <Stat label="Elapsed" value={fmtDuration(elapsed)} />
          <Stat label="Average" value={avg.value} unit={avg.unit} />
          <Stat label="Max" value={max.value} unit={max.unit} />
          <Stat label="Moving" value={fmtDuration(trip.movingMs)} />
          <Stat label="Fixes" value={String(trip.fixes)} />
          <Stat
            label="Ended"
            value={new Date(ended).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          />
        </div>

        <div class="trip-foot">
          <p class="hint">
            {trip.fixes < 2
              ? 'Hardly any GPS fixes arrived. If the screen was off, the browser may have paused location.'
              : 'Tracking is off. This trip is kept as the last trip.'}
          </p>
          <button class="btn" onClick={dismiss}>Done</button>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div class="trip-stat">
      <span class="micro">{label}</span>
      <b>
        {value}
        {unit ? <small>{unit}</small> : null}
      </b>
    </div>
  );
}

/** Full-bleed map with a destination dock over the bottom edge. */
function PlaceView({
  settings,
  tiles,
  geo,
  dest,
  setDest,
  onEdit,
  last,
  now,
  start,
}: {
  settings: Settings;
  tiles: Tile[];
  geo: Geo;
  dest: string;
  setDest: (d: string) => void;
  onEdit: () => void;
  last: Trip | null;
  now: number;
  start: (dest: string) => void;
}) {
  const places = tiles.filter((t) => t.kind === 'maps' && t.title);
  const destTitle = places.find((p) => p.address && p.address === dest)?.title;

  // Freeze the origin. Using live coords would rewrite the iframe src on every
  // GPS tick and reload the map once a second.
  const originRef = useRef('');
  if (!originRef.current && geo.lat != null && geo.lon != null) {
    originRef.current = `${geo.lat},${geo.lon}`;
  }
  const [, bump] = useState(0);
  const recenter = () => {
    if (geo.lat == null || geo.lon == null) return;
    originRef.current = `${geo.lat},${geo.lon}`;
    bump((n) => n + 1);
  };

  const origin = originRef.current || settings.city;
  const canRoute = !!origin && !!dest;

  /** Routes are tied to the destination they were started for, so changing
   *  the destination automatically drops back to the place view. */
  const [navFor, setNavFor] = useState<string | null>(null);
  const navigating = navFor !== null && navFor === dest;

  // Choosing a destination always leaves route mode, so re-picking a previous
  // place does not silently resume an old route.
  const choose = (next: string) => {
    setNavFor(null);
    setDest(next);
  };

  const [olat, olon] = originRef.current
    ? originRef.current.split(',').map(Number)
    : [null, null];

  const embed = navigating && origin
    ? directionsUrl(origin, dest)
    : embedUrl({ dest: dest || settings.city, lat: olat, lon: olon });

  const lastDist = last ? distanceParts(last.distance, settings.units) : null;

  return (
    <div class="nav-grid">
      <section class="nav-map">
        {embed ? (
          <iframe
            key={embed}
            src={embed}
            title={navigating ? 'Directions' : 'Map'}
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div class="nav-map-empty">
            <Icon name="pin" size={28} />
            <p class="hint">
              {geo.error ? 'Location unavailable — set a city in Settings.' : 'Waiting for a GPS fix…'}
            </p>
          </div>
        )}

        <div class="nav-head">
          <div class="nav-map-badge micro">
            {navigating
              ? `Route · ${destTitle || dest}`
              : destTitle ||
                dest ||
                (geo.lat != null ? 'Current location' : settings.city || geo.error || 'No fix')}
          </div>
          <button
            class="icon-btn map-recenter"
            onClick={recenter}
            disabled={geo.lat == null}
            title="Recenter on me"
          >
            <Icon name="nav" size={16} />
          </button>
        </div>

        <div class="nav-dock">
          {navigating ? (
            <>
              <div class="route-row">
                <Icon name="nav" size={15} />
                <span class="route-to">{destTitle || dest}</span>
              </div>
              {/* The frame can draw a route but never drive it: no position
                  tracking, no rerouting, no voice. So the last step starts the
                  trip log and hands the destination to the phone's own app. */}
              <div class="nav-dock-actions">
                <a
                  class="btn primary"
                  href={navAppUrl(dest)}
                  onClick={() => start(destTitle || dest)}
                >
                  <Icon name="nav" size={16} /> Open in Maps app
                </a>
                <button class="btn" onClick={() => setNavFor(null)}>End preview</button>
              </div>
              <p class="hint">Opening Maps also starts the trip log, until you press Stop.</p>
            </>
          ) : (
            <>
              <div class="chips">
                {geo.lat != null && geo.lon != null && (
                  <button
                    class="chip-btn"
                    onClick={() => choose(dest === `${geo.lat},${geo.lon}` ? '' : `${geo.lat},${geo.lon}`)}
                  >
                    <Icon name="pin" size={15} /> My location
                  </button>
                )}
                {places.map((p) => (
                  <button
                    key={p.id}
                    class={`chip-btn${p.address && dest === p.address ? ' on' : ''}`}
                    onClick={() => {
                      // An unset destination would search for the literal title.
                      if (!p.address) return onEdit();
                      choose(dest === p.address ? '' : p.address);
                    }}
                    title={p.address || 'No address yet — tap to set one in Edit'}
                  >
                    <Icon name={p.icon} size={15} /> {p.title}
                    {!p.address && <Icon name="pencil" size={12} />}
                  </button>
                ))}
                {!places.length && (
                  <p class="hint">Add a Location tile in Edit to see destinations here.</p>
                )}
              </div>

              {dest ? (
                <div class="nav-dock-actions">
                  <button
                    class="btn primary"
                    disabled={!canRoute}
                    onClick={() => setNavFor(dest)}
                  >
                    <Icon name="nav" size={16} /> Preview route
                  </button>
                </div>
              ) : (
                last && lastDist && last.distance > 0 && (
                  <p class="micro dock-last">
                    Last trip · {lastDist.value} {lastDist.unit} · {fmtDuration(elapsedMs(last, now))}
                  </p>
                )
              )}

              {dest && !canRoute && (
                <p class="hint">Needs a GPS fix or a city set in Settings to calculate a route.</p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
