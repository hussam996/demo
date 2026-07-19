export type CustomerKind = 'regular' | 'kid' | 'hurried' | 'vip' | 'family';

export interface CustomerTypeDef {
  id: CustomerKind;
  nameAr: string;
  icon: string;
  /** multiplies the level's base patience */
  patienceMultiplier: number;
  /** multiplies order rewards */
  rewardMultiplier: number;
  /** extra reward multiplier applied to the speed bonus */
  speedBonusMultiplier: number;
  /** clamps order complexity: max scoops relative to level max */
  maxScoopsDelta: number;
  /** vip demands full precision: any error fails the order */
  requiresPrecision: boolean;
  /** relative spawn weight */
  weight: number;
  /** minimum level id at which this type appears */
  minLevel: number;
  /** body scale for rendering variety */
  scale: number;
}

export const CUSTOMER_TYPES: Record<CustomerKind, CustomerTypeDef> = {
  regular: {
    id: 'regular', nameAr: 'زبون عادي', icon: '🙂',
    patienceMultiplier: 1, rewardMultiplier: 1, speedBonusMultiplier: 1,
    maxScoopsDelta: 0, requiresPrecision: false, weight: 10, minLevel: 1, scale: 1,
  },
  kid: {
    id: 'kid', nameAr: 'طفل', icon: '🧒',
    patienceMultiplier: 0.85, rewardMultiplier: 0.9, speedBonusMultiplier: 1,
    maxScoopsDelta: -1, requiresPrecision: false, weight: 6, minLevel: 2, scale: 0.68,
  },
  hurried: {
    id: 'hurried', nameAr: 'زبون مستعجل', icon: '⏱️',
    patienceMultiplier: 0.6, rewardMultiplier: 1.1, speedBonusMultiplier: 2,
    maxScoopsDelta: 0, requiresPrecision: false, weight: 4, minLevel: 3, scale: 1,
  },
  vip: {
    id: 'vip', nameAr: 'زبون VIP', icon: '⭐',
    patienceMultiplier: 1.15, rewardMultiplier: 2, speedBonusMultiplier: 1.5,
    maxScoopsDelta: 1, requiresPrecision: true, weight: 2, minLevel: 7, scale: 1.05,
  },
  family: {
    id: 'family', nameAr: 'عائلة', icon: '👨‍👩‍👧',
    patienceMultiplier: 1.3, rewardMultiplier: 1.5, speedBonusMultiplier: 1,
    maxScoopsDelta: 1, requiresPrecision: false, weight: 0, minLevel: 99, scale: 1,
  },
};

/** Cartoon palette used by the procedural customer models */
export const CUSTOMER_PALETTE = {
  skins: ['#f5cfa8', '#e8b28a', '#c98d5f', '#a06a42', '#7c4f2e', '#f9ddc0'],
  hairs: ['#2d2118', '#5b3a1e', '#a3672b', '#d8a94e', '#8c8c8c', '#b0503a', '#3a3a52'],
  shirts: ['#ff8f6b', '#ffd166', '#6bd0ff', '#8ee08a', '#f78fb3', '#b39ddb', '#4dd0c4', '#ffe0f0'],
  shorts: ['#3b6ea5', '#c96f4a', '#5f7161', '#8a5fb0', '#e0b34d', '#607d8b'],
  hats: ['#ffcf5c', '#ff7e67', '#7ec8e3', '#98d99a'],
};
