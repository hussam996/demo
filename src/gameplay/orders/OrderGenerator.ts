import type { IceCreamOrder, ScoopOrderItem, ToppingType } from './OrderTypes';
import type { LevelConfig } from '../levels/LevelTypes';
import type { CustomerTypeDef } from '../../data/customers';
import { CONTAINERS } from '../../data/containers';
import { TOPPINGS } from '../../data/toppings';
import { Rng } from '../../core/Rng';

let orderCounter = 0;

/**
 * Generates a random order constrained by the level config and customer type.
 * Only unlocked (allowed) ingredients are ever used.
 */
export function generateOrder(
  level: LevelConfig,
  customer: CustomerTypeDef,
  rng: Rng = new Rng()
): IceCreamOrder {
  const maxScoops = Math.max(
    level.minScoops,
    Math.min(3, level.maxScoops + customer.maxScoopsDelta)
  );
  const scoopCount = rng.int(level.minScoops, maxScoops);

  // container must be able to hold the scoops
  const viableContainers = level.allowedContainers.filter(
    (c) => CONTAINERS[c].capacity >= scoopCount
  );
  const containerType =
    viableContainers.length > 0 ? rng.pick(viableContainers) : rng.pick(level.allowedContainers);
  const finalScoopCount = Math.min(scoopCount, CONTAINERS[containerType].capacity);

  const scoops: ScoopOrderItem[] = [];
  for (let i = 0; i < finalScoopCount; i++) {
    scoops.push({ flavor: rng.pick(level.allowedFlavors), position: i });
  }

  const sauce =
    level.allowedSauces.length > 0 && rng.chance(level.sauceChance)
      ? rng.pick(level.allowedSauces)
      : undefined;

  const toppings: ToppingType[] = [];
  if (level.allowedToppings.length > 0 && level.maxToppingsPerOrder > 0) {
    const min = customer.id === 'vip' ? 1 : 0;
    const count = rng.int(min, level.maxToppingsPerOrder);
    const pool = [...level.allowedToppings];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = rng.int(0, pool.length - 1);
      toppings.push(pool.splice(idx, 1)[0]);
    }
    // only one 'top' placement topping makes sense visually — keep at most one
    const tops = toppings.filter((t) => TOPPINGS[t].placement === 'top');
    if (tops.length > 1) {
      const keep = tops[0];
      const filtered = toppings.filter((t) => TOPPINGS[t].placement !== 'top');
      filtered.push(keep);
      toppings.length = 0;
      toppings.push(...filtered);
    }
  }

  const complexity =
    finalScoopCount + (sauce ? 1 : 0) + toppings.length + (level.requireScoopOrder ? 1 : 0);

  const patience = level.basePatienceSeconds * level.customerPatienceMultiplier * customer.patienceMultiplier;

  return {
    id: `order-${++orderCounter}`,
    containerType,
    scoops,
    sauce,
    toppings,
    timeLimitSeconds: Math.round(patience + complexity * 3),
    rewardCoins: Math.round((8 + complexity * 4) * customer.rewardMultiplier),
    rewardScore: Math.round((40 + complexity * 25) * customer.rewardMultiplier),
    specialRules: customer.requiresPrecision ? ['vip-precision'] : undefined,
  };
}
