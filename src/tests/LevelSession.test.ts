import { describe, expect, it } from 'vitest';
import { LevelSession } from '../gameplay/LevelSession';
import { GameplayState } from '../gameplay/GameplayState';
import { getLevelConfig } from '../gameplay/levels/levelConfigs';
import { Rng } from '../core/Rng';
import type { CustomerState } from '../gameplay/customers/CustomerTypes';

function startSessionWithActiveCustomer(levelId = 1, seed = 5) {
  const session = new LevelSession(getLevelConfig(levelId)!, new Rng(seed));
  session.start();
  // tick until the first customer spawns, then simulate arrival at the window
  let spawned: CustomerState | undefined;
  session.events.on('customer-spawned', (c) => (spawned = spawned ?? c));
  for (let i = 0; i < 20 && !spawned; i++) session.tick(0.5);
  expect(spawned).toBeDefined();
  session.notifyCustomerArrived(spawned!.id);
  return { session, customer: spawned! };
}

describe('LevelSession state machine', () => {
  it('starts waiting, presents the order on arrival, then allows preparing', () => {
    const session = new LevelSession(getLevelConfig(1)!, new Rng(1));
    session.start();
    expect(session.state).toBe(GameplayState.WaitingForCustomer);
    const { session: s2 } = startSessionWithActiveCustomer();
    expect(s2.state).toBe(GameplayState.PreparingOrder);
    s2.dispose();
    session.dispose();
  });

  it('blocks adding ingredients before a container is placed', () => {
    const { session } = startSessionWithActiveCustomer();
    const rejections: string[] = [];
    session.events.on('prep-rejected', (r) => rejections.push(r));
    expect(session.addScoop('vanilla')).toBe(false);
    expect(rejections).toContain('no-container');
    session.dispose();
  });

  it('blocks interaction before any customer arrives', () => {
    const session = new LevelSession(getLevelConfig(1)!, new Rng(1));
    session.start();
    expect(session.placeContainer('cup-small')).toBe(false);
    session.dispose();
  });

  it('enforces the scoop cap for the level/container', () => {
    const { session } = startSessionWithActiveCustomer(1);
    session.placeContainer('cup-small'); // capacity 1, level 1 max 1
    expect(session.addScoop('vanilla')).toBe(true);
    expect(session.addScoop('chocolate')).toBe(false);
    session.dispose();
  });

  it('rejects locked ingredients for the level', () => {
    const { session } = startSessionWithActiveCustomer(1);
    expect(session.placeContainer('cup-large')).toBe(false); // locked until level 7
    session.placeContainer('cup-small');
    session.addScoop('vanilla');
    expect(session.addSauce('caramel')).toBe(false); // no sauces on level 1
    expect(session.addTopping('sprinkles')).toBe(false); // no toppings on level 1
    session.dispose();
  });

  it('cannot deliver with an empty prep station', () => {
    const { session } = startSessionWithActiveCustomer();
    expect(session.deliver()).toBe(false);
    session.dispose();
  });

  it('delivers a correct order, scores it and the customer departs happy', () => {
    const { session, customer } = startSessionWithActiveCustomer();
    const order = customer.order;
    session.placeContainer(order.containerType);
    for (const scoop of order.scoops) session.addScoop(scoop.flavor);

    let delivery: { customer: CustomerState } & Record<string, unknown> = {} as never;
    session.events.on('delivery-result', (d) => (delivery = d));
    expect(session.deliver()).toBe(true);
    expect((delivery.validation as { isCorrect: boolean }).isCorrect).toBe(true);
    expect(session.score.score).toBeGreaterThan(0);
    expect(session.score.coins).toBeGreaterThan(0);
    expect(session.queue.all.find((c) => c.id === customer.id)).toBeUndefined();
    expect(session.state).toBe(GameplayState.WaitingForCustomer);
    session.dispose();
  });

  it('wrong delivery on a lenient level lets the customer wait for a retry', () => {
    const { session, customer } = startSessionWithActiveCustomer(1);
    session.placeContainer(customer.order.containerType);
    const wrong = customer.order.scoops[0].flavor === 'vanilla' ? 'chocolate' : 'vanilla';
    session.addScoop(wrong);
    let canRetry = false;
    session.events.on('delivery-result', (d) => (canRetry = d.canRetry));
    session.deliver();
    expect(canRetry).toBe(true);
    expect(session.state).toBe(GameplayState.PreparingOrder);
    expect(session.queue.all.find((c) => c.id === customer.id)).toBeDefined();
    expect(session.score.mistakes).toBe(1);
    session.dispose();
  });

  it('customer leaves angry when patience runs out and the streak breaks', () => {
    const { session, customer } = startSessionWithActiveCustomer();
    session.score.combo.registerSuccess();
    session.score.combo.registerSuccess();
    let left: { customer: CustomerState; reason: string } | undefined;
    session.events.on('customer-left', (e) => (left = left ?? e));
    for (let i = 0; i < 500 && !left; i++) session.tick(1);
    expect(left?.customer.id).toBe(customer.id);
    expect(left?.reason).toBe('angry');
    expect(session.score.lostCustomers).toBe(1);
    expect(session.score.combo.streak).toBe(0);
    session.dispose();
  });

  it('pause freezes the clock and resume restores the previous state', () => {
    const { session } = startSessionWithActiveCustomer();
    const stateBefore = session.state;
    const remainingBefore = session.clock.remainingSeconds;
    session.pause();
    expect(session.state).toBe(GameplayState.LevelPaused);
    expect(session.placeContainer('cup-small')).toBe(false);
    session.tick(10);
    expect(session.clock.remainingSeconds).toBe(remainingBefore);
    session.resume();
    expect(session.state).toBe(stateBefore);
    session.dispose();
  });

  it('finishes the level when the clock expires and reports goals', () => {
    const session = new LevelSession(getLevelConfig(1)!, new Rng(2));
    session.start();
    let finished: { result: { success: boolean } } | undefined;
    session.events.on('level-finished', (e) => (finished = e));
    for (let i = 0; i < 400 && !finished; i++) session.tick(1);
    expect(finished).toBeDefined();
    expect(session.isFinished).toBe(true);
    expect([GameplayState.LevelCompleted, GameplayState.LevelFailed]).toContain(session.state);
    session.dispose();
  });

  it('combo multiplier climbs with consecutive successes up to x5', () => {
    const { session } = startSessionWithActiveCustomer();
    const combo = session.score.combo;
    expect(combo.multiplier).toBe(1);
    for (let i = 0; i < 8; i++) combo.registerSuccess();
    expect(combo.multiplier).toBe(5);
    combo.registerFailure();
    expect(combo.multiplier).toBe(1);
    expect(combo.bestMultiplier).toBe(5);
    session.dispose();
  });
});
