import type { CustomerState } from '../gameplay/customers/CustomerTypes';
import { FLAVORS } from '../data/flavors';
import { SAUCES } from '../data/sauces';
import { TOPPINGS } from '../data/toppings';
import { CONTAINERS } from '../data/containers';
import { CUSTOMER_TYPES } from '../data/customers';

/**
 * Visual order card for the active customer: container, scoops in order,
 * sauce, toppings and the patience bar. Icons + names — never color alone.
 */
export class OrderCard {
  private el: HTMLElement;
  private patienceFill: HTMLElement;
  private customerId?: string;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'order-card hidden';
    this.el.innerHTML = `
      <div class="order-head">
        <span class="order-customer"></span>
        <span class="order-title">الطلب</span>
      </div>
      <div class="order-items"></div>
      <div class="patience-bar"><div class="patience-fill"></div></div>
    `;
    root.appendChild(this.el);
    this.patienceFill = this.el.querySelector('.patience-fill')!;
  }

  show(customer: CustomerState): void {
    this.customerId = customer.id;
    const order = customer.order;
    const kind = CUSTOMER_TYPES[customer.kind];
    this.el.querySelector('.order-customer')!.textContent = `${kind.icon} ${kind.nameAr}`;

    const items = this.el.querySelector('.order-items')!;
    items.innerHTML = '';

    const container = CONTAINERS[order.containerType];
    items.appendChild(this.item(container.icon, container.nameAr, '#fff8ee'));

    [...order.scoops]
      .sort((a, b) => a.position - b.position)
      .forEach((scoop, i) => {
        const def = FLAVORS[scoop.flavor];
        const label = order.scoops.length > 1 ? `${i + 1}. ${def.nameAr}` : def.nameAr;
        items.appendChild(this.item(def.icon, label, def.color));
      });

    if (order.sauce) {
      const def = SAUCES[order.sauce];
      items.appendChild(this.item(def.icon, def.nameAr, def.color, true));
    }
    for (const topping of order.toppings) {
      const def = TOPPINGS[topping];
      items.appendChild(this.item(def.icon, def.nameAr, def.color, true));
    }

    this.updatePatience(customer);
    this.el.classList.remove('hidden');
  }

  private item(icon: string, label: string, color: string, lightText = false): HTMLElement {
    const el = document.createElement('div');
    el.className = 'order-item';
    el.innerHTML = `
      <span class="order-chip" style="background:${color}"></span>
      <span class="order-icon">${icon}</span>
      <span class="order-label">${label}</span>
    `;
    if (lightText) el.classList.add('order-item-accent');
    return el;
  }

  updatePatience(customer: CustomerState): void {
    if (customer.id !== this.customerId) return;
    const ratio = customer.patienceTotal > 0 ? customer.patienceRemaining / customer.patienceTotal : 0;
    this.patienceFill.style.width = `${Math.round(ratio * 100)}%`;
    this.patienceFill.className = 'patience-fill ' + (ratio > 0.5 ? 'p-green' : ratio > 0.22 ? 'p-yellow' : 'p-red');
  }

  hide(): void {
    this.customerId = undefined;
    this.el.classList.add('hidden');
  }

  dispose(): void {
    this.el.remove();
  }
}
