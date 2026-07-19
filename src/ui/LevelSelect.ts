import type { LevelConfig, LevelResult } from '../gameplay/levels/LevelTypes';

export interface LevelSelectCallbacks {
  onStart(levelId: number): void;
  onBack(): void;
}

/** Level map: unlocked/locked levels, stars, goals and new unlocks preview. */
export class LevelSelect {
  private el: HTMLElement;

  constructor(root: HTMLElement, private callbacks: LevelSelectCallbacks) {
    this.el = document.createElement('div');
    this.el.className = 'overlay level-select hidden';
    root.appendChild(this.el);
  }

  show(
    levels: readonly LevelConfig[],
    unlockedLevel: number,
    results: Record<number, LevelResult>
  ): void {
    const cards = levels
      .map((level) => {
        const unlocked = level.id <= unlockedLevel;
        const stars = results[level.id]?.stars ?? 0;
        const starsHtml = [1, 2, 3]
          .map((i) => `<span class="star ${i <= stars ? 'star-on' : ''}">★</span>`)
          .join('');
        const goals = level.goals.map((g) => `<li>${g.labelAr}</li>`).join('');
        const unlocks = level.unlocksAr.length
          ? `<p class="level-unlocks">🆕 ${level.unlocksAr.join('، ')}</p>`
          : '';
        return `
          <div class="level-card ${unlocked ? '' : 'level-locked'}" data-level="${level.id}">
            <div class="level-num">${unlocked ? level.id : '🔒'}</div>
            <h3>${level.nameAr}</h3>
            <div class="level-stars">${starsHtml}</div>
            <ul class="level-goals">${goals}</ul>
            ${unlocks}
            ${unlocked ? `<button class="btn btn-primary btn-start" data-start="${level.id}">ابدأ</button>` : '<p class="locked-hint">أكمل المرحلة السابقة</p>'}
          </div>`;
      })
      .join('');
    this.el.innerHTML = `
      <div class="panel level-panel">
        <div class="level-head">
          <button class="btn" data-a="back">🏠 رجوع</button>
          <h2>🗺️ خريطة المراحل</h2>
        </div>
        <div class="level-grid">${cards}</div>
      </div>
    `;
    this.el.querySelector('[data-a="back"]')!.addEventListener('click', () => this.callbacks.onBack());
    this.el.querySelectorAll('[data-start]').forEach((btn) => {
      btn.addEventListener('click', () => this.callbacks.onStart(Number((btn as HTMLElement).dataset.start)));
    });
    this.el.classList.remove('hidden');
  }

  hide(): void {
    this.el.classList.add('hidden');
  }

  dispose(): void {
    this.el.remove();
  }
}
