import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { toonMat } from './materials';
import type { CustomerMood, CustomerState } from '../gameplay/customers/CustomerTypes';

const WALK_SPEED = 1.9;

/** Path layout: enter from the LEFT along the boardwalk, queue at the window, exit RIGHT. */
export const SPAWN_POINT = new Vector3(-15, 0, 3.1);
export const EXIT_POINT = new Vector3(15, 0, 3.3);

export function queueSlotPosition(index: number): Vector3 {
  if (index === 0) return new Vector3(0, 0, 2.05); // at the serving window
  return new Vector3(-1.0 - (index - 1) * 0.9, 0, 2.9);
}

const MOOD_ICONS: Record<CustomerMood, string> = {
  walking: '',
  waiting: '🕐',
  ordering: '💭',
  happy: '😄',
  angry: '😠',
  sad: '😢',
};

interface PathState {
  points: Vector3[];
  resolve: () => void;
}

class CustomerVisual {
  readonly root: TransformNode;
  private head!: Mesh;
  private body!: Mesh;
  private armL!: TransformNode;
  private armR!: TransformNode;
  private legL!: TransformNode;
  private legR!: TransformNode;
  private parts: Mesh[] = [];
  private moodPlane: Mesh;
  private moodMat: StandardMaterial;
  private moodTex?: DynamicTexture;
  private path?: PathState;
  private walkPhase = 0;
  private idlePhase = Math.random() * Math.PI * 2;
  private celebrating = 0;
  mood: CustomerMood = 'walking';
  customerId = '';

  constructor(private scene: Scene) {
    this.root = new TransformNode('customer', scene);
    this.moodPlane = MeshBuilder.CreatePlane('mood', { width: 0.5, height: 0.5 }, scene);
    this.moodPlane.parent = this.root;
    this.moodPlane.position.y = 2.1;
    this.moodPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    this.moodMat = new StandardMaterial('mood-mat', scene);
    this.moodMat.specularColor = Color3.Black();
    this.moodMat.emissiveColor = new Color3(1, 1, 1);
    this.moodMat.disableLighting = true;
    this.moodMat.backFaceCulling = false;
    this.moodPlane.material = this.moodMat;
    this.moodPlane.isPickable = false;
    this.moodPlane.setEnabled(false);
  }

  build(state: CustomerState): void {
    this.clearParts();
    this.customerId = state.id;
    const a = state.appearance;
    const s = this.scene;
    const add = (m: Mesh, parent: TransformNode = this.root) => {
      m.parent = parent;
      m.isPickable = false;
      this.parts.push(m);
      return m;
    };

    // legs
    this.legL = new TransformNode('legL', s);
    this.legR = new TransformNode('legR', s);
    for (const [node, side] of [[this.legL, -1], [this.legR, 1]] as const) {
      node.parent = this.root;
      node.position.set(side * 0.11, 0.62, 0);
      const leg = add(MeshBuilder.CreateCapsule(`leg${side}`, { radius: 0.07, height: 0.62, tessellation: 8 }, s), node);
      leg.position.y = -0.28;
      leg.material = toonMat(s, a.skin);
      const shoe = add(MeshBuilder.CreateSphere(`shoe${side}`, { diameter: 0.17, segments: 8 }, s), node);
      shoe.scaling.set(1, 0.6, 1.4);
      shoe.position.set(0, -0.58, 0.04);
      shoe.material = toonMat(s, '#ffffff');
    }

    // shorts + torso
    const shorts = add(MeshBuilder.CreateCylinder('shorts', { diameterTop: 0.42, diameterBottom: 0.38, height: 0.28, tessellation: 12 }, s));
    shorts.position.y = 0.72;
    shorts.material = toonMat(s, a.shorts);
    this.body = add(MeshBuilder.CreateCapsule('torso', { radius: 0.21, height: 0.66, tessellation: 10 }, s));
    this.body.position.y = 1.05;
    this.body.material = toonMat(s, a.shirt);

    // arms
    this.armL = new TransformNode('armL', s);
    this.armR = new TransformNode('armR', s);
    for (const [node, side] of [[this.armL, -1], [this.armR, 1]] as const) {
      node.parent = this.root;
      node.position.set(side * 0.25, 1.24, 0);
      const arm = add(MeshBuilder.CreateCapsule(`arm${side}`, { radius: 0.055, height: 0.44, tessellation: 8 }, s), node);
      arm.position.y = -0.18;
      arm.material = toonMat(s, a.shirt);
      const hand = add(MeshBuilder.CreateSphere(`hand${side}`, { diameter: 0.11, segments: 8 }, s), node);
      hand.position.y = -0.42;
      hand.material = toonMat(s, a.skin);
    }

    // head + face
    this.head = add(MeshBuilder.CreateSphere('head', { diameter: 0.42, segments: 14 }, s));
    this.head.position.y = 1.62;
    this.head.material = toonMat(s, a.skin);
    for (const side of [-1, 1]) {
      const eye = add(MeshBuilder.CreateSphere(`eye${side}`, { diameter: 0.045, segments: 6 }, s));
      eye.position.set(side * 0.08, 1.66, 0.185);
      eye.material = toonMat(s, '#2b2b2b');
    }
    const nose = add(MeshBuilder.CreateSphere('nose', { diameter: 0.05, segments: 6 }, s));
    nose.position.set(0, 1.6, 0.2);
    nose.material = toonMat(s, a.skin, { emissiveBoost: 0.1 });

    // hair styles
    const hairMat = toonMat(s, a.hair);
    const cap = add(MeshBuilder.CreateSphere('hair-cap', { diameter: 0.45, segments: 12, slice: 0.55 }, s));
    cap.position.y = 1.7;
    cap.material = hairMat;
    if (a.hairstyle === 1) {
      const bun = add(MeshBuilder.CreateSphere('hair-bun', { diameter: 0.16, segments: 8 }, s));
      bun.position.set(0, 1.9, -0.06);
      bun.material = hairMat;
    } else if (a.hairstyle === 2) {
      for (const side of [-1, 1]) {
        const puff = add(MeshBuilder.CreateSphere(`hair-puff${side}`, { diameter: 0.17, segments: 8 }, s));
        puff.position.set(side * 0.2, 1.62, -0.05);
        puff.material = hairMat;
      }
    } else if (a.hairstyle === 3) {
      const back = add(MeshBuilder.CreateSphere('hair-long', { diameter: 0.34, segments: 8 }, s));
      back.scaling.set(1, 1.5, 0.6);
      back.position.set(0, 1.48, -0.14);
      back.material = hairMat;
    }

    if (a.hat) {
      const brim = add(MeshBuilder.CreateCylinder('hat-brim', { diameter: 0.56, height: 0.03, tessellation: 14 }, s));
      brim.position.y = 1.78;
      brim.material = toonMat(s, a.hat);
      const crown = add(MeshBuilder.CreateCylinder('hat-crown', { diameter: 0.3, height: 0.16, tessellation: 12 }, s));
      crown.position.y = 1.86;
      crown.material = toonMat(s, a.hat);
    }
    if (a.glasses) {
      for (const side of [-1, 1]) {
        const lens = add(MeshBuilder.CreateTorus(`glasses${side}`, { diameter: 0.11, thickness: 0.014, tessellation: 12 }, s));
        lens.position.set(side * 0.08, 1.66, 0.2);
        lens.rotation.x = Math.PI / 2;
        lens.material = toonMat(s, '#3a3a52');
      }
      const bridge = add(MeshBuilder.CreateBox('glasses-bridge', { width: 0.06, height: 0.012, depth: 0.012 }, s));
      bridge.position.set(0, 1.66, 0.2);
      bridge.material = toonMat(s, '#3a3a52');
    }

    this.root.scaling.setAll(a.scale);
    this.moodPlane.position.y = 2.15;
    this.setMood('walking');
  }

  private clearParts(): void {
    for (const p of this.parts) p.dispose();
    this.parts = [];
    this.armL?.dispose();
    this.armR?.dispose();
    this.legL?.dispose();
    this.legR?.dispose();
  }

  setMood(mood: CustomerMood): void {
    this.mood = mood;
    const icon = MOOD_ICONS[mood];
    if (!icon) {
      this.moodPlane.setEnabled(false);
      return;
    }
    this.moodPlane.setEnabled(true);
    this.moodTex?.dispose();
    this.moodTex = new DynamicTexture(`mood-tex-${mood}`, { width: 96, height: 96 }, this.scene, true);
    this.moodTex.hasAlpha = true;
    const ctx = this.moodTex.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 96, 96);
    ctx.font = '64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 48, 52);
    this.moodTex.update();
    this.moodMat.diffuseTexture = this.moodTex;
    this.moodMat.opacityTexture = this.moodTex;
    if (mood === 'happy') this.celebrating = 1.2;
  }

  walkTo(points: Vector3[]): Promise<void> {
    return new Promise((resolve) => {
      this.path = { points: [...points], resolve };
    });
  }

  get isWalking(): boolean {
    return !!this.path;
  }

  update(dt: number): void {
    if (this.path) {
      const target = this.path.points[0];
      const pos = this.root.position;
      const delta = target.subtract(pos);
      delta.y = 0;
      const dist = delta.length();
      if (dist < 0.06) {
        this.path.points.shift();
        if (this.path.points.length === 0) {
          const done = this.path.resolve;
          this.path = undefined;
          this.walkPhase = 0;
          done();
        }
      } else {
        const dir = delta.normalize();
        pos.addInPlace(dir.scale(Math.min(dist, WALK_SPEED * dt)));
        // rotate smoothly toward movement direction
        const targetYaw = Math.atan2(dir.x, dir.z);
        this.root.rotation.y = lerpAngle(this.root.rotation.y, targetYaw, Math.min(1, dt * 10));
        // walk cycle: bob + limb swing
        this.walkPhase += dt * 9;
        this.root.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.045;
        const swing = Math.sin(this.walkPhase) * 0.55;
        this.armL.rotation.x = swing;
        this.armR.rotation.x = -swing;
        this.legL.rotation.x = -swing * 0.8;
        this.legR.rotation.x = swing * 0.8;
      }
    } else {
      // idle: face the cart when queued, subtle breathing sway
      this.idlePhase += dt * 2;
      this.root.position.y = 0;
      const targetYaw = Math.PI; // face -Z (toward the cart window)
      this.root.rotation.y = lerpAngle(this.root.rotation.y, targetYaw, Math.min(1, dt * 4));
      this.body.scaling.y = 1 + Math.sin(this.idlePhase) * 0.015;
      this.legL.rotation.x = 0;
      this.legR.rotation.x = 0;
      if (this.celebrating > 0) {
        this.celebrating -= dt;
        // raise arms and hop with joy
        this.armL.rotation.x = -2.6;
        this.armR.rotation.x = -2.6;
        this.root.position.y = Math.abs(Math.sin(this.celebrating * 12)) * 0.12;
      } else if (this.mood === 'angry' || this.mood === 'sad') {
        this.armL.rotation.x = 0.35;
        this.armR.rotation.x = 0.35;
      } else {
        this.armL.rotation.x = Math.sin(this.idlePhase) * 0.06;
        this.armR.rotation.x = -Math.sin(this.idlePhase) * 0.06;
      }
    }
  }

  reset(): void {
    this.path?.resolve();
    this.path = undefined;
    this.celebrating = 0;
    this.setMood('walking');
    this.root.setEnabled(false);
  }

  dispose(): void {
    this.clearParts();
    this.moodTex?.dispose();
    this.moodMat.dispose();
    this.moodPlane.dispose();
    this.root.dispose(false, true);
  }
}

function lerpAngle(from: number, to: number, t: number): number {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * t;
}

/**
 * Manages pooled customer visuals: spawning, queue movement, moods and exits.
 * Notifies the session when the front customer physically reaches the window.
 */
export class CustomerRenderer {
  private pool: CustomerVisual[] = [];
  private active = new Map<string, CustomerVisual>();
  private departing: Array<{ visual: CustomerVisual; delay: number; started: boolean }> = [];

  constructor(
    private scene: Scene,
    private onArrivedAtWindow: (customerId: string) => void
  ) {}

  private acquire(): CustomerVisual {
    const visual = this.pool.pop() ?? new CustomerVisual(this.scene);
    visual.root.setEnabled(true);
    return visual;
  }

  spawn(customer: CustomerState): void {
    const visual = this.acquire();
    visual.build(customer);
    visual.root.position.copyFrom(SPAWN_POINT);
    visual.root.rotation.y = Math.PI / 2;
    this.active.set(customer.id, visual);
    const slot = queueSlotPosition(customer.queueIndex);
    const entry = customer.queueIndex === 0
      ? [new Vector3(-2.6, 0, 3.0), slot]
      : [new Vector3(slot.x - 1.2, 0, 3.05), slot];
    visual.walkTo(entry).then(() => {
      visual.setMood(customer.queueIndex === 0 ? 'ordering' : 'waiting');
      if (customer.queueIndex === 0) this.onArrivedAtWindow(customer.id);
    });
  }

  advance(customer: CustomerState): void {
    const visual = this.active.get(customer.id);
    if (!visual) return;
    const slot = queueSlotPosition(customer.queueIndex);
    visual.walkTo([slot]).then(() => {
      visual.setMood(customer.queueIndex === 0 ? 'ordering' : 'waiting');
      if (customer.queueIndex === 0) this.onArrivedAtWindow(customer.id);
    });
  }

  setMood(customerId: string, mood: CustomerState['mood']): void {
    this.active.get(customerId)?.setMood(mood);
  }

  positionOf(customerId: string): Vector3 | undefined {
    return this.active.get(customerId)?.root.position.clone();
  }

  /** walk to the right-side exit, then release back to the pool */
  depart(customer: CustomerState, reason: 'served' | 'angry'): void {
    const visual = this.active.get(customer.id);
    if (!visual) return;
    this.active.delete(customer.id);
    visual.setMood(reason === 'served' ? 'happy' : 'angry');
    // happy customers briefly celebrate before leaving
    this.departing.push({ visual, delay: reason === 'served' ? 0.7 : 0.15, started: false });
  }

  update(dt: number): void {
    for (const visual of this.active.values()) visual.update(dt);
    for (const entry of [...this.departing]) {
      entry.delay -= dt;
      if (entry.delay <= 0 && !entry.started) {
        entry.started = true;
        entry.visual.walkTo([new Vector3(2.6, 0, 3.1), EXIT_POINT]).then(() => {
          entry.visual.reset();
          this.pool.push(entry.visual);
          this.departing = this.departing.filter((d) => d !== entry);
        });
      }
      entry.visual.update(dt);
    }
  }

  clear(): void {
    for (const visual of this.active.values()) {
      visual.reset();
      this.pool.push(visual);
    }
    for (const entry of this.departing) {
      entry.visual.reset();
      this.pool.push(entry.visual);
    }
    this.active.clear();
    this.departing = [];
  }

  dispose(): void {
    this.clear();
    for (const visual of this.pool) visual.dispose();
    this.pool = [];
  }
}
