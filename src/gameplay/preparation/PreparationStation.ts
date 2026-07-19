import type {
  ContainerType,
  FlavorType,
  PreparedIceCream,
  SauceType,
  ToppingType,
} from '../orders/OrderTypes';
import { CONTAINERS } from '../../data/containers';

export type PrepRejectionReason =
  | 'no-container'
  | 'container-already-placed'
  | 'max-scoops-reached'
  | 'no-scoops-yet'
  | 'sauce-already-added'
  | 'topping-already-added';

export interface PrepActionResult {
  ok: boolean;
  reason?: PrepRejectionReason;
}

/**
 * Holds the ice cream being built and enforces build rules:
 * container first, scoop capacity, sauce/toppings only on top of scoops.
 */
export class PreparationStation {
  private prepared: PreparedIceCream = { scoops: [], toppings: [] };
  private levelMaxScoops = 3;

  setLevelMaxScoops(max: number): void {
    this.levelMaxScoops = max;
  }

  get current(): Readonly<PreparedIceCream> {
    return this.prepared;
  }

  get hasContainer(): boolean {
    return this.prepared.containerType !== undefined;
  }

  get isEmpty(): boolean {
    return !this.hasContainer;
  }

  get maxScoopsForCurrent(): number {
    if (!this.prepared.containerType) return 0;
    return Math.min(this.levelMaxScoops, CONTAINERS[this.prepared.containerType].capacity);
  }

  placeContainer(container: ContainerType): PrepActionResult {
    if (this.prepared.containerType) return { ok: false, reason: 'container-already-placed' };
    this.prepared.containerType = container;
    return { ok: true };
  }

  addScoop(flavor: FlavorType): PrepActionResult {
    if (!this.prepared.containerType) return { ok: false, reason: 'no-container' };
    if (this.prepared.scoops.length >= this.maxScoopsForCurrent) {
      return { ok: false, reason: 'max-scoops-reached' };
    }
    this.prepared.scoops.push(flavor);
    return { ok: true };
  }

  addSauce(sauce: SauceType): PrepActionResult {
    if (!this.prepared.containerType) return { ok: false, reason: 'no-container' };
    if (this.prepared.scoops.length === 0) return { ok: false, reason: 'no-scoops-yet' };
    if (this.prepared.sauce) return { ok: false, reason: 'sauce-already-added' };
    this.prepared.sauce = sauce;
    return { ok: true };
  }

  addTopping(topping: ToppingType): PrepActionResult {
    if (!this.prepared.containerType) return { ok: false, reason: 'no-container' };
    if (this.prepared.scoops.length === 0) return { ok: false, reason: 'no-scoops-yet' };
    if (this.prepared.toppings.includes(topping)) {
      return { ok: false, reason: 'topping-already-added' };
    }
    this.prepared.toppings.push(topping);
    return { ok: true };
  }

  clear(): void {
    this.prepared = { scoops: [], toppings: [] };
  }

  /** returns the built product and empties the station */
  take(): PreparedIceCream {
    const result = this.prepared;
    this.clear();
    return result;
  }
}

export const PREP_REJECTION_LABELS_AR: Record<PrepRejectionReason, string> = {
  'no-container': 'اختر كوبًا أو مخروطًا أولًا',
  'container-already-placed': 'يوجد وعاء بالفعل — أفرغ المنصة أولًا',
  'max-scoops-reached': 'وصلت للحد الأقصى من السكوبات',
  'no-scoops-yet': 'أضف سكوب آيس كريم أولًا',
  'sauce-already-added': 'تمت إضافة صوص بالفعل',
  'topping-already-added': 'هذه الإضافة موجودة بالفعل',
};
