// Screen Wake Lock with NoSleep-style video fallback.
// iOS installed web apps may silently ignore wakeLock — fallback keeps screen alive.
export class SessionKeeper {
  private lock: any = null;
  private video: HTMLVideoElement | null = null;

  async enable(): Promise<'wake-lock' | 'video-fallback' | 'none'> {
    try {
      if ('wakeLock' in navigator) {
        this.lock = await (navigator as any).wakeLock.request('screen');
        this.lock?.addEventListener?.('release', () => (this.lock = null));
        return 'wake-lock';
      }
    } catch {
      /* fall through */
    }
    return this.enableVideoFallback() ? 'video-fallback' : 'none';
  }

  private enableVideoFallback(): boolean {
    try {
      // 1px silent looping video defeats auto-sleep on iOS Safari/web apps.
      const v = document.createElement('video');
      v.muted = true;
      (v as any).playsInline = true;
      v.loop = true;
      v.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0.01;bottom:0;left:0;z-index:1;';
      v.src =
        'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAs1tZGF0AAACrgYF//+q3EXpvebZSxfl4IRJAYmUAQOj/56EGVP///8WZS47GQhVHgJgAIABlAQAAAxRSAAAhEoklCEC4gCIAOEgABARcDAgAEQXOELABYFVARURL/FwA=';
      document.body.appendChild(v);
      v.play().catch(() => {});
      this.video = v;
      return true;
    } catch {
      return false;
    }
  }

  async release() {
    try {
      await this.lock?.release();
    } catch {
      /* noop */
    }
    this.lock = null;
    this.video?.pause();
    this.video?.remove();
    this.video = null;
  }
}

// Re-acquire wake lock when tab becomes visible again.
export function bindVisibilityReacquire(keeper: SessionKeeper, isOn: () => boolean) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isOn()) keeper.enable();
  });
}
