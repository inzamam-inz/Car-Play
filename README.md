# Gari — Car Display

A personal, offline-first car dashboard that runs in the browser and installs to
your home screen. Tesla visual language, CarPlay-style layout, IBM Plex Mono.

## Run

```sh
npm install
npm run dev -- --host --port 5173
```

Open the printed LAN URL on your phone or tablet.

## Install

| Device | Steps | Result |
| --- | --- | --- |
| Android (Brave) | Menu → Add to Home screen | Shortcut that keeps the toolbar — tap the expand icon in the top bar for true fullscreen |
| Android (Chrome) | Menu → Add to Home screen | Chrome-free standalone app |
| iPad | Safari → Share → Add to Home Screen | Chrome-free standalone app |

Brave cannot install a standalone PWA on either platform, so the app ships an
in-app fullscreen + landscape-lock button (`src/lib/fullscreen.ts`) that makes
Brave look identical to an installed app.

## Views

The left rail is the only navigation — there is no bottom bar.

| Rail | What it is |
| --- | --- |
| **Dashboard** | The 12×4 tile grid. Tap a tile to open its panel. Swipe for more pages. |
| **Navigation** | Map with a route preview, handoff to the phone's Maps app, a live trip board, a large speed meter and an optional music player. |
| **Settings** | Theme, units, city override, YouTube playlist, backup and restore. |
| **Edit** *(bottom)* | Always-on dashboard editor: resize, reorder, remove, and add tiles. |

In **Edit**, each tile shows four controls — move earlier, move later, resize
(cycles ¼ → ½ → full width), and remove. **Add tile** opens a catalogue:

- **Quick add** — Clock, Weather, Speed, Notes, YouTube, YT Music
- **With details** — Location and Web link

**Location** has presets for **Home**, **Work**, **Fuel** and **Custom**. The
address field accepts either a street address or a search phrase, so
`gas station` works as well as `221B Baker Street`. Everything goes through
Google Maps (Apple Maps on iOS).

Tap any Location or Web-link tile *while in Edit* to change its name, address or
icon. Nothing is write-once.

### A note on Navigation

Tapping a Location tile on the Dashboard takes you straight to this view with
that place already selected. (Web-link tiles are the exception: those still open
in a new tab.) A Location tile with no address yet takes you to Edit instead,
since there is nothing to navigate to.

The map has two modes, both inside the app:

- **Place view** — Google Maps' keyless `output=embed` viewport centred on the
  selected destination.
- **Route view** — **Preview route** swaps the frame to Google's classic keyless
  directions endpoint (`f=d` + `saddr`/`daddr` + `output=embed`), which renders
  the route and its step list in place.

Route mode hides the destination chips on purpose: one route at a time, and the
only way out is **End preview**, so an old route can never quietly resume. The
origin is frozen when you preview, so a moving GPS fix does not reload the map.

### Why "Preview route" and not "Navigate"

An embed can **draw** a route but can never **drive** it. Inside the frame there
is no position tracking, no re-routing, no voice, and Google's embed carries no
live traffic — because it is somebody else's page in a box, not a routing engine
you can program. This is a hard limit of Google's embed, not a missing feature.

So the last step is an explicit handoff: **Open in Maps app**, which sends the
destination to the phone's own navigator —

| Platform | Link | Result |
| --- | --- | --- |
| Android | `geo:0,0?q=…` | Google Maps app (or a chooser, if several map apps are installed) |
| iOS / iPadOS | `maps://?daddr=…` | Apple Maps (iPadOS reports a Mac UA, so touch points are checked too) |
| Desktop | `https://www.google.com/maps/dir/…` | Maps in the browser — no app to hand off to |

That link is a real `<a href>`, not `window.open`, so it swaps you to the app
instead of spawning a tab. Real turn-by-turn, traffic, voice and lane guidance
live in that app; this screen stays behind as the dashboard when you switch back.

One caveat: if a device has no maps app that answers `geo:`, nothing happens —
Android almost always has Google Maps, so this is rare in practice.

### Trip tracking

Tapping **Open in Maps app** also starts the trip log. From then on the
Navigation view stops showing a map — you are already being driven by a real
navigator — and shows the numbers instead:

| Field | Meaning |
| --- | --- |
| Speed *(hero)* | Live ground speed, km/h or mph per Settings |
| Elapsed | Wall-clock time since the trip started |
| Distance | Distance actually travelled, integrated from GPS fixes |
| Average | Distance ÷ elapsed (includes stops) |
| Max | Fastest instantaneous speed seen |
| Moving | Time spent above walking pace |
| Heading | Compass direction |

**Stop trip** ends it and shows a summary, which is kept as the *last trip* and
appears as a one-line footnote in the Destinations card (once it has actually
covered some distance). Only one trip runs at a time, and the destination chips
stay hidden while it does — stop first.

Distance is measured, not predicted: successive fixes are joined by their
great-circle distance. That means no API key, no routing service, and it records
what you actually did. It also means the log is defensive about bad GPS:

- a fix with accuracy worse than 100 m is ignored (it would invent distance)
- an implied speed above ~300 km/h is treated as a teleport, not travel
- a step under 3 m counts as jitter, not distance
- below 1 m/s the time is not counted as *moving*

Two honest limits:

1. **It needs GPS to keep running.** If Android suspends the browser while you
   are in another app, distance and moving time stop advancing (elapsed keeps
   counting, because that is wall clock). Test this on your own phone — if it
   pauses, run the dashboard on a second device, or keep it in the foreground.
2. **Tunnels and car parks under-read.** No fixes, no distance. Expect a trip log
   to be slightly short rather than slightly long, which is the safer direction.

The trip is saved every few seconds, so a reload mid-drive resumes it (for up to
six hours). Because a trip is worthless with a sleeping screen, tracking also
turns on the **keep screen awake** lock; the header button can still undo it.

Destination chips come from your Maps tiles. A chip with no address yet shows a
pencil and takes you to Edit to set one, rather than searching for the literal
word "Home".

## Features

- **Dashboard grid** — 12×4 tile grid, swipeable pages
- **Clock / date** with day–night theming
- **Speed** — GPS ground speed in km/h or mph with a compass heading, from the device GPS
- **Weather** — GPS via Open-Meteo (no API key), cached so it survives offline
- **Notes** — quick capture, mark done, stored on device
- **Navigation** — keyless Google Maps view, in-tab route preview, handoff to the Maps app for real turn-by-turn, speed meter, one-tap destinations from your Location tiles
- **Trip log** — distance, elapsed, average, max and moving time, integrated from the device GPS and resumed after a reload
- **Music** — embedded YouTube playlist in the Navigation view, plus a YouTube Music shortcut tile
- **Keep awake** — Screen Wake Lock with a silent-video fallback for iOS
- **Backup** — copy / restore layout, notes and settings as JSON

## Project layout

```
src/
  app.tsx            shell: status bar, left rail, views, tray
  views/
    navigation.tsx   map viewport, speed meter, destinations, music
  lib/
    store.ts         IndexedDB persistence + tile normalisation
    session.ts       wake lock + fallback
    fullscreen.ts    fullscreen + orientation lock
    weather.ts       GPS + Open-Meteo
    speed.ts         GPS ground speed, compass, shared useGeo hook
    maps.ts          keyless Maps embed URLs
    platform.ts      standalone / iOS / Android detection
  tiles/bodies.tsx   tile renderers
  panels/panels.tsx  notes, weather, add-tile, settings panels
  ui/icons.tsx       stroke icon set
  styles/            design tokens + layout
scripts/make-icons.mjs  generates the PWA PNG icons
```

## Notes

- HTTPS is required for install; GitHub Pages provides it.
- Weather needs one tap on the location prompt, or set a city in Settings.
- `npm run icons` regenerates the app icons after editing the mark in `scripts/make-icons.mjs`.
- If you rename the GitHub repo, update `base` in `vite.config.ts` to match, or assets will 404.
