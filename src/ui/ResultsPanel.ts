import type { LevelResult } from '../gameplay/levels/LevelTypes';
import type { GoalProgress } from '../gameplay/levels/LevelManager';

export interface ResultsCallbacks {
  onNext(): void;
  onRetry(): void;
  onMap(): void;
}

export class ResultsPanel {
  private el: HTMLElement;

  constructor(root: HTMLElement, callbacks: ResultsCallbacks) {
    this.el = document.createElement('div');
    this.el.className = 'overlay results-panel hidden';
    this.el.innerHTML = `
      <div class="panel">
        <h2 class="results-title"></h2>
        <div class="results-stars"></div>
        <ul class="results-goals"></ul>
        <div class="results-grid"></div>
        <div class="results-actions">
          <button class="btn btn-primary" data-a="next">⏭️ المرحلة التالية</button>
          <button class="btn" data-a="retry">🔄 إعادة</button>
          <button class="btn" data-a="map">🗺️ الخريطة</button>
        </div>
      </div>
    `;
    root.appendChild(this.el);
    this.el.querySelector('[data-a="next"]')!.addEventListener('click', () => callbacks.onNext());
    this.el.querySelector('[data-a="retry"]')!.addEventListener('click', () => callbacks.onRetry());
    this.el.querySelector('[data-a="map"]')!.addEventListener('click', () => callbacks.onMap());
  }

  show(result: LevelResult, goals: GoalProgress[], hasNextLevel: boolean): void {
    this.el.querySelector('.results-title')!.textContent = result.success
      ? '🎉 نجحت المرحلة!'
      : '😢 لم تكتمل المرحلة';

    const stars = this.el.querySelector('.results-stars')!;
    stars.innerHTML = [1, 2, 3]
      .map((i) => `<span class="star ${i <= result.stars ? 'star-on' : ''}">★</span>`)
      .join('');

    const goalsEl = this.el.querySelector('.results-goals')!;
    goalsEl.innerHTML = goals
      .map((g) => `<li class="${g.achieved ? 'goal-ok' : 'goal-miss'}">${g.achieved ? '✅' : '❌'} ${g.goal.labelAr}</li>`)
      .join('');

    const grid = this.el.querySelector('.results-grid')!;
    const rows: Array<[string, string | number]> = [
      ['⭐ النقاط', result.score],
      ['🪙 العملات', result.coinsEarned],
      ['🧑‍🤝‍🧑 زبائن مخدومون', result.customersServed],
      ['✅ طلبات صحيحة', result.correctOrders],
      ['❌ أخطاء', result.mistakes],
      ['🚶 زبائن غادروا', result.lostCustomers],
      ['🔥 أعلى سلسلة', `x${result.bestCombo}`],
    ];
    grid.innerHTML = rows
      .map(([label, value]) => `<div class="result-row"><span>${label}</span><b>${value}</b></div>`)
      .join('');

    const nextBtn = this.el.querySelector('[data-a="next"]') as HTMLButtonElement;
    nextBtn.style.display = result.success && hasNextLevel ? '' : 'none';
    this.el.classList.remove('hidden');
  }

  hide(): void {
    this.el.classList.add('hidden');
  }

  dispose(): void {
    this.el.remove();
  }
}
