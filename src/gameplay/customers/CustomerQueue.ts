import type { CustomerState } from './CustomerTypes';

/** Ordered queue of customers; index 0 is at the serving window. */
export class CustomerQueue {
  private customers: CustomerState[] = [];

  get all(): readonly CustomerState[] {
    return this.customers;
  }

  get front(): CustomerState | undefined {
    return this.customers[0];
  }

  get length(): number {
    return this.customers.length;
  }

  enqueue(customer: CustomerState): void {
    customer.queueIndex = this.customers.length;
    this.customers.push(customer);
  }

  /** removes a customer (served or left) and shifts everyone forward */
  remove(id: string): CustomerState | undefined {
    const idx = this.customers.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    const [removed] = this.customers.splice(idx, 1);
    this.customers.forEach((c, i) => (c.queueIndex = i));
    return removed;
  }

  clear(): void {
    this.customers = [];
  }
}
