import { describe, expect, it } from 'vitest';
import { validateOrder } from '../gameplay/orders/OrderValidator';
import type { IceCreamOrder, PreparedIceCream } from '../gameplay/orders/OrderTypes';

const baseOrder: IceCreamOrder = {
  id: 'o1',
  containerType: 'cup-medium',
  scoops: [
    { flavor: 'vanilla', position: 0 },
    { flavor: 'chocolate', position: 1 },
  ],
  sauce: 'chocolate',
  toppings: ['sprinkles'],
  timeLimitSeconds: 45,
  rewardCoins: 20,
  rewardScore: 100,
};

const strict = { requireScoopOrder: true, extraIngredientsAllowed: false };
const lenient = { requireScoopOrder: false, extraIngredientsAllowed: true };

function prepared(overrides: Partial<PreparedIceCream> = {}): PreparedIceCream {
  return {
    containerType: 'cup-medium',
    scoops: ['vanilla', 'chocolate'],
    sauce: 'chocolate',
    toppings: ['sprinkles'],
    ...overrides,
  };
}

describe('OrderValidator', () => {
  it('accepts a fully correct order', () => {
    const result = validateOrder(baseOrder, prepared(), strict);
    expect(result.isCorrect).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.scoreMultiplier).toBe(1);
  });

  it('rejects a missing container', () => {
    const result = validateOrder(baseOrder, prepared({ containerType: undefined }), strict);
    expect(result.isCorrect).toBe(false);
    expect(result.errors).toContain('no-container');
  });

  it('rejects a wrong container', () => {
    const result = validateOrder(baseOrder, prepared({ containerType: 'cone' }), strict);
    expect(result.isCorrect).toBe(false);
    expect(result.errors).toContain('wrong-container');
  });

  it('detects a missing scoop', () => {
    const result = validateOrder(baseOrder, prepared({ scoops: ['vanilla'] }), strict);
    expect(result.errors).toContain('missing-scoop');
  });

  it('detects an extra scoop', () => {
    const result = validateOrder(
      baseOrder,
      prepared({ scoops: ['vanilla', 'chocolate', 'vanilla'] }),
      strict
    );
    expect(result.errors).toContain('extra-scoop');
  });

  it('detects a wrong flavor', () => {
    const result = validateOrder(baseOrder, prepared({ scoops: ['vanilla', 'mango'] }), strict);
    expect(result.errors).toContain('wrong-flavor');
  });

  it('flags wrong scoop order when order matters', () => {
    const result = validateOrder(baseOrder, prepared({ scoops: ['chocolate', 'vanilla'] }), strict);
    expect(result.isCorrect).toBe(false);
    expect(result.errors).toEqual(['wrong-scoop-order']);
    expect(result.scoreMultiplier).toBe(0.5);
  });

  it('ignores scoop order when the level does not require it', () => {
    const result = validateOrder(baseOrder, prepared({ scoops: ['chocolate', 'vanilla'] }), lenient);
    expect(result.isCorrect).toBe(true);
  });

  it('detects missing sauce', () => {
    const result = validateOrder(baseOrder, prepared({ sauce: undefined }), strict);
    expect(result.errors).toContain('missing-sauce');
  });

  it('detects wrong sauce', () => {
    const result = validateOrder(baseOrder, prepared({ sauce: 'caramel' }), strict);
    expect(result.errors).toContain('wrong-sauce');
  });

  it('flags an unrequested sauce in strict mode', () => {
    const order: IceCreamOrder = { ...baseOrder, sauce: undefined };
    const result = validateOrder(order, prepared(), strict);
    expect(result.errors).toContain('extra-sauce');
  });

  it('tolerates an unrequested sauce in lenient mode', () => {
    const order: IceCreamOrder = { ...baseOrder, sauce: undefined };
    const result = validateOrder(order, prepared(), lenient);
    expect(result.errors).not.toContain('extra-sauce');
    expect(result.isCorrect).toBe(true);
  });

  it('detects a missing topping', () => {
    const result = validateOrder(baseOrder, prepared({ toppings: [] }), strict);
    expect(result.errors).toContain('missing-topping');
  });

  it('detects an extra topping in strict mode', () => {
    const result = validateOrder(
      baseOrder,
      prepared({ toppings: ['sprinkles', 'nuts'] }),
      strict
    );
    expect(result.errors).toContain('extra-topping');
  });

  it('tolerates extra toppings in lenient mode', () => {
    const result = validateOrder(
      baseOrder,
      prepared({ toppings: ['sprinkles', 'nuts'] }),
      lenient
    );
    expect(result.isCorrect).toBe(true);
  });

  it('handles an order without sauce correctly', () => {
    const order: IceCreamOrder = { ...baseOrder, sauce: undefined };
    const result = validateOrder(order, prepared({ sauce: undefined }), strict);
    expect(result.isCorrect).toBe(true);
  });

  it('handles multi-topping orders', () => {
    const order: IceCreamOrder = { ...baseOrder, toppings: ['sprinkles', 'cherry', 'nuts'] };
    const ok = validateOrder(order, prepared({ toppings: ['cherry', 'nuts', 'sprinkles'] }), strict);
    expect(ok.isCorrect).toBe(true);
    const missing = validateOrder(order, prepared({ toppings: ['cherry', 'nuts'] }), strict);
    expect(missing.errors).toContain('missing-topping');
  });

  it('accumulates several distinct errors at once', () => {
    const result = validateOrder(
      baseOrder,
      prepared({ containerType: 'cone', scoops: ['mango'], sauce: undefined, toppings: [] }),
      strict
    );
    expect(result.isCorrect).toBe(false);
    expect(result.scoreMultiplier).toBe(0);
    expect(result.errors).toEqual(
      expect.arrayContaining(['wrong-container', 'missing-scoop', 'missing-sauce', 'missing-topping'])
    );
  });
});
