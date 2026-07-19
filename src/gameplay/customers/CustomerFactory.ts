import type { CustomerAppearance, CustomerState } from './CustomerTypes';
import { CUSTOMER_PALETTE, CUSTOMER_TYPES, type CustomerKind } from '../../data/customers';
import type { LevelConfig } from '../levels/LevelTypes';
import { generateOrder } from '../orders/OrderGenerator';
import { Rng } from '../../core/Rng';

let customerCounter = 0;

export function pickCustomerKind(level: LevelConfig, rng: Rng): CustomerKind {
  const kinds = level.customerKinds.filter((k) => CUSTOMER_TYPES[k].minLevel <= level.id);
  const weights = kinds.map((k) => CUSTOMER_TYPES[k].weight);
  return rng.weightedPick(kinds, weights);
}

export function createAppearance(kind: CustomerKind, rng: Rng): CustomerAppearance {
  const def = CUSTOMER_TYPES[kind];
  return {
    skin: rng.pick(CUSTOMER_PALETTE.skins),
    hair: rng.pick(CUSTOMER_PALETTE.hairs),
    shirt: rng.pick(CUSTOMER_PALETTE.shirts),
    shorts: rng.pick(CUSTOMER_PALETTE.shorts),
    hat: rng.chance(kind === 'vip' ? 0.9 : 0.35) ? rng.pick(CUSTOMER_PALETTE.hats) : undefined,
    glasses: rng.chance(0.3),
    hairstyle: rng.int(0, 3),
    scale: def.scale * (0.94 + rng.next() * 0.12),
  };
}

export function createCustomer(level: LevelConfig, rng: Rng, queueIndex: number): CustomerState {
  const kind = pickCustomerKind(level, rng);
  const def = CUSTOMER_TYPES[kind];
  const order = generateOrder(level, def, rng);
  return {
    id: `customer-${++customerCounter}`,
    kind,
    order,
    appearance: createAppearance(kind, rng),
    mood: 'walking',
    patienceRemaining: order.timeLimitSeconds,
    patienceTotal: order.timeLimitSeconds,
    queueIndex,
    orderPresented: false,
  };
}
