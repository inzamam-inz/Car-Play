export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isAndroid = () => /Android/.test(navigator.userAgent);

export const isBrave = () =>
  /Brave/.test(navigator.userAgent) || !!(navigator as any).brave;

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

export function capabilityReport(): string {
  const lines = [
    `standalone=${isStandalone()}`,
    `ios=${isIOS()} android=${isAndroid()} brave=${isBrave()}`,
    `wakeLock=${'wakeLock' in navigator}`,
    `fullscreen=${!!document.documentElement.requestFullscreen}`,
    `geolocation=${'geolocation' in navigator}`,
  ];
  return lines.join('  ');
}
