import { EventBus } from '../core/EventBus';
import { GameClock } from '../core/GameClock';
import { Rng } from '../core/Rng';
import { GameplayState } from './GameplayState';
import { CustomerQueue } from './customers/CustomerQueue';
import { createCustomer } from './customers/CustomerFactory';
import type { CustomerState } from './customers/CustomerTypes';
import { PreparationStation, type PrepRejectionReason } from './preparation/PreparationStation';
import { ScoreManager, type DeliveryScore } from './scoring/ScoreManager';
import { validateOrder } from './orders/OrderValidator';
import type {
  ContainerType,
  FlavorType,
  OrderValidationResult,
  PreparedIceCream,
  SauceType,
  ToppingType,
} from './orders/OrderTypes';
import type { LevelConfig, LevelResult } from './levels/LevelTypes';
import { buildLevelResult, evaluateGoals, type GoalProgress } from './levels/LevelManager';
import { CUSTOMER_TYPES } from '../data/customers';

export interface SessionEvents extends Record<string, unknown> {
  'state-changed': { previous: GameplayState; current: GameplayState };
  'customer-spawned': CustomerState;
  'customer-advanced': CustomerState;
  'order-presented': CustomerState;
  'patience-updated': CustomerState;
  'customer-left': { customer: CustomerState; reason: 'angry' | 'served' };
  'prep-changed': Readonly<PreparedIceCream>;
  'prep-rejected': PrepRejectionReason;
  'scoop-added': { flavor: FlavorType; index: number };
  'container-placed': ContainerType;
  'sauce-added': SauceType;
  'topping-added': ToppingType;
  'delivery-result': {
    customer: CustomerState;
    validation: OrderValidationResult;
    reward?: DeliveryScore;
    canRetry: boolean;
  };
  'score-updated': { score: number; coins: number; combo: number };
  'time-updated': { remaining: number; total: number };
  'level-finished': { result: LevelResult; goals: GoalProgress[] };
}

/**
 * Runs one level end-to-end: spawning, queueing, orders, patience,
 * preparation guards, delivery validation, scoring and completion.
 * Pure logic — rendering/UI subscribe through the event bus and call
 * the notify* hooks when their animations finish.
 */
export class LevelSession {
  readonly events = new EventBus<SessionEvents>();
  readonly prep = new PreparationStation();
  readonly score = new ScoreManager();
  readonly clock = new GameClock();
  readonly queue = new CustomerQueue();

  private currentState: GameplayState = GameplayState.Loading;
  private stateBeforePause: GameplayState = GameplayState.WaitingForCustomer;
  private spawnTimer = 0;
  private finished = false;
  /** customers that physically reached the window (survives pause/busy states) */
  private arrivedAtWindow = new Set<string>();

  constructor(
    readonly level: LevelConfig,
    private rng: Rng = new Rng()
  ) {
    this.prep.setLevelMaxScoops(level.maxScoops);
  }

  get state(): GameplayState {
    return this.currentState;
  }

  get activeCustomer(): CustomerState | undefined {
    const front = this.queue.front;
    return front?.orderPresented ? front : undefined;
  }

  start(): void {
    this.score.reset();
    this.clock.start(this.level.durationSeconds);
    this.spawnTimer = 0.5; // first customer arrives almost immediately
    this.setState(GameplayState.WaitingForCustomer);
  }

  private setState(next: GameplayState): void {
    if (this.currentState === next) return;
    const previous = this.currentState;
    this.currentState = next;
    this.events.emit('state-changed', { previous, current: next });
  }

  get canInteract(): boolean {
    return this.currentState === GameplayState.PreparingOrder;
  }

  /** advance simulation; dt in seconds */
  tick(dt: number): void {
    if (
      this.finished ||
      this.currentState === GameplayState.LevelPaused ||
      this.currentState === GameplayState.Loading
    ) {
      return;
    }

    const expired = this.clock.tick(dt);
    this.events.emit('time-updated', {
      remaining: this.clock.remainingSeconds,
      total: this.level.durationSeconds,
    });
    if (expired) {
      this.finishLevel();
      return;
    }

    // spawn customers while there is room in the queue
    if (this.queue.length < this.level.queueSize) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.level.customerSpawnDelaySeconds;
        const customer = createCustomer(this.level, this.rng, this.queue.length);
        this.queue.enqueue(customer);
        this.events.emit('customer-spawned', customer);
      }
    }

    // patience only drains once the order has been presented
    const active = this.activeCustomer;
    if (
      active &&
      (this.currentState === GameplayState.PreparingOrder ||
        this.currentState === GameplayState.TakingOrder)
    ) {
      active.patienceRemaining = Math.max(0, active.patienceRemaining - dt);
      this.events.emit('patience-updated', active);
      if (active.patienceRemaining === 0) {
        this.customerLeavesAngry(active);
      }
    }

    // an arrival may have been deferred (pause, busy window) — retry every tick
    this.tryPresentOrder();
  }

  /** renderer callback: front customer finished walking to the window */
  notifyCustomerArrived(id: string): void {
    if (this.finished) return;
    this.arrivedAtWindow.add(id);
    this.tryPresentOrder();
  }

  /** presents the front customer's order once they have arrived and the window is free */
  private tryPresentOrder(): void {
    const front = this.queue.front;
    if (!front || front.orderPresented || this.finished) return;
    if (!this.arrivedAtWindow.has(front.id)) return;
    if (
      this.currentState !== GameplayState.WaitingForCustomer &&
      this.currentState !== GameplayState.CustomerReaction
    ) {
      // window busy or paused; retried from tick()/resume()
      return;
    }
    front.orderPresented = true;
    front.mood = 'ordering';
    this.setState(GameplayState.TakingOrder);
    this.events.emit('order-presented', front);
    this.setState(GameplayState.PreparingOrder);
  }

  // ---- player actions (guarded by state) ----

  placeContainer(container: ContainerType): boolean {
    if (!this.guardInteract()) return false;
    if (!this.level.allowedContainers.includes(container)) return false;
    const result = this.prep.placeContainer(container);
    if (!result.ok) {
      this.events.emit('prep-rejected', result.reason!);
      return false;
    }
    this.events.emit('container-placed', container);
    this.events.emit('prep-changed', this.prep.current);
    return true;
  }

  addScoop(flavor: FlavorType): boolean {
    if (!this.guardInteract()) return false;
    if (!this.level.allowedFlavors.includes(flavor)) return false;
    const result = this.prep.addScoop(flavor);
    if (!result.ok) {
      this.events.emit('prep-rejected', result.reason!);
      return false;
    }
    this.events.emit('scoop-added', { flavor, index: this.prep.current.scoops.length - 1 });
    this.events.emit('prep-changed', this.prep.current);
    return true;
  }

  addSauce(sauce: SauceType): boolean {
    if (!this.guardInteract()) return false;
    if (!this.level.allowedSauces.includes(sauce)) return false;
    const result = this.prep.addSauce(sauce);
    if (!result.ok) {
      this.events.emit('prep-rejected', result.reason!);
      return false;
    }
    this.events.emit('sauce-added', sauce);
    this.events.emit('prep-changed', this.prep.current);
    return true;
  }

  addTopping(topping: ToppingType): boolean {
    if (!this.guardInteract()) return false;
    if (!this.level.allowedToppings.includes(topping)) return false;
    const result = this.prep.addTopping(topping);
    if (!result.ok) {
      this.events.emit('prep-rejected', result.reason!);
      return false;
    }
    this.events.emit('topping-added', topping);
    this.events.emit('prep-changed', this.prep.current);
    return true;
  }

  clearPreparation(): void {
    if (!this.guardInteract()) return;
    this.prep.clear();
    this.events.emit('prep-changed', this.prep.current);
  }

  private guardInteract(): boolean {
    return this.canInteract && !this.finished;
  }

  /** player rings the bell */
  deliver(): boolean {
    if (this.currentState !== GameplayState.PreparingOrder || this.finished) return false;
    const customer = this.activeCustomer;
    if (!customer) return false;
    if (this.prep.isEmpty) {
      this.events.emit('prep-rejected', 'no-container');
      return false;
    }

    this.setState(GameplayState.DeliveringOrder);
    const prepared = this.prep.take();
    this.events.emit('prep-changed', this.prep.current);

    this.setState(GameplayState.ValidatingOrder);
    const validation = validateOrder(customer.order, prepared, {
      requireScoopOrder: this.level.requireScoopOrder,
      extraIngredientsAllowed: this.level.extraIngredientsAllowed,
    });

    const isVip = customer.kind === 'vip';
    const accepted = isVip ? validation.isCorrect : validation.scoreMultiplier > 0;

    if (accepted) {
      const patienceRatio =
        customer.patienceTotal > 0 ? customer.patienceRemaining / customer.patienceTotal : 0;
      const reward = this.score.applyDelivery(
        customer.order,
        validation,
        patienceRatio,
        CUSTOMER_TYPES[customer.kind]
      );
      customer.mood = 'happy';
      this.setState(GameplayState.CustomerReaction);
      this.events.emit('delivery-result', { customer, validation, reward, canRetry: false });
      this.emitScore();
      this.customerDeparts(customer, 'served');
    } else {
      const canRetry = this.level.allowRetryOnMistake && customer.patienceRemaining > 0;
      this.score.applyMistake();
      this.emitScore();
      customer.mood = canRetry ? 'sad' : 'angry';
      this.events.emit('delivery-result', { customer, validation, reward: undefined, canRetry });
      if (canRetry) {
        // customer waits; player rebuilds the order
        this.setState(GameplayState.PreparingOrder);
      } else {
        this.setState(GameplayState.CustomerReaction);
        this.customerDeparts(customer, 'angry');
      }
    }
    return true;
  }

  private customerLeavesAngry(customer: CustomerState): void {
    customer.mood = 'angry';
    this.score.applyLostCustomer();
    this.emitScore();
    this.prep.clear();
    this.events.emit('prep-changed', this.prep.current);
    this.customerDeparts(customer, 'angry');
  }

  private customerDeparts(customer: CustomerState, reason: 'served' | 'angry'): void {
    this.arrivedAtWindow.delete(customer.id);
    this.queue.remove(customer.id);
    this.events.emit('customer-left', { customer, reason });
    for (const c of this.queue.all) this.events.emit('customer-advanced', c);
    this.setState(GameplayState.WaitingForCustomer);
  }

  pause(): void {
    if (
      this.finished ||
      this.currentState === GameplayState.LevelPaused ||
      this.currentState === GameplayState.Loading
    ) {
      return;
    }
    this.stateBeforePause = this.currentState;
    this.clock.pause();
    this.setState(GameplayState.LevelPaused);
  }

  resume(): void {
    if (this.currentState !== GameplayState.LevelPaused) return;
    this.clock.resume();
    this.setState(this.stateBeforePause);
    // a customer may have arrived while paused
    this.tryPresentOrder();
  }

  abort(): void {
    this.finished = true;
    this.clock.stop();
  }

  private emitScore(): void {
    this.events.emit('score-updated', {
      score: this.score.score,
      coins: this.score.coins,
      combo: this.score.combo.multiplier,
    });
  }

  private finishLevel(): void {
    if (this.finished) return;
    this.finished = true;
    this.clock.stop();

    const goals = evaluateGoals(this.level, this.score);
    const success = goals.every((g) => g.achieved);
    if (success) this.score.applyLevelClearBonus();

    const result = buildLevelResult(this.level, this.score, success);
    this.setState(success ? GameplayState.LevelCompleted : GameplayState.LevelFailed);
    this.events.emit('level-finished', { result, goals: evaluateGoals(this.level, this.score) });
  }

  get isFinished(): boolean {
    return this.finished;
  }

  dispose(): void {
    this.abort();
    this.events.clear();
    this.queue.clear();
    this.prep.clear();
  }
}
