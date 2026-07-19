import type { SauceType } from '../gameplay/orders/OrderTypes';

export interface SauceDef {
  id: SauceType;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
  glossiness: number;
}

export const SAUCES: Record<SauceType, SauceDef> = {
  chocolate: { id: 'chocolate', nameAr: 'صوص شوكولاتة', nameEn: 'Chocolate sauce', icon: '🍫', color: '#4a2c17', glossiness: 0.85 },
  caramel: { id: 'caramel', nameAr: 'صوص كراميل', nameEn: 'Caramel sauce', icon: '🍯', color: '#c97f2e', glossiness: 0.95 },
  strawberry: { id: 'strawberry', nameAr: 'صوص فراولة', nameEn: 'Strawberry sauce', icon: '🍓', color: '#e0457b', glossiness: 0.8 },
};

export const SAUCE_IDS = Object.keys(SAUCES) as SauceType[];
