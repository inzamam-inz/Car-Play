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

## Features

- **Dashboard grid** — 12×4 tile grid, swipeable pages, edit mode (move, resize, delete)
- **Clock / date** with day–night theming
- **Speed** — GPS ground speed in km/h or mph with a compass heading, from the device GPS
- **Weather** — GPS via Open-Meteo (no API key), cached so it survives offline
- **Notes** — quick capture, mark done, stored on device
- **Navigation shortcuts** — Home / Work / custom destinations deep-link into Apple or Google Maps
- **YouTube** — embedded playlist that plays while the screen is on, plus a YouTube Music shortcut
- **Keep awake** — Screen Wake Lock with a silent-video fallback for iOS
- **Backup** — copy / restore layout, notes and settings as JSON

## Project layout

```
src/
  app.tsx            shell: status bar, rail, grid, dock, tray
  lib/
    store.ts         IndexedDB persistence + tile normalisation
    session.ts       wake lock + fallback
    fullscreen.ts    fullscreen + orientation lock
    weather.ts       GPS + Open-Meteo
    speed.ts         GPS ground speed + compass
    platform.ts      standalone / iOS / Android detection
  tiles/bodies.tsx   tile renderers
  panels/panels.tsx  notes, weather, shortcuts, youtube, settings, launcher
  ui/icons.tsx       stroke icon set
  styles/            design tokens + layout
scripts/make-icons.mjs  generates the PWA PNG icons
```

## Notes

- HTTPS is required for install; GitHub Pages provides it.
- Weather needs one tap on the location prompt, or set a city in Settings.
- `npm run icons` regenerates the app icons after editing the mark in `scripts/make-icons.mjs`.
- If you rename the GitHub repo, update `base` in `vite.config.ts` to match, or assets will 404.
