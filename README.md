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
| **Navigation** | Map with in-tab directions, a large speed meter, destination chips and an optional music player. |
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

Everything happens inside the Navigation view — **no browser tabs, ever**.

Tapping a Location tile on the Dashboard takes you straight to this view with
that place already selected. (Web-link tiles are the exception: those still open
in a new tab.) A Location tile with no address yet takes you to Edit instead,
since there is nothing to navigate to.

The map has two modes:

- **Place view** — Google Maps' keyless `output=embed` viewport centred on the
  selected destination.
- **Route view** — **Start navigation** swaps the frame to Google's classic
  keyless directions endpoint (`f=d` + `saddr`/`daddr` + `output=embed`), which
  renders the route and its step list in place. **End route** returns to the
  place view.

Route mode hides the destination chips on purpose: one route at a time, and the
only way out is **End route**, so an old route can never quietly resume. The
origin is frozen when you start, so a moving GPS fix does not reload the map.

Two honest limits of embedding Google Maps:

1. **It is not live turn-by-turn.** There is no position tracking inside the
   frame, no re-routing, no voice. It shows the route from the origin captured
   at the moment you tapped Start.
2. The `f=d` endpoint is Google's legacy keyless embed. It is not a
   contract — if Google ever changes it, the route view degrades to a plain map.

If you later want real turn-by-turn while driving, that needs the Google Maps
app, not an iframe.

Destination chips come from your Maps tiles. A chip with no address yet shows a
pencil and takes you to Edit to set one, rather than searching for the literal
word "Home".

## Features

- **Dashboard grid** — 12×4 tile grid, swipeable pages
- **Clock / date** with day–night theming
- **Speed** — GPS ground speed in km/h or mph with a compass heading, from the device GPS
- **Weather** — GPS via Open-Meteo (no API key), cached so it survives offline
- **Notes** — quick capture, mark done, stored on device
- **Navigation** — keyless Google Maps view, in-tab directions, speed meter, one-tap destinations from your Location tiles
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
