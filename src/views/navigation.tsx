import { useRef, useState } from 'preact/hooks';
import type { Settings, Tile } from '../lib/store';
import { embedUrl, directionsUrl } from '../lib/maps';
import { navAppUrl } from '../lib/clock';
import { compass, formatSpeed, useGeo } from '../lib/speed';
import { Icon } from '../ui/icons';

// The map runs entirely inside this view: a place viewport normally, and
// Google's keyless directions embed once a route is started. Nothing opens a
// browser tab. The destination lives in App state so a Location tile on the
// Dashboard can land here directly.
export function NavigationView({
  settings,
  tiles,
  dest,
  setDest,
  onEdit,
}: {
  settings: Settings;
  tiles: Tile[];
  /** Address or search phrase currently shown, '' for wherever we are. */
  dest: string;
  setDest: (d: string) => void;
  onEdit: () => void;
}) {
  const geo = useGeo();
  const places = tiles.filter((t) => t.kind === 'maps' && t.title);
  const destTitle = places.find((p) => p.address && p.address === dest)?.title;
  const speed = formatSpeed(geo.mps, settings.units);

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
      </section>

      <aside class="nav-side">
        <div class="card speed-card">
          <div class="micro">Speed</div>
          <div class="speed-hero">
            {speed.value}
            <span class="t-unit">{speed.unit}</span>
          </div>
          <div class="t-sub">{geo.error || compass(geo.heading)}</div>
        </div>

        <div class="card">
          <div class="micro">{navigating ? 'Route preview' : 'Destinations'}</div>

          {navigating ? (
            <>
              <div class="route-row">
                <Icon name="nav" size={15} />
                <span class="route-to">{destTitle || dest}</span>
              </div>
              {/* The frame can draw a route but never drive it: no position
                  tracking, no rerouting, no voice. So the last step hands the
                  destination to the phone's own app. */}
              <a class="btn primary wide" href={navAppUrl(dest)}>
                <Icon name="nav" size={16} /> Open in Maps app
              </a>
              <button class="btn wide" onClick={() => setNavFor(null)}>End preview</button>
              <p class="hint">
                Live turn-by-turn, traffic and voice come from the Maps app. This preview
                stays on screen until you end it.
              </p>
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
              {dest && (
                <button
                  class="btn primary wide"
                  disabled={!canRoute}
                  onClick={() => setNavFor(dest)}
                >
                  <Icon name="nav" size={16} /> Preview route
                </button>
              )}
              {dest && !canRoute && (
                <p class="hint">Needs a GPS fix or a city set in Settings to calculate a route.</p>
              )}
            </>
          )}
        </div>

        <div class="card">
          <div class="micro">Music</div>
          {settings.ytPlaylist.trim() ? (
            <MusicEmbed id={settings.ytPlaylist.trim()} />
          ) : (
            <p class="hint">Add a YouTube playlist ID in Settings to play music here.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function MusicEmbed({ id }: { id: string }) {
  const src = id.startsWith('PL')
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(id)}&playsinline=1&rel=0`
    : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?playsinline=1&rel=0`;
  return (
    <div class="yt-wrap">
      <iframe
        src={src}
        title="Music"
        allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
