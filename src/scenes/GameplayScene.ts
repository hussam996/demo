import {
  AbstractEngine,
  Animation,
  Camera,
  Color3,
  Color4,
  CubicEase,
  EasingFunction,
  FreeCamera,
  MeshBuilder,
  PointerEventTypes,
  Scene,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { toonMat } from '../rendering/materials';
import { buildCart, type CartHandles, type PickAction } from '../rendering/CartBuilder';
import { buildEnvironment, type EnvironmentHandles } from '../rendering/EnvironmentBuilder';
import { CustomerRenderer } from '../rendering/CustomerRenderer';
import { IceCreamVisual } from '../rendering/IceCreamRenderer';
import { EffectsManager } from '../rendering/EffectsManager';
import { LevelSession } from '../gameplay/LevelSession';
import type { AudioManager } from '../core/AudioManager';
import type { QualityLevel } from '../core/SaveManager';
import { FLAVORS } from '../data/flavors';

const FPS = 60;

function animateNode(
  node: TransformNode,
  to: Vector3,
  durationSec: number
): Promise<void> {
  return new Promise((resolve) => {
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    const ok = Animation.CreateAndStartAnimation(
      `move-${node.name}`, node, 'position', FPS,
      Math.max(1, Math.round(durationSec * FPS)),
      node.position.clone(), to, Animation.ANIMATIONLOOPMODE_CONSTANT, ease,
      () => resolve()
    );
    if (!ok) resolve();
  });
}

/**
 * Owns the Babylon scene for one level run: builds the world, translates
 * pointer picks into session actions, and mirrors session events visually.
 */
export class GameplayScene {
  readonly scene: Scene;
  private camera!: FreeCamera;
  private cart!: CartHandles;
  private environment!: EnvironmentHandles;
  private customers!: CustomerRenderer;
  private effects!: EffectsManager;
  private product?: IceCreamVisual;
  private elapsed = 0;
  private toolBusy = false;
  private unsubscribers: Array<() => void> = [];

  constructor(
    private engine: AbstractEngine,
    private session: LevelSession,
    private audio: AudioManager,
    quality: QualityLevel
  ) {
    this.scene = new Scene(engine);
    this.scene.clearColor = new Color4(0.49, 0.78, 0.89, 1);
    this.setupCamera();
    this.environment = buildEnvironment(this.scene);
    this.cart = buildCart(this.scene);
    this.cart.applyLevel(session.level);
    this.effects = new EffectsManager(this.scene);
    this.customers = new CustomerRenderer(this.scene, (id) => {
      this.session.notifyCustomerArrived(id);
    });

    // cart + customers cast shadows when quality allows
    const sg = this.environment.shadowGenerator;
    if (sg) {
      for (const mesh of this.cart.root.getChildMeshes()) sg.addShadowCaster(mesh);
    }

    this.setQuality(quality);
    this.wireSessionEvents();
    this.wirePointer();

    this.scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.1, this.engine.getDeltaTime() / 1000);
      this.elapsed += dt;
      this.session.tick(dt);
      this.environment.update(this.elapsed);
      this.customers.update(dt);
    });
  }

  private setupCamera(): void {
    this.camera = new FreeCamera('vendor-cam', new Vector3(0, 2.35, -3.0), this.scene);
    this.camera.setTarget(new Vector3(0, 1.05, 1.8));
    this.camera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;
    this.camera.fov = 1.28;
    this.camera.minZ = 0.1;
    this.camera.inputs.clear(); // fixed vendor viewpoint — no free camera
    this.updateCameraForAspect();
  }

  /** keeps every interactive element on screen across desktop/tablet/portrait phone */
  updateCameraForAspect(): void {
    const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
    if (aspect < 0.8) {
      // portrait phone: step back and widen slightly
      this.camera.position.set(0, 2.95, -3.85);
      this.camera.fov = 1.38;
      this.camera.setTarget(new Vector3(0, 1.2, 1.9));
    } else if (aspect < 1.3) {
      // tablet-ish
      this.camera.position.set(0, 2.7, -3.35);
      this.camera.fov = 1.32;
      this.camera.setTarget(new Vector3(0, 1.05, 1.9));
    } else {
      this.camera.position.set(0, 2.55, -3.05);
      this.camera.fov = 1.28;
      this.camera.setTarget(new Vector3(0, 0.95, 1.9));
    }
  }

  setQuality(quality: QualityLevel): void {
    this.environment.setQuality(quality);
    this.effects.setQuality(quality);
    const scaling = quality === 'low' ? 1.5 : quality === 'medium' ? 1.0 : Math.min(1, 1 / (window.devicePixelRatio || 1)) ;
    this.engine.setHardwareScalingLevel(quality === 'high' ? Math.max(0.5, scaling) : scaling);
  }

  private wirePointer(): void {
    const observer = this.scene.onPointerObservable.add((info) => {
      if (info.type !== PointerEventTypes.POINTERTAP) return;
      const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (m) => !!m.metadata?.pickAction && m.isPickable && m.isEnabled());
      const action = pick?.pickedMesh?.metadata?.pickAction as PickAction | undefined;
      if (!action) return;
      void this.handleAction(action);
    });
    this.unsubscribers.push(() => this.scene.onPointerObservable.remove(observer));
  }

  private async handleAction(action: PickAction): Promise<void> {
    if (this.toolBusy) return;
    this.audio.unlock();
    switch (action.type) {
      case 'container':
        this.session.placeContainer(action.id);
        break;
      case 'flavor':
        await this.performScoopSequence(action.id);
        break;
      case 'sauce':
        if (this.session.addSauce(action.id)) this.audio.sauce();
        break;
      case 'topping':
        this.session.addTopping(action.id);
        break;
      case 'bell': {
        this.effects.ringBell(this.cart.bell);
        this.audio.bell();
        // keep the product visual alive across deliver()'s prep-changed event
        this.deliveryInFlight = true;
        if (!this.session.deliver()) this.deliveryInFlight = false;
        break;
      }
      case 'bin':
        this.session.clearPreparation();
        this.audio.click();
        break;
    }
  }

  /** the ladle flies to the tub, digs a scoop, carries it to the bowl */
  private async performScoopSequence(flavor: Parameters<LevelSession['addScoop']>[0]): Promise<void> {
    // validate first without visuals: dry-run the guards
    if (!this.session.canInteract) return;
    if (!this.session.prep.hasContainer || this.session.prep.current.scoops.length >= this.session.prep.maxScoopsForCurrent) {
      // let the session emit the proper rejection event for UI feedback
      this.session.addScoop(flavor);
      return;
    }
    if (!this.session.level.allowedFlavors.includes(flavor)) return;

    this.toolBusy = true;
    const tool = this.cart.scoopTool;
    const tubPos = this.cart.tubPositions.get(flavor)!;
    try {
      this.audio.scoop();
      await animateNode(tool, tubPos.add(new Vector3(0, 0.18, 0)), 0.22);
      await animateNode(tool, tubPos.add(new Vector3(0, 0.02, 0)), 0.1);
      // pick up a colored ball in the ladle
      const ballHolder = new TransformNode('held-scoop', this.scene);
      ballHolder.parent = tool;
      const ball = MeshBuilder.CreateSphere('held-ball', { diameter: 0.13, segments: 10 }, this.scene);
      ball.parent = ballHolder;
      ball.position.y = 0.03;
      ball.material = toonMat(this.scene, FLAVORS[flavor].color);
      ball.isPickable = false;

      await animateNode(tool, tubPos.add(new Vector3(0, 0.22, 0)), 0.12);
      await animateNode(tool, this.cart.prepAnchor.add(new Vector3(0, 0.55, 0)), 0.24);
      ballHolder.dispose(false, true);

      const accepted = this.session.addScoop(flavor);
      if (accepted) {
        this.audio.plop();
        const def = FLAVORS[flavor];
        const c = Color3.FromHexString(def.color);
        this.effects.scoopPuff(
          this.cart.prepAnchor.add(new Vector3(0, 0.15, 0)),
          new Color4(c.r, c.g, c.b, 1)
        );
      }
      await animateNode(tool, this.cart.scoopRestPosition, 0.25);
    } finally {
      this.toolBusy = false;
    }
  }

  private wireSessionEvents(): void {
    const ev = this.session.events;
    const subs = [
      ev.on('customer-spawned', (c) => this.customers.spawn(c)),
      ev.on('customer-advanced', (c) => this.customers.advance(c)),
      ev.on('order-presented', (c) => this.customers.setMood(c.id, 'ordering')),
      ev.on('container-placed', (container) => {
        this.audio.click();
        this.product?.dispose();
        this.product = new IceCreamVisual(this.scene, this.cart.prepAnchor);
        void this.product.setContainer(container);
      }),
      ev.on('scoop-added', ({ flavor }) => {
        void this.product?.addScoop(flavor);
      }),
      ev.on('sauce-added', (sauce) => this.product?.addSauce(sauce)),
      ev.on('topping-added', (topping) => {
        this.audio.click();
        this.product?.addTopping(topping);
      }),
      ev.on('prep-changed', (prep) => {
        if (!prep.containerType && this.product && !this.deliveryInFlight) {
          // station cleared (bin or angry customer)
          this.product.dispose();
          this.product = undefined;
        }
      }),
      ev.on('delivery-result', ({ customer, validation, reward }) => {
        const customerPos = this.customers.positionOf(customer.id) ?? new Vector3(0, 0, 2);
        const product = this.product;
        this.product = undefined;
        if (product && reward) {
          // accepted: slide the ice cream over the window ledge to the customer
          void product.deliverTo(this.cart.deliveryAnchor, customerPos).then(() => {
            product.dispose();
            this.deliveryInFlight = false;
          });
        } else {
          // rejected (customer waits or leaves): the attempt is discarded
          product?.dispose();
          this.deliveryInFlight = false;
        }
        if (validation.isCorrect || (reward && reward.score > 0)) {
          this.audio.success();
          if (reward) this.audio.coins();
          this.customers.setMood(customer.id, 'happy');
          this.effects.celebrationBurst(customerPos.add(new Vector3(0, 1.6, 0)));
        } else {
          this.audio.error();
          this.customers.setMood(customer.id, customer.mood);
          this.effects.angerCloud(customerPos.add(new Vector3(0, 1.5, 0)));
        }
      }),
      ev.on('customer-left', ({ customer, reason }) => {
        if (reason === 'angry') this.audio.angry();
        this.customers.depart(customer, reason);
        if (reason === 'angry' && this.product) {
          this.product.dispose();
          this.product = undefined;
        }
      }),
    ];
    this.unsubscribers.push(...subs);
  }

  private deliveryInFlight = false;

  render(): void {
    this.scene.render();
  }

  dispose(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    this.product?.dispose();
    this.customers.dispose();
    this.effects.dispose();
    this.environment.dispose();
    this.cart.dispose();
    this.scene.dispose();
  }
}
