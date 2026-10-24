// Minimal stroke icon set. Monochrome, inherits currentColor.
// Kept deliberately small: one path map, one component.
import type { JSX } from 'preact';
import type { IconName } from './icon-names';

export type { IconName };

// Record<IconName, …> makes the compiler enforce that every name in
// icon-names.ts actually has artwork.
const P: Record<IconName, JSX.Element> = {
  dash: (
    <>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M12 13l3.5-3.5" />
      <circle cx="12" cy="13" r="1.4" />
    </>
  ),
  notes: (
    <>
      <path d="M6 3h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  nav: <path d="M12 3.2 19 20.5l-7-3.9-7 3.9L12 3.2Z" />,
  cloud: (
    <>
      <path d="M7 18h9a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6-1A3.5 3.5 0 0 0 7 18Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  play: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M11 9.5l4 2.5-4 2.5v-5Z" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6.5 9.6V20h11V9.6" />
      <path d="M10 20v-5.2h4V20" />
    </>
  ),
  work: (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7L11.4 7" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7L12.6 17" />
    </>
  ),
  fuel: (
    <>
      <path d="M5 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16" />
      <path d="M4 21h11M7 8h5" />
      <path d="M14 9h2.5a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0v-6.6L19 7" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M4.5 7.5l2 1.2M17.5 15.3l2 1.2M4.5 16.5l2-1.2M17.5 8.7l2-1.2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  pencil: (
    <>
      <path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4 16.5V20Z" />
      <path d="M14.5 6.5 17.5 9.5" />
    </>
  ),
  check: <path d="M4.5 12.5l5 5 10-11" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  chevL: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  chevR: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  expand: (
    <>
      <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
    </>
  ),
  maximize: (
    <>
      <path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" />
    </>
  ),
  bolt: <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />,
  dim: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
    </>
  ),
  car: (
    <>
      <path d="M4 16v-3.2L6 8h12l2 4.8V16" />
      <path d="M4 16h16v2H4z" />
      <circle cx="7.5" cy="18.5" r="1.6" />
      <circle cx="16.5" cy="18.5" r="1.6" />
    </>
  ),
  speed: (
    <>
      <path d="M3.5 17.5a8.5 8.5 0 0 1 17 0" />
      <path d="M12 17.5l4.4-5.6" />
      <circle cx="12" cy="17.5" r="1.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v4.5h-4.5" />
    </>
  ),
};

// `string` (not IconName) so persisted tile icons can be passed straight
// through; unknown values fall back to the link glyph.
export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const body = P[name as IconName] ?? P.link;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {body}
    </svg>
  );
}
