import type { GameSettings, QualityLevel } from '../core/SaveManager';
import { onActivate } from './activate';

export interface PauseCallbacks {
  onResume(): void;
  onRestart(): void;
  onQuit(): void;
  onSettingsChanged(partial: Partial<GameSettings>): void;
}

export class PauseMenu {
  private el: HTMLElement;

  constructor(root: HTMLElement, callbacks: PauseCallbacks) {
    this.el = document.createElement('div');
    this.el.className = 'overlay pause-menu hidden';
    this.el.innerHTML = `
      <div class="panel">
        <h2>⏸️ إيقاف مؤقت</h2>
        <button class="btn btn-primary" data-a="resume">▶️ استكمال</button>
        <button class="btn" data-a="restart">🔄 إعادة المرحلة</button>
        <div class="settings-block">
          <h3>الإعدادات</h3>
          <label class="setting-row"><span>🎵 الموسيقى</span><input type="checkbox" data-s="music" /></label>
          <label class="setting-row"><span>🔔 المؤثرات</span><input type="checkbox" data-s="sfx" /></label>
          <label class="setting-row"><span>🔉 مستوى الصوت</span><input type="range" min="0" max="100" data-s="volume" /></label>
          <label class="setting-row"><span>🖼️ الجودة</span>
            <select data-s="quality">
              <option value="low">منخفضة</option>
              <option value="medium">متوسطة</option>
              <option value="high">عالية</option>
            </select>
          </label>
          <label class="setting-row"><span>🌊 تقليل الحركة</span><input type="checkbox" data-s="reducedMotion" /></label>
        </div>
        <button class="btn btn-quit" data-a="quit">🏠 القائمة الرئيسية</button>
      </div>
    `;
    root.appendChild(this.el);

    onActivate(this.el.querySelector('[data-a="resume"]')!, () => callbacks.onResume());
    onActivate(this.el.querySelector('[data-a="restart"]')!, () => callbacks.onRestart());
    onActivate(this.el.querySelector('[data-a="quit"]')!, () => callbacks.onQuit());

    const music = this.el.querySelector('[data-s="music"]') as HTMLInputElement;
    const sfx = this.el.querySelector('[data-s="sfx"]') as HTMLInputElement;
    const volume = this.el.querySelector('[data-s="volume"]') as HTMLInputElement;
    const quality = this.el.querySelector('[data-s="quality"]') as HTMLSelectElement;
    const reduced = this.el.querySelector('[data-s="reducedMotion"]') as HTMLInputElement;
    music.addEventListener('change', () => callbacks.onSettingsChanged({ musicEnabled: music.checked }));
    sfx.addEventListener('change', () => callbacks.onSettingsChanged({ sfxEnabled: sfx.checked }));
    volume.addEventListener('input', () => callbacks.onSettingsChanged({ volume: Number(volume.value) / 100 }));
    quality.addEventListener('change', () => callbacks.onSettingsChanged({ quality: quality.value as QualityLevel }));
    reduced.addEventListener('change', () => callbacks.onSettingsChanged({ reducedMotion: reduced.checked }));
  }

  show(settings: GameSettings): void {
    (this.el.querySelector('[data-s="music"]') as HTMLInputElement).checked = settings.musicEnabled;
    (this.el.querySelector('[data-s="sfx"]') as HTMLInputElement).checked = settings.sfxEnabled;
    (this.el.querySelector('[data-s="volume"]') as HTMLInputElement).value = String(Math.round(settings.volume * 100));
    (this.el.querySelector('[data-s="quality"]') as HTMLSelectElement).value = settings.quality;
    (this.el.querySelector('[data-s="reducedMotion"]') as HTMLInputElement).checked = settings.reducedMotion;
    this.el.classList.remove('hidden');
  }

  hide(): void {
    this.el.classList.add('hidden');
  }

  dispose(): void {
    this.el.remove();
  }
}
