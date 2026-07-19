import type { ContainerType } from '../gameplay/orders/OrderTypes';

export interface ContainerDef {
  id: ContainerType;
  nameAr: string;
  nameEn: string;
  icon: string;
  kind: 'cup' | 'cone';
  /** max scoops this container can physically hold */
  capacity: number;
  color: string;
}

export const CONTAINERS: Record<ContainerType, ContainerDef> = {
  'cup-small': { id: 'cup-small', nameAr: 'كوب صغير', nameEn: 'Small cup', icon: '🥤', kind: 'cup', capacity: 1, color: '#fef3ff' },
  'cup-medium': { id: 'cup-medium', nameAr: 'كوب متوسط', nameEn: 'Medium cup', icon: '🥤', kind: 'cup', capacity: 2, color: '#e8f7ff' },
  'cup-large': { id: 'cup-large', nameAr: 'كوب كبير', nameEn: 'Large cup', icon: '🥤', kind: 'cup', capacity: 3, color: '#fff2dd' },
  cone: { id: 'cone', nameAr: 'مخروط عادي', nameEn: 'Cone', icon: '🍦', kind: 'cone', capacity: 2, color: '#d9a05b' },
  'waffle-cone': { id: 'waffle-cone', nameAr: 'وافل كون', nameEn: 'Waffle cone', icon: '🧇', kind: 'cone', capacity: 3, color: '#c9843c' },
};

export const CONTAINER_IDS = Object.keys(CONTAINERS) as ContainerType[];
