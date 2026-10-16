// Fullscreen + orientation helpers. Key for Brave, which can't install
// chrome-free PWAs (Android shortcut / iOS bookmark both keep browser UI).
export async function enterCarMode(): Promise<boolean> {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' } as any).catch(() =>
        el.requestFullscreen(),
      );
    }
  } catch {
    /* fullscreen may be denied — orientation lock still helps */
  }
  try {
    await (screen.orientation as any)?.lock?.('landscape');
  } catch {
    /* iOS Safari ignores orientation lock */
  }
  return !!document.fullscreenElement;
}

export async function exitCarMode() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    /* noop */
  }
  try {
    (screen.orientation as any)?.unlock?.();
  } catch {
    /* noop */
  }
}
