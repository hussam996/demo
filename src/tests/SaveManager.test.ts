import { describe, expect, it } from 'vitest';
import {
  SaveManager,
  SAVE_VERSION,
  createDefaultSave,
  migrate,
} from '../core/SaveManager';

function memoryStorage(initial?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    dump: () => Object.fromEntries(map),
  };
}

describe('SaveManager', () => {
  it('creates a fresh save when storage is empty', () => {
    const save = new SaveManager(memoryStorage());
    expect(save.data.version).toBe(SAVE_VERSION);
    expect(save.data.unlockedLevel).toBe(1);
    expect(save.data.coins).toBe(0);
  });

  it('persists and reloads data', () => {
    const storage = memoryStorage();
    const save = new SaveManager(storage);
    save.recordLevelResult({
      levelId: 1,
      stars: 2,
      score: 800,
      coinsEarned: 120,
      customersServed: 8,
      correctOrders: 8,
      mistakes: 0,
      lostCustomers: 0,
      bestCombo: 3,
      success: true,
    });
    const reloaded = new SaveManager(storage);
    expect(reloaded.data.unlockedLevel).toBe(2);
    expect(reloaded.data.coins).toBe(120);
    expect(reloaded.data.highScore).toBe(800);
    expect(reloaded.data.levelResults[1].stars).toBe(2);
  });

  it('recovers from corrupted JSON without crashing', () => {
    const storage = memoryStorage({ 'ice-cream-cart-save': '{not json at all' });
    const save = new SaveManager(storage);
    expect(save.data.unlockedLevel).toBe(1);
  });

  it('recovers from valid JSON with a broken shape', () => {
    const storage = memoryStorage({ 'ice-cream-cart-save': '"just a string"' });
    const save = new SaveManager(storage);
    expect(save.data).toEqual(createDefaultSave());
  });

  it('migrates a v1 save to the current version', () => {
    const v1 = {
      version: 1,
      unlockedLevel: 4,
      levelResults: {},
      coins: 300,
      highScore: 1500,
      sound: false,
    };
    const storage = memoryStorage({ 'ice-cream-cart-save': JSON.stringify(v1) });
    const save = new SaveManager(storage);
    expect(save.data.version).toBe(SAVE_VERSION);
    expect(save.data.unlockedLevel).toBe(4);
    expect(save.data.coins).toBe(300);
    expect(save.data.settings.musicEnabled).toBe(false);
    expect(save.data.settings.sfxEnabled).toBe(false);
  });

  it('rejects unknown future versions and falls back to defaults', () => {
    const future = { ...createDefaultSave(), version: 999 };
    expect(() => migrate(future)).toThrow();
    const storage = memoryStorage({ 'ice-cream-cart-save': JSON.stringify(future) });
    const save = new SaveManager(storage);
    expect(save.data.version).toBe(SAVE_VERSION);
    expect(save.data.unlockedLevel).toBe(1);
  });

  it('wipes progress', () => {
    const storage = memoryStorage();
    const save = new SaveManager(storage);
    save.updateSettings({ musicEnabled: false });
    save.wipe();
    expect(save.data).toEqual(createDefaultSave());
    expect(new SaveManager(storage).data.settings.musicEnabled).toBe(true);
  });

  it('keeps best stars/score when replaying a level with a worse result', () => {
    const save = new SaveManager(memoryStorage());
    const good = {
      levelId: 1, stars: 3, score: 900, coinsEarned: 50, customersServed: 5,
      correctOrders: 5, mistakes: 0, lostCustomers: 0, bestCombo: 4, success: true,
    };
    const worse = { ...good, stars: 1, score: 400, coinsEarned: 20 };
    save.recordLevelResult(good);
    save.recordLevelResult(worse);
    expect(save.data.levelResults[1].stars).toBe(3);
    expect(save.data.levelResults[1].score).toBe(900);
    expect(save.data.coins).toBe(70);
  });
});
