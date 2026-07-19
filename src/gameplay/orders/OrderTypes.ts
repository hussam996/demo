export type ContainerType = 'cup-small' | 'cup-medium' | 'cup-large' | 'cone' | 'waffle-cone';

export type FlavorType =
  | 'vanilla'
  | 'chocolate'
  | 'strawberry'
  | 'mango'
  | 'pistachio'
  | 'berry'
  | 'caramel'
  | 'mint';

export type SauceType = 'chocolate' | 'caramel' | 'strawberry';

export type ToppingType =
  | 'sprinkles'
  | 'nuts'
  | 'oreo'
  | 'chocolate-chips'
  | 'fruit'
  | 'whipped-cream'
  | 'cherry';

export type OrderSpecialRule = 'exact-order' | 'no-extras' | 'vip-precision';

export interface ScoopOrderItem {
  flavor: FlavorType;
  /** 0 = bottom scoop */
  position: number;
}

export interface IceCreamOrder {
  id: string;
  containerType: ContainerType;
  scoops: ScoopOrderItem[];
  sauce?: SauceType;
  toppings: ToppingType[];
  timeLimitSeconds: number;
  rewardCoins: number;
  rewardScore: number;
  specialRules?: OrderSpecialRule[];
}

export interface PreparedIceCream {
  containerType?: ContainerType;
  /** bottom-to-top */
  scoops: FlavorType[];
  sauce?: SauceType;
  toppings: ToppingType[];
}

export type OrderValidationError =
  | 'no-container'
  | 'wrong-container'
  | 'missing-scoop'
  | 'extra-scoop'
  | 'wrong-flavor'
  | 'wrong-scoop-order'
  | 'missing-sauce'
  | 'wrong-sauce'
  | 'extra-sauce'
  | 'missing-topping'
  | 'extra-topping';

export interface OrderValidationResult {
  isCorrect: boolean;
  errors: OrderValidationError[];
  /** 1 for perfect; partial credit < 1 on lenient levels */
  scoreMultiplier: number;
}

export interface OrderValidationOptions {
  /** when false, scoop flavors are compared as multisets */
  requireScoopOrder: boolean;
  /** when true, unrequested ingredients are tolerated (early levels) */
  extraIngredientsAllowed: boolean;
}
