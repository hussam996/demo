import type { ToppingType } from '../gameplay/orders/OrderTypes';

export interface ToppingDef {
  id: ToppingType;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
  /** where the topping renders on the built ice cream */
  placement: 'surface' | 'top';
}

export const TOPPINGS: Record<ToppingType, ToppingDef> = {
  sprinkles: { id: 'sprinkles', nameAr: 'رشات ملونة', nameEn: 'Sprinkles', icon: '🎊', color: '#ff7eb6', placement: 'surface' },
  nuts: { id: 'nuts', nameAr: 'مكسرات', nameEn: 'Nuts', icon: '🥜', color: '#b98a52', placement: 'surface' },
  oreo: { id: 'oreo', nameAr: 'أوريو', nameEn: 'Oreo', icon: '🍪', color: '#2f2a28', placement: 'surface' },
  'chocolate-chips': { id: 'chocolate-chips', nameAr: 'قطع شوكولاتة', nameEn: 'Choco chips', icon: '🍫', color: '#3d2314', placement: 'surface' },
  fruit: { id: 'fruit', nameAr: 'قطع فواكه', nameEn: 'Fruit bits', icon: '🍉', color: '#ff6f61', placement: 'surface' },
  'whipped-cream': { id: 'whipped-cream', nameAr: 'كريمة', nameEn: 'Whipped cream', icon: '🍥', color: '#fffaf0', placement: 'top' },
  cherry: { id: 'cherry', nameAr: 'كرز', nameEn: 'Cherry', icon: '🍒', color: '#d81e3f', placement: 'top' },
};

export const TOPPING_IDS = Object.keys(TOPPINGS) as ToppingType[];
