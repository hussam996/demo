/**
 * Pointer-based activation for DOM controls.
 * Embedded/zoomed mobile webviews sometimes withhold synthesized `click`
 * events (treating taps as potential double-tap zoom), while raw pointer
 * events are always delivered. This fires on pointerup with drag-cancel
 * semantics, keeping plain `click` as a fallback for older browsers.
 */
export function onActivate(el: HTMLElement, fn: (e: Event) => void): void {
  let downX = 0;
  let downY = 0;
  let activePointer = -1;
  let lastFire = 0;

  el.addEventListener('pointerdown', (e) => {
    activePointer = e.pointerId;
    downX = e.clientX;
    downY = e.clientY;
  });

  el.addEventListener('pointerup', (e) => {
    if (e.pointerId !== activePointer) return;
    activePointer = -1;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // finger slid away: treat as cancel, like native click semantics
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 14) return;
    lastFire = performance.now();
    fn(e);
  });

  el.addEventListener('click', (e) => {
    // suppress the duplicate when the pointerup path already handled this tap
    if (performance.now() - lastFire < 600) return;
    fn(e);
  });
}
