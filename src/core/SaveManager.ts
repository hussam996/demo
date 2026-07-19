import type { LevelResult } from '../gameplay/levels/LevelTypes';

export type QualityLevel = 'low' | 'medium' | 'high';

export interface GameSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  volume: number;
  quality: QualityLevel;
  reducedMotion: boolean;
  screenShakeEnabled: boolean;
}

export interface SaveData {
  version: number;
  unlockedLevel: number;
  levelResults: Record<number, LevelResult>;
  coins: number;
  highScore: number;
  settings: GameSettings;
}

export const SAVE_VERSION = 2;
const STORAGE_KEY = 'ice-cream-cart-save';

export const DEFAULT_SETTINGS: GameSettings = {
  musicEnabled: true,
  sfxEnabled: true,
  volume: 0.8,
  quality: 'medium',
  reducedMotion: false,
  screenShakeEnabled: true,
};

export function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    unlockedLevel: 1,
    levelResults: {},
    coins: 0,
    highScore: 0,
    settings: { ...DEFAULT_SETTINGS },
  };
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Versioned save persistence with migration and corruption recovery.
 * Storage is injectable so tests don't need a browser.
 */
export class SaveManager {
  private storage: StorageLike;
  private cache: SaveData;

  constructor(storage?: StorageLike) {
    this.storage = storage ?? getDefaultStorage();
    this.cache = this.loadFromStorage();
  }

  get data(): SaveData {
    return this.cache;
  }

  private loadFromStorage(): SaveData {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch {
      return createDefaultSave();
    }
    if (!raw) return createDefaultSave();
    try {
      const parsed: unknown = JSON.parse(raw);
      return sanitize(migrate(parsed));
    } catch {
      // corrupted save: recover with defaults instead of breaking the game
      return createDefaultSave();
    }
  }

  save(): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    } catch {
      // storage full or unavailable — the game keeps running with in-memory state
    }
  }

  recordLevelResult(result: LevelResult): void {
    const previous = this.cache.levelResults[result.levelId];
    if (!previous || result.score > previous.score || result.stars > previous.stars) {
      this.cache.levelResults[result.levelId] = {
        ...result,
        stars: Math.max(result.stars, previous?.stars ?? 0),
        score: Math.max(result.score, previous?.score ?? 0),
      };
    }
    if (result.success) {
      this.cache.unlockedLevel = Math.max(this.cache.unlockedLevel, result.levelId + 1);
    }
    this.cache.coins += result.coinsEarned;
    this.cache.highScore = Math.max(this.cache.highScore, result.score);
    this.save();
  }

  updateSettings(partial: Partial<GameSettings>): void {
    this.cache.settings = { ...this.cache.settings, ...partial };
    this.save();
  }

  wipe(): void {
    this.cache = createDefaultSave();
    try {
      this.storage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

/** Upgrades older save payloads to the current schema. */
export function migrate(parsed: unknown): SaveData {
  if (typeof parsed !== 'object' || parsed === null) throw new Error('invalid save');
  const obj = parsed as Partial<SaveData> & { version?: number; sound?: boolean };

  if (typeof obj.version !== 'number') throw new Error('invalid save');

  if (obj.version === 1) {
    // v1 had a single `sound` boolean instead of split music/sfx settings
    const v1 = obj as { sound?: boolean } & Partial<SaveData>;
    obj.settings = {
      ...DEFAULT_SETTINGS,
      musicEnabled: v1.sound ?? true,
      sfxEnabled: v1.sound ?? true,
      ...(typeof v1.settings === 'object' ? v1.settings : {}),
    };
    obj.version = 2;
  }

  if (obj.version !== SAVE_VERSION) throw new Error(`unsupported save version ${obj.version}`);
  return obj as SaveData;
}

function sanitize(data: SaveData): SaveData {
  const defaults = createDefaultSave();
  return {
    version: SAVE_VERSION,
    unlockedLevel:
      Number.isInteger(data.unlockedLevel) && data.unlockedLevel >= 1 ? data.unlockedLevel : 1,
    levelResults: typeof data.levelResults === 'object' && data.levelResults ? data.levelResults : {},
    coins: Number.isFinite(data.coins) && data.coins >= 0 ? data.coins : 0,
    highScore: Number.isFinite(data.highScore) && data.highScore >= 0 ? data.highScore : 0,
    settings: { ...defaults.settings, ...(typeof data.settings === 'object' ? data.settings : {}) },
  };
}

function getDefaultStorage(): StorageLike {
  // sandboxed iframes can throw on mere localStorage access — probe defensively
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.getItem('__probe__');
      return localStorage;
    }
  } catch {
    // fall through to in-memory storage
  }
  const memory = new Map<string, string>();
  return {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => void memory.set(k, v),
    removeItem: (k) => void memory.delete(k),
  };
}
