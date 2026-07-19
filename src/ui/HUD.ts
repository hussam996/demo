import { onActivate } from './activate';

export interface HudCallbacks {
  onPause(): void;
  onToggleSound(): void;
}

/** Top bar during gameplay: level, score, coins, time, combo, pause & sound. */
export class HUD {
  private el: HTMLElement;
  private toastEl: HTMLElement;
  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor(root: HTMLElement, callbacks: HudCallbacks) {
    this.el = document.createElement('div');
    this.el.className = 'hud hidden';
    this.el.innerHTML = `
      <div class="hud-bar">
        <button class="hud-btn" data-action="pause" aria-label="إيقاف مؤقت">⏸️</button>
        <button class="hud-btn" data-action="sound" aria-label="الصوت">🔊</button>
        <span class="hud-stat hud-level" title="المستوى">🎯 <b class="v-level">1</b></span>
        <span class="hud-stat" title="النقاط">⭐ <b class="v-score">0</b></span>
        <span class="hud-stat" title="العملات">🪙 <b class="v-coins">0</b></span>
        <span class="hud-stat hud-combo hidden" title="السلسلة">🔥 <b class="v-combo">x1</b></span>
        <span class="hud-stat hud-time" title="الوقت المتبقي">⏳ <b class="v-time">0:00</b></span>
      </div>
      <div class="hud-toast hidden"></div>
    `;
    root.appendChild(this.el);
    this.toastEl = this.el.querySelector('.hud-toast')!;
    onActivate(this.el.querySelector('[data-action="pause"]')!, () => callbacks.onPause());
    onActivate(this.el.querySelector('[data-action="sound"]')!, () => callbacks.onToggleSound());
  }

  show(): void {
    this.el.classList.remove('hidden');
  }

  hide(): void {
    this.el.classList.add('hidden');
  }

  setLevel(id: number): void {
    this.el.querySelector('.v-level')!.textContent = String(id);
  }

  setScore(score: number, coins: number, combo: number): void {
    this.el.querySelector('.v-score')!.textContent = String(score);
    this.el.querySelector('.v-coins')!.textContent = String(coins);
    const comboEl = this.el.querySelector('.hud-combo')!;
    comboEl.classList.toggle('hidden', combo <= 1);
    this.el.querySelector('.v-combo')!.textContent = `x${combo}`;
  }

  setTime(remaining: number): void {
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    const timeEl = this.el.querySelector('.v-time')!;
    timeEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
    this.el.querySelector('.hud-time')!.classList.toggle('hud-time-low', remaining <= 20);
  }

  setSoundIcon(enabled: boolean): void {
    this.el.querySelector('[data-action="sound"]')!.textContent = enabled ? '🔊' : '🔇';
  }

  /** transient feedback message (prep rejections, bonuses...) */
  toast(message: string, kind: 'info' | 'error' | 'success' = 'info'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastEl.textContent = message;
    this.toastEl.className = `hud-toast toast-${kind}`;
    this.toastTimer = setTimeout(() => this.toastEl.classList.add('hidden'), 2200);
  }

  dispose(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.el.remove();
  }
}
