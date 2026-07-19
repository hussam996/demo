import { AbstractEngine } from '@babylonjs/core';
import { GameplayScene } from '../scenes/GameplayScene';
import { LevelSession } from '../gameplay/LevelSession';
import { LevelManager } from '../gameplay/levels/LevelManager';
import { SaveManager, type GameSettings, type QualityLevel } from '../core/SaveManager';
import { AudioManager } from '../core/AudioManager';
import { HUD } from '../ui/HUD';
import { OrderCard } from '../ui/OrderCard';
import { PauseMenu } from '../ui/PauseMenu';
import { ResultsPanel } from '../ui/ResultsPanel';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { MainMenu } from '../ui/MainMenu';
import { LevelSelect } from '../ui/LevelSelect';
import { ERROR_LABELS_AR } from '../gameplay/orders/OrderValidator';
import { PREP_REJECTION_LABELS_AR } from '../gameplay/preparation/PreparationStation';
import { GameplayState } from '../gameplay/GameplayState';

/** picks an initial quality level from the device's capabilities */
export function detectQuality(): QualityLevel {
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;
  if (cores >= 8 && memory >= 8) return 'high';
  if (cores <= 3 || memory <= 2) return 'low';
  return 'medium';
}

/**
 * Top-level orchestrator: owns the engine, screens, save data and the
 * current level run. UI screens are plain DOM; the 3D scene lives per level.
 */
export class GameApp {
  private levelManager = new LevelManager();
  private save = new SaveManager();
  private audio = new AudioManager();

  private hud: HUD;
  private orderCard: OrderCard;
  private pauseMenu: PauseMenu;
  private results: ResultsPanel;
  private tutorial: TutorialOverlay;
  private mainMenu: MainMenu;
  private levelSelect: LevelSelect;
  private introEl: HTMLElement;

  private gameplay?: GameplayScene;
  private session?: LevelSession;
  private currentLevelId = 1;
  private qualityApplied = false;

  constructor(
    private engine: AbstractEngine,
    uiRoot: HTMLElement
  ) {
    if (!this.qualityApplied && this.save.data.settings.quality === 'medium') {
      // first run: auto-detect, still user-overridable in settings
      this.save.updateSettings({ quality: detectQuality() });
      this.qualityApplied = true;
    }
    this.applyAudioSettings();

    this.hud = new HUD(uiRoot, {
      onPause: () => this.pause(),
      onToggleSound: () => {
        const enabled = !(this.save.data.settings.musicEnabled || this.save.data.settings.sfxEnabled);
        this.save.updateSettings({ musicEnabled: enabled, sfxEnabled: enabled });
        this.applyAudioSettings();
        this.hud.setSoundIcon(enabled);
      },
    });
    this.orderCard = new OrderCard(uiRoot);
    this.pauseMenu = new PauseMenu(uiRoot, {
      onResume: () => this.resume(),
      onRestart: () => {
        this.pauseMenu.hide();
        this.startLevel(this.currentLevelId);
      },
      onQuit: () => {
        this.pauseMenu.hide();
        this.quitToMenu();
      },
      onSettingsChanged: (partial) => this.onSettingsChanged(partial),
    });
    this.results = new ResultsPanel(uiRoot, {
      onNext: () => {
        this.results.hide();
        const next = this.levelManager.nextLevelId(this.currentLevelId);
        if (next) this.startLevel(next);
      },
      onRetry: () => {
        this.results.hide();
        this.startLevel(this.currentLevelId);
      },
      onMap: () => {
        this.results.hide();
        this.quitToMenu(true);
      },
    });
    this.tutorial = new TutorialOverlay(uiRoot);
    this.mainMenu = new MainMenu(uiRoot, {
      onPlay: () => {
        this.audio.unlock();
        this.mainMenu.hide();
        this.showLevelSelect();
      },
      onWipe: () => {
        this.save.wipe();
        this.showMainMenu();
      },
    });
    this.levelSelect = new LevelSelect(uiRoot, {
      onStart: (id) => {
        this.audio.unlock();
        this.levelSelect.hide();
        this.startLevel(id);
      },
      onBack: () => {
        this.levelSelect.hide();
        this.showMainMenu();
      },
    });

    this.introEl = document.createElement('div');
    this.introEl.className = 'overlay hidden';
    uiRoot.appendChild(this.introEl);

    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.engine.runRenderLoop(() => {
      this.gameplay?.render();
    });

    this.showMainMenu();

    // test/debug hook (used by the Playwright suite)
    (window as { __icecreamDebug?: unknown }).__icecreamDebug = this;
  }

  get debugSession(): LevelSession | undefined {
    return this.session;
  }

  get debugScene(): GameplayScene | undefined {
    return this.gameplay;
  }

  private onResize = (): void => {
    this.engine.resize();
    this.gameplay?.updateCameraForAspect();
  };

  private onVisibility = (): void => {
    if (document.hidden) {
      // don't burn battery / lose customers while backgrounded
      if (this.session && !this.session.isFinished) this.pause();
      this.audio.suspend();
      this.engine.stopRenderLoop();
    } else {
      this.audio.resume();
      this.engine.runRenderLoop(() => this.gameplay?.render());
    }
  };

  private applyAudioSettings(): void {
    const s = this.save.data.settings;
    this.audio.setMusicEnabled(s.musicEnabled);
    this.audio.setSfxEnabled(s.sfxEnabled);
    this.audio.setVolume(s.volume);
  }

  private onSettingsChanged(partial: Partial<GameSettings>): void {
    this.save.updateSettings(partial);
    this.applyAudioSettings();
    if (partial.quality) this.gameplay?.setQuality(partial.quality);
    this.hud.setSoundIcon(this.save.data.settings.musicEnabled || this.save.data.settings.sfxEnabled);
  }

  private showMainMenu(): void {
    this.disposeGameplay();
    this.hud.hide();
    this.orderCard.hide();
    this.mainMenu.show({
      coins: this.save.data.coins,
      highScore: this.save.data.highScore,
      unlockedLevel: this.save.data.unlockedLevel,
    });
  }

  private showLevelSelect(): void {
    this.disposeGameplay();
    this.hud.hide();
    this.orderCard.hide();
    this.levelSelect.show(
      this.levelManager.levels,
      this.save.data.unlockedLevel,
      this.save.data.levelResults
    );
  }

  private quitToMenu(toMap = false): void {
    this.disposeGameplay();
    if (toMap) this.showLevelSelect();
    else this.showMainMenu();
  }

  startLevel(levelId: number): void {
    const level = this.levelManager.getLevel(levelId);
    if (!level || !this.levelManager.isUnlocked(levelId, this.save.data.unlockedLevel)) return;
    this.currentLevelId = levelId;
    this.disposeGameplay();

    try {
      this.session = new LevelSession(level);
      this.gameplay = new GameplayScene(
        this.engine,
        this.session,
        this.audio,
        this.save.data.settings.quality
      );
    } catch (err) {
      // don't fail silently: report and return to the level map
      console.error('فشل إنشاء المشهد:', err);
      this.disposeGameplay();
      this.showLevelSelect();
      this.hud.show();
      this.hud.toast(`تعذّر بدء المرحلة: ${String((err as Error)?.message ?? err)}`, 'error');
      return;
    }
    this.wireSessionUi(this.session);

    this.hud.setLevel(level.id);
    this.hud.setScore(0, 0, 1);
    this.hud.setTime(level.durationSeconds);
    this.hud.setSoundIcon(this.save.data.settings.musicEnabled || this.save.data.settings.sfxEnabled);
    this.hud.show();

    this.showLevelIntro(level.id === 1 && !this.save.data.levelResults[1]);
  }

  /** goal briefing before the clock starts */
  private showLevelIntro(withTutorial: boolean): void {
    const level = this.levelManager.getLevel(this.currentLevelId)!;
    this.introEl.innerHTML = `
      <div class="panel">
        <h2>🎯 المستوى ${level.id}: ${level.nameAr}</h2>
        <ul class="intro-goals">${level.goals.map((g) => `<li>🏆 ${g.labelAr}</li>`).join('')}</ul>
        ${level.unlocksAr.length ? `<p class="level-unlocks">🆕 جديد: ${level.unlocksAr.join('، ')}</p>` : ''}
        <button class="btn btn-primary btn-big" data-a="go">ابدأ! 🍦</button>
      </div>`;
    this.introEl.classList.remove('hidden');
    this.introEl.querySelector('[data-a="go"]')!.addEventListener('click', () => {
      this.introEl.classList.add('hidden');
      this.audio.unlock();
      this.session?.start();
      if (withTutorial) this.tutorial.start();
    });
  }

  private wireSessionUi(session: LevelSession): void {
    const ev = session.events;
    ev.on('score-updated', ({ score, coins, combo }) => this.hud.setScore(score, coins, combo));
    ev.on('time-updated', ({ remaining }) => this.hud.setTime(remaining));
    ev.on('order-presented', (customer) => this.orderCard.show(customer));
    ev.on('patience-updated', (customer) => this.orderCard.updatePatience(customer));
    ev.on('customer-left', () => this.orderCard.hide());
    ev.on('prep-rejected', (reason) => this.hud.toast(PREP_REJECTION_LABELS_AR[reason], 'error'));
    ev.on('container-placed', () => this.tutorial.notify('container'));
    ev.on('scoop-added', () => this.tutorial.notify('scoop'));
    ev.on('sauce-added', () => this.tutorial.notify('more'));
    ev.on('topping-added', () => this.tutorial.notify('more'));
    ev.on('delivery-result', ({ validation, reward, canRetry }) => {
      this.tutorial.notify('deliver');
      if (validation.isCorrect && reward) {
        this.hud.toast(`✨ ${reward.bonuses.join(' + ')} +${reward.score}`, 'success');
      } else if (reward) {
        this.hud.toast(`👍 مقبول +${reward.score}`, 'success');
      } else {
        const details = validation.errors.slice(0, 2).map((e) => ERROR_LABELS_AR[e]).join('، ');
        this.hud.toast(canRetry ? `❌ ${details} — حاول مجددًا!` : `❌ ${details}`, 'error');
      }
    });
    ev.on('level-finished', ({ result, goals }) => {
      this.orderCard.hide();
      this.tutorial.stop();
      this.save.recordLevelResult(result);
      const hasNext = !!this.levelManager.nextLevelId(result.levelId);
      this.results.show(result, goals, hasNext);
    });
  }

  private pause(): void {
    if (!this.session || this.session.isFinished) return;
    this.session.pause();
    this.pauseMenu.show(this.save.data.settings);
  }

  private resume(): void {
    this.pauseMenu.hide();
    if (this.session?.state === GameplayState.LevelPaused) this.session.resume();
  }

  private disposeGameplay(): void {
    this.tutorial.stop();
    this.orderCard.hide();
    this.gameplay?.dispose();
    this.session?.dispose();
    this.gameplay = undefined;
    this.session = undefined;
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.disposeGameplay();
    this.hud.dispose();
    this.orderCard.dispose();
    this.pauseMenu.dispose();
    this.results.dispose();
    this.tutorial.dispose();
    this.mainMenu.dispose();
    this.levelSelect.dispose();
    this.audio.dispose();
    this.engine.dispose();
  }
}
