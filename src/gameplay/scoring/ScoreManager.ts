import type { IceCreamOrder, OrderValidationResult } from '../orders/OrderTypes';
import type { CustomerTypeDef } from '../../data/customers';
import { ComboManager } from './ComboManager';

export interface DeliveryScore {
  score: number;
  coins: number;
  bonuses: string[];
  comboMultiplier: number;
}

export class ScoreManager {
  readonly combo = new ComboManager();
  private totalScore = 0;
  private totalCoins = 0;
  private served = 0;
  private correct = 0;
  private mistakeCount = 0;
  private lost = 0;
  private vipServed = 0;
  private noMistakes = true;

  reset(): void {
    this.combo.reset();
    this.totalScore = 0;
    this.totalCoins = 0;
    this.served = 0;
    this.correct = 0;
    this.mistakeCount = 0;
    this.lost = 0;
    this.vipServed = 0;
    this.noMistakes = true;
  }

  /**
   * Applies a correct (or partially correct) delivery.
   * patienceRatio: fraction of patience time remaining [0..1].
   */
  applyDelivery(
    order: IceCreamOrder,
    validation: OrderValidationResult,
    patienceRatio: number,
    customer: CustomerTypeDef
  ): DeliveryScore {
    const bonuses: string[] = [];
    this.served++;
    this.correct++;
    if (customer.id === 'vip') this.vipServed++;
    this.combo.registerSuccess();
    const comboMultiplier = this.combo.multiplier;

    let score = order.rewardScore * validation.scoreMultiplier;
    if (validation.scoreMultiplier >= 1) bonuses.push('Perfect Order');

    if (patienceRatio > 0.6) {
      score += order.rewardScore * 0.5 * customer.speedBonusMultiplier;
      bonuses.push('Fast Service');
    } else {
      score += order.rewardScore * patienceRatio * 0.4;
    }

    score *= comboMultiplier;
    if (comboMultiplier > 1) bonuses.push(`Combo x${comboMultiplier}`);

    const coins = Math.round(order.rewardCoins * (1 + (comboMultiplier - 1) * 0.25));
    this.totalScore += Math.round(score);
    this.totalCoins += coins;

    return { score: Math.round(score), coins, bonuses, comboMultiplier };
  }

  applyMistake(penalty = 25): void {
    this.mistakeCount++;
    this.noMistakes = false;
    this.combo.registerFailure();
    this.totalScore = Math.max(0, this.totalScore - penalty);
  }

  applyLostCustomer(penalty = 50): void {
    this.lost++;
    this.noMistakes = false;
    this.combo.registerFailure();
    this.totalScore = Math.max(0, this.totalScore - penalty);
  }

  applyLevelClearBonus(): number {
    let bonus = 100;
    if (this.noMistakes) bonus += 150;
    this.totalScore += bonus;
    return bonus;
  }

  get score(): number {
    return this.totalScore;
  }
  get coins(): number {
    return this.totalCoins;
  }
  get customersServed(): number {
    return this.served;
  }
  get correctOrders(): number {
    return this.correct;
  }
  get mistakes(): number {
    return this.mistakeCount;
  }
  get lostCustomers(): number {
    return this.lost;
  }
  get vipCustomersServed(): number {
    return this.vipServed;
  }
  get hadNoMistakes(): boolean {
    return this.noMistakes;
  }
}
