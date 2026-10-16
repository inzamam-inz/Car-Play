# Gari — Car Display

Personal offline-first car dashboard. Tesla look, CarPlay layout. Runs in Brave on Android + iPad.

## Run locally

```sh
npm install
npm run dev -- --host --port 5173
```

Open the printed LAN URL on your phone/tablet.

## Install

- **Android (chrome-free):** open the hosted URL in **Chrome** → ⋮ → Add to Home screen.
- **iPad (chrome-free):** open in **Safari** → Share → Add to Home Screen.
- **Brave daily use:** Add to Home screen opens a normal tab — tap **⛶ Car** in the status bar for true fullscreen + landscape lock.

## Notes

- HTTPS required for install (GitHub Pages provides it).
- Weather: Open-Meteo, no API key. GPS permission needs one tap; or set a city in Settings.
- YouTube: embedded playlist plays while the screen is on; YouTube Music is a hand-off shortcut (no embed API).
- Keep-awake: status-bar Wake chip; on iPad also set Auto-Lock → Never while driving.
