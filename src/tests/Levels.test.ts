import { describe, expect, it } from 'vitest';
import { LEVEL_CONFIGS, getLevelConfig } from '../gameplay/levels/levelConfigs';
import { LevelManager, computeStars, evaluateGoals } from '../gameplay/levels/LevelManager';
import { generateOrder } from '../gameplay/orders/OrderGenerator';
import { CUSTOMER_TYPES } from '../data/customers';
import { CONTAINERS } from '../data/containers';
import { ScoreManager } from '../gameplay/scoring/ScoreManager';
import { LevelSession } from '../gameplay/LevelSession';
import { SaveManager } from '../core/SaveManager';
import { buildLevelResult } from '../gameplay/levels/LevelManager';
import { Rng } from '../core/Rng';

describe('level configs', () => {
  it('defines at least 8 levels with increasing difficulty markers', () => {
    expect(LEVEL_CONFIGS.length).toBeGreaterThanOrEqual(8);
    const first = LEVEL_CONFIGS[0];
    const last = LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1];
    expect(first.requireScoopOrder).toBe(false);
    expect(last.requireScoopOrder).toBe(true);
    expect(last.targetScore).toBeGreaterThan(first.targetScore);
    expect(last.queueSize).toBeGreaterThan(first.queueSize);
  });

  it('never references locked ingredients in generated orders', () => {
    const rng = new Rng(42);
    for (const level of LEVEL_CONFIGS) {
      for (let i = 0; i < 50; i++) {
        const order = generateOrder(level, CUSTOMER_TYPES.regular, rng);
        expect(level.allowedContainers).toContain(order.containerType);
        for (const scoop of order.scoops) expect(level.allowedFlavors).toContain(scoop.flavor);
        if (order.sauce) expect(level.allowedSauces).toContain(order.sauce);
        for (const topping of order.toppings) expect(level.allowedToppings).toContain(topping);
      }
    }
  });

  it('respects scoop count bounds and container capacity', () => {
    const rng = new Rng(7);
    for (const level of LEVEL_CONFIGS) {
      for (let i = 0; i < 50; i++) {
        const order = generateOrder(level, CUSTOMER_TYPES.regular, rng);
        expect(order.scoops.length).toBeGreaterThanOrEqual(1);
        expect(order.scoops.length).toBeLessThanOrEqual(level.maxScoops);
        expect(order.scoops.length).toBeLessThanOrEqual(CONTAINERS[order.containerType].capacity);
      }
    }
  });

  it('does not enforce scoop order before level 5', () => {
    for (const level of LEVEL_CONFIGS.filter((l) => l.id < 5)) {
      expect(level.requireScoopOrder).toBe(false);
    }
    expect(getLevelConfig(5)?.requireScoopOrder).toBe(true);
  });

  it('queue size grows with level id', () => {
    expect(getLevelConfig(1)!.queueSize).toBeLessThan(getLevelConfig(8)!.queueSize);
  });

  it('spawns queues bounded by the level queue size', () => {
    const level = getLevelConfig(1)!;
    const session = new LevelSession(level, new Rng(1));
    session.start();
    for (let i = 0; i < 600; i++) session.tick(0.5);
    expect(session.queue.length).toBeLessThanOrEqual(level.queueSize);
    session.dispose();
  });
});

describe('goals and stars', () => {
  it('computes the score goal correctly', () => {
    const level = getLevelConfig(1)!;
    const score = new ScoreManager();
    const before = evaluateGoals(level, score);
    expect(before.every((g) => g.goal.type !== 'score' || !g.achieved)).toBe(true);

    const order = generateOrder(level, CUSTOMER_TYPES.regular, new Rng(3));
    for (let i = 0; i < 20; i++) {
      score.applyDelivery(order, { isCorrect: true, errors: [], scoreMultiplier: 1 }, 1, CUSTOMER_TYPES.regular);
    }
    const after = evaluateGoals(level, score);
    expect(after.find((g) => g.goal.type === 'score')?.achieved).toBe(true);
  });

  it('awards 0 stars on failure and up to 3 on strong success', () => {
    const level = getLevelConfig(1)!;
    const score = new ScoreManager();
    expect(computeStars(level, score, false)).toBe(0);
    const order = generateOrder(level, CUSTOMER_TYPES.regular, new Rng(3));
    for (let i = 0; i < 30; i++) {
      score.applyDelivery(order, { isCorrect: true, errors: [], scoreMultiplier: 1 }, 1, CUSTOMER_TYPES.regular);
    }
    expect(computeStars(level, score, true)).toBe(3);
  });

  it('success unlocks the next level in the save', () => {
    const save = new SaveManager();
    save.wipe();
    const level = getLevelConfig(1)!;
    const score = new ScoreManager();
    score.applyDelivery(
      generateOrder(level, CUSTOMER_TYPES.regular, new Rng(3)),
      { isCorrect: true, errors: [], scoreMultiplier: 1 },
      1,
      CUSTOMER_TYPES.regular
    );
    save.recordLevelResult(buildLevelResult(level, score, true));
    expect(save.data.unlockedLevel).toBe(2);

    const manager = new LevelManager();
    expect(manager.isUnlocked(2, save.data.unlockedLevel)).toBe(true);
    expect(manager.isUnlocked(3, save.data.unlockedLevel)).toBe(false);
    save.wipe();
  });
});
