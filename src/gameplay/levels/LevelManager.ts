import type { LevelConfig, LevelGoal, LevelResult } from './LevelTypes';
import { LEVEL_CONFIGS, getLevelConfig } from './levelConfigs';
import type { ScoreManager } from '../scoring/ScoreManager';

export interface GoalProgress {
  goal: LevelGoal;
  achieved: boolean;
  current: number;
}

export function evaluateGoals(level: LevelConfig, score: ScoreManager): GoalProgress[] {
  return level.goals.map((goal) => {
    switch (goal.type) {
      case 'score':
        return { goal, achieved: score.score >= goal.value, current: score.score };
      case 'serve-customers':
        return { goal, achieved: score.customersServed >= goal.value, current: score.customersServed };
      case 'max-mistakes':
        return { goal, achieved: score.mistakes <= goal.value, current: score.mistakes };
      case 'combo-streak':
        return { goal, achieved: score.combo.bestStreak >= goal.value, current: score.combo.bestStreak };
      case 'serve-vip':
        return { goal, achieved: score.vipCustomersServed >= goal.value, current: score.vipCustomersServed };
      case 'earn-coins':
        return { goal, achieved: score.coins >= goal.value, current: score.coins };
      case 'no-lost-customers':
        return { goal, achieved: score.lostCustomers <= goal.value, current: score.lostCustomers };
    }
  });
}

export function computeStars(level: LevelConfig, score: ScoreManager, success: boolean): number {
  if (!success) return 0;
  let stars = 1;
  if (score.score >= level.targetScore * 1.3) stars = 2;
  if (score.score >= level.targetScore * 1.6 && score.lostCustomers === 0) stars = 3;
  return stars;
}

export function buildLevelResult(
  level: LevelConfig,
  score: ScoreManager,
  success: boolean
): LevelResult {
  return {
    levelId: level.id,
    stars: computeStars(level, score, success),
    score: score.score,
    coinsEarned: score.coins,
    customersServed: score.customersServed,
    correctOrders: score.correctOrders,
    mistakes: score.mistakes,
    lostCustomers: score.lostCustomers,
    bestCombo: score.combo.bestMultiplier,
    success,
  };
}

export class LevelManager {
  get levels(): readonly LevelConfig[] {
    return LEVEL_CONFIGS;
  }

  getLevel(id: number): LevelConfig | undefined {
    return getLevelConfig(id);
  }

  isUnlocked(id: number, unlockedLevel: number): boolean {
    return id <= unlockedLevel;
  }

  nextLevelId(id: number): number | undefined {
    return getLevelConfig(id + 1)?.id;
  }
}
