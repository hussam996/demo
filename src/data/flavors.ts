import type { FlavorType } from '../gameplay/orders/OrderTypes';

export interface FlavorDef {
  id: FlavorType;
  nameAr: string;
  nameEn: string;
  icon: string;
  /** base color of the scoop / tub surface */
  color: string;
  /** slightly darker accent used for tub rim + label */
  accent: string;
}

export const FLAVORS: Record<FlavorType, FlavorDef> = {
  vanilla: { id: 'vanilla', nameAr: 'فانيلا', nameEn: 'Vanilla', icon: '🍦', color: '#f6ecd4', accent: '#d9c491' },
  chocolate: { id: 'chocolate', nameAr: 'شوكولاتة', nameEn: 'Chocolate', icon: '🍫', color: '#6b4226', accent: '#4a2c17' },
  strawberry: { id: 'strawberry', nameAr: 'فراولة', nameEn: 'Strawberry', icon: '🍓', color: '#f78fb3', accent: '#d6608c' },
  mango: { id: 'mango', nameAr: 'مانجو', nameEn: 'Mango', icon: '🥭', color: '#ffc04d', accent: '#e09a1e' },
  pistachio: { id: 'pistachio', nameAr: 'فستق', nameEn: 'Pistachio', icon: '🌰', color: '#a8d5a2', accent: '#77a871' },
  berry: { id: 'berry', nameAr: 'توت', nameEn: 'Berry', icon: '🫐', color: '#8d6cc3', accent: '#63459c' },
  caramel: { id: 'caramel', nameAr: 'كراميل', nameEn: 'Caramel', icon: '🍮', color: '#d9a05b', accent: '#b17c39' },
  mint: { id: 'mint', nameAr: 'نعناع', nameEn: 'Mint', icon: '🌿', color: '#9fe2d0', accent: '#66baa4' },
};

export const FLAVOR_IDS = Object.keys(FLAVORS) as FlavorType[];
