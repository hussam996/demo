import type { IceCreamOrder } from '../orders/OrderTypes';
import type { CustomerKind } from '../../data/customers';

export type CustomerMood = 'walking' | 'waiting' | 'ordering' | 'happy' | 'angry' | 'sad';

export interface CustomerAppearance {
  skin: string;
  hair: string;
  shirt: string;
  shorts: string;
  hat?: string;
  glasses: boolean;
  hairstyle: number;
  scale: number;
}

export interface CustomerState {
  id: string;
  kind: CustomerKind;
  order: IceCreamOrder;
  appearance: CustomerAppearance;
  mood: CustomerMood;
  /** seconds of patience remaining once the order is presented */
  patienceRemaining: number;
  patienceTotal: number;
  /** index in the queue; 0 = at the window */
  queueIndex: number;
  /** whether this customer reached the window and presented their order */
  orderPresented: boolean;
}
