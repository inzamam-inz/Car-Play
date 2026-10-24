import type { Settings, Tile } from '../lib/store';
import { mapsUrl } from '../lib/clock';
import { embedUrl } from '../lib/maps';
import { compass, formatSpeed, useGeo } from '../lib/speed';
import { Icon } from '../ui/icons';

// Google Maps cannot do turn-by-turn inside an iframe, so the map here is a
// live viewport and the chips below deep-link into the real navigation app.
// The destination lives in App state so a Location tile can land here directly.
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

  const embed = embedUrl({
    dest: dest || settings.city,
    lat: geo.lat,
    lon: geo.lon,
  });

  const drive = (d: string) => window.open(mapsUrl(d), '_blank', 'noopener');

  return (
    <div class="nav-grid">
      <section class="nav-map">
        {embed ? (
          <iframe
            key={embed}
            src={embed}
            title="Map"
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
          {destTitle ||
            dest ||
            (geo.lat != null ? 'Current location' : settings.city || geo.error || 'No fix')}
        </div>
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
          <div class="micro">Destinations</div>
          <div class="chips">
            {geo.lat != null && geo.lon != null && (
              <button class="chip-btn" onClick={() => drive(`${geo.lat},${geo.lon}`)}>
                <Icon name="nav" size={15} /> My location
              </button>
            )}
            {places.map((p) => (
              <button
                key={p.id}
                class={`chip-btn${p.address && dest === p.address ? ' on' : ''}`}
                onClick={() => {
                  // An unset destination would search for the literal title.
                  if (!p.address) return onEdit();
                  setDest(dest === p.address ? '' : p.address);
                }}
                title={p.address || 'No address yet — tap to set one in Edit'}
              >
                <Icon name={p.icon} size={15} /> {p.title}
                {!p.address && <Icon name="pencil" size={12} />}
              </button>
            ))}
            {!places.length && <p class="hint">Add a Location tile in Edit to see destinations here.</p>}
          </div>
          {dest && (
            <button class="btn primary wide" onClick={() => drive(dest)}>
              <Icon name="nav" size={16} /> Start navigation
            </button>
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
