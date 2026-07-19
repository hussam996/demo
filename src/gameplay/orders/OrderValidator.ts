import type {
  FlavorType,
  IceCreamOrder,
  OrderValidationError,
  OrderValidationOptions,
  OrderValidationResult,
  PreparedIceCream,
} from './OrderTypes';

function countBy<T extends string>(items: T[]): Map<T, number> {
  const map = new Map<T, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return map;
}

/**
 * Compares what the player prepared against the customer's order.
 * Rules vary per level: scoop order enforcement and tolerance of extras.
 */
export function validateOrder(
  order: IceCreamOrder,
  prepared: PreparedIceCream,
  options: OrderValidationOptions
): OrderValidationResult {
  const errors: OrderValidationError[] = [];

  if (!prepared.containerType) {
    errors.push('no-container');
  } else if (prepared.containerType !== order.containerType) {
    errors.push('wrong-container');
  }

  const wantedFlavors = [...order.scoops]
    .sort((a, b) => a.position - b.position)
    .map((s) => s.flavor);

  if (prepared.scoops.length < wantedFlavors.length) errors.push('missing-scoop');
  if (prepared.scoops.length > wantedFlavors.length) errors.push('extra-scoop');

  if (prepared.scoops.length === wantedFlavors.length) {
    if (options.requireScoopOrder) {
      const sameSet = multisetEquals(wantedFlavors, prepared.scoops);
      const sameSequence = wantedFlavors.every((f, i) => prepared.scoops[i] === f);
      if (!sameSequence) errors.push(sameSet ? 'wrong-scoop-order' : 'wrong-flavor');
    } else if (!multisetEquals(wantedFlavors, prepared.scoops)) {
      errors.push('wrong-flavor');
    }
  }

  if (order.sauce && !prepared.sauce) errors.push('missing-sauce');
  if (order.sauce && prepared.sauce && prepared.sauce !== order.sauce) errors.push('wrong-sauce');
  if (!order.sauce && prepared.sauce && !options.extraIngredientsAllowed) errors.push('extra-sauce');

  const wantedToppings = countBy(order.toppings);
  const givenToppings = countBy(prepared.toppings);
  for (const [topping, wanted] of wantedToppings) {
    if ((givenToppings.get(topping) ?? 0) < wanted) errors.push('missing-topping');
  }
  if (!options.extraIngredientsAllowed) {
    for (const [topping, given] of givenToppings) {
      if (given > (wantedToppings.get(topping) ?? 0)) {
        errors.push('extra-topping');
        break;
      }
    }
  }

  const uniqueErrors = [...new Set(errors)];
  return {
    isCorrect: uniqueErrors.length === 0,
    errors: uniqueErrors,
    scoreMultiplier: computeMultiplier(uniqueErrors),
  };
}

function multisetEquals(a: FlavorType[], b: FlavorType[]): boolean {
  if (a.length !== b.length) return false;
  const counts = countBy(a);
  for (const flavor of b) {
    const remaining = counts.get(flavor);
    if (!remaining) return false;
    counts.set(flavor, remaining - 1);
  }
  return true;
}

function computeMultiplier(errors: OrderValidationError[]): number {
  if (errors.length === 0) return 1;
  // partial credit only for the mildest single mistake (used by lenient levels for feedback)
  if (errors.length === 1 && errors[0] === 'wrong-scoop-order') return 0.5;
  return 0;
}

export const ERROR_LABELS_AR: Record<OrderValidationError, string> = {
  'no-container': 'لا يوجد وعاء!',
  'wrong-container': 'الوعاء غير صحيح',
  'missing-scoop': 'ينقص سكوب',
  'extra-scoop': 'يوجد سكوب زائد',
  'wrong-flavor': 'النكهة غير صحيحة',
  'wrong-scoop-order': 'ترتيب السكوبات غير صحيح',
  'missing-sauce': 'ينقص الصوص',
  'wrong-sauce': 'الصوص غير صحيح',
  'extra-sauce': 'صوص غير مطلوب',
  'missing-topping': 'تنقص إضافة',
  'extra-topping': 'إضافة غير مطلوبة',
};
