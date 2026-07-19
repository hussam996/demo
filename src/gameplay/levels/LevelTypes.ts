import type { ContainerType, FlavorType, SauceType, ToppingType } from '../orders/OrderTypes';
import type { CustomerKind } from '../../data/customers';

export type LevelGoalType =
  | 'score'
  | 'serve-customers'
  | 'max-mistakes'
  | 'combo-streak'
  | 'serve-vip'
  | 'earn-coins'
  | 'no-lost-customers';

export interface LevelGoal {
  type: LevelGoalType;
  /** target value: score, customers, coins, streak length, allowed mistakes... */
  value: number;
  labelAr: string;
}

export interface LevelConfig {
  id: number;
  nameAr: string;
  durationSeconds: number;
  targetScore: number;
  customerPatienceMultiplier: number;
  queueSize: number;
  allowedContainers: ContainerType[];
  allowedFlavors: FlavorType[];
  allowedSauces: SauceType[];
  allowedToppings: ToppingType[];
  minScoops: number;
  maxScoops: number;
  requireScoopOrder: boolean;
  extraIngredientsAllowed: boolean;
  customerSpawnDelaySeconds: number;
  /** base patience for one order, before per-customer multipliers */
  basePatienceSeconds: number;
  /** probability [0..1] that an order includes a sauce (when allowed) */
  sauceChance: number;
  /** max toppings a single order can ask for */
  maxToppingsPerOrder: number;
  customerKinds: CustomerKind[];
  goals: LevelGoal[];
  /** on wrong delivery: customer waits for a retry instead of leaving */
  allowRetryOnMistake: boolean;
  /** ids of content newly unlocked at this level (for the level-map preview) */
  unlocksAr: string[];
}

export interface LevelResult {
  levelId: number;
  stars: number;
  score: number;
  coinsEarned: number;
  customersServed: number;
  correctOrders: number;
  mistakes: number;
  lostCustomers: number;
  bestCombo: number;
  success: boolean;
}
