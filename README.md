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
| **Navigation** | Live map viewport, a large speed meter, destination chips and an optional music player. |
| **Settings** | Theme, units, city override, YouTube playlist, backup and restore. |
| **Edit** *(bottom)* | Always-on dashboard editor: resize, reorder, remove, and add tiles. |

In **Edit**, each tile shows four controls — move earlier, move later, resize
(cycles ¼ → ½ → full width), and remove. **Add tile** opens the built-in set
(clock, weather, speed, notes, YouTube) plus custom Link and Maps tiles.

### A note on Navigation

The map is Google Maps' keyless `output=embed` viewport. **It cannot do
turn-by-turn navigation** — Google deliberately keeps routing inside its own
app. So pick a destination chip and hit **Start navigation**, which deep-links
into the real Google Maps (Android) or Apple Maps (iOS).

Destination chips come from your Maps tiles. A chip with no address yet shows a
pencil and takes you to Edit to set one, rather than searching for the literal
word "Home".

## Features

- **Dashboard grid** — 12×4 tile grid, swipeable pages
- **Clock / date** with day–night theming
- **Speed** — GPS ground speed in km/h or mph with a compass heading, from the device GPS
- **Weather** — GPS via Open-Meteo (no API key), cached so it survives offline
- **Notes** — quick capture, mark done, stored on device
- **Navigation** — map viewport plus Home / Work / custom destination deep links
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
