import { onActivate } from './activate';

export interface MainMenuCallbacks {

  onPlay(): void;
  onWipe(): void;
}

export class MainMenu {
  private el: HTMLElement;

  constructor(root: HTMLElement, callbacks: MainMenuCallbacks) {
    this.el = document.createElement('div');
    this.el.className = 'overlay main-menu hidden';
    this.el.innerHTML = `
      <div class="panel menu-panel">
        <div class="menu-logo">🍦</div>
        <h1>محاكي عربة الآيس كريم</h1>
        <p class="menu-sub">Ice Cream Cart Simulator</p>
        <button class="btn btn-primary btn-big" data-a="play">▶️ ابدأ اللعب</button>
        <p class="menu-stats"></p>
        <button class="btn-link" data-a="wipe">🧹 مسح التقدم</button>
      </div>
    `;
    root.appendChild(this.el);
    onActivate(this.el.querySelector('[data-a="play"]')!, () => callbacks.onPlay());
    onActivate(this.el.querySelector('[data-a="wipe"]')!, () => {
      if (confirm('هل أنت متأكد من مسح كل التقدم؟')) callbacks.onWipe();
    });
  }

  show(stats: { coins: number; highScore: number; unlockedLevel: number }): void {
    this.el.querySelector('.menu-stats')!.textContent =
      `🪙 ${stats.coins}   ⭐ أعلى نتيجة: ${stats.highScore}   🎯 المستوى ${stats.unlockedLevel}`;
    this.el.classList.remove('hidden');
  }

  hide(): void {
    this.el.classList.add('hidden');
  }

  dispose(): void {
    this.el.remove();
  }
}
