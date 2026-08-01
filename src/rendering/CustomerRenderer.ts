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
import { outline } from './toon';
import { instantiate, loadModel, type ModelInstance, type ModelTemplate } from './ModelLoader';
import { CHARACTER_MODELS, CHARACTER_SCALE, CHARACTER_TARGET_HEIGHT } from './assets';
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
  private mouth?: Mesh;
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
  /** set when a rigged CC0 character model is used instead of procedural parts */
  private model?: ModelInstance;
  private currentClip = '';
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

  build(state: CustomerState, template?: ModelTemplate): void {
    this.clearParts();
    this.customerId = state.id;
    if (template) {
      this.buildFromModel(state, template);
      return;
    }
    this.buildProcedural(state);
  }

  /** rigged cartoon character (Kenney CC0) with its own skeleton + clips */
  private buildFromModel(state: CustomerState, template: ModelTemplate): void {
    const instance = instantiate(template, `customer-${state.id}`);
    instance.root.parent = this.root;
    this.model = instance;
    const scale = CHARACTER_SCALE * state.appearance.scale;
    instance.root.scaling.setAll(scale);
    this.root.scaling.setAll(1);
    this.moodPlane.position.y = CHARACTER_TARGET_HEIGHT * state.appearance.scale + 0.45;
    this.playClip('idle');
    this.setMood('walking');
  }

  private playClip(name: string, loop = true): void {
    if (!this.model || this.currentClip === name) return;
    const next = this.model.animations.get(name);
    if (!next) return;
    this.model.animations.get(this.currentClip)?.stop();
    next.start(loop, 1);
    this.currentClip = name;
  }

  private buildProcedural(state: CustomerState): void {
    const a = state.appearance;
    const s = this.scene;
    const add = (m: Mesh, parent: TransformNode = this.root, outlineWidth = 0.018) => {
      m.parent = parent;
      m.isPickable = false;
      outline(m, outlineWidth);
      this.parts.push(m);
      return m;
    };

    // Chibi proportions: short stubby body, oversized head, big expressive eyes.
    // legs
    this.legL = new TransformNode('legL', s);
    this.legR = new TransformNode('legR', s);
    for (const [node, side] of [[this.legL, -1], [this.legR, 1]] as const) {
      node.parent = this.root;
      node.position.set(side * 0.1, 0.4, 0);
      const leg = add(MeshBuilder.CreateCapsule(`leg${side}`, { radius: 0.075, height: 0.36, tessellation: 8 }, s), node);
      leg.position.y = -0.16;
      leg.material = toonMat(s, a.skin);
      const shoe = add(MeshBuilder.CreateSphere(`shoe${side}`, { diameter: 0.19, segments: 8 }, s), node);
      shoe.scaling.set(1, 0.62, 1.45);
      shoe.position.set(0, -0.34, 0.05);
      shoe.material = toonMat(s, '#ffffff');
    }

    // shorts + rounded torso
    const shorts = add(MeshBuilder.CreateCylinder('shorts', { diameterTop: 0.44, diameterBottom: 0.42, height: 0.24, tessellation: 12 }, s));
    shorts.position.y = 0.5;
    shorts.material = toonMat(s, a.shorts);
    this.body = add(MeshBuilder.CreateCapsule('torso', { radius: 0.23, height: 0.58, tessellation: 12 }, s), this.root, 0.02);
    this.body.position.y = 0.78;
    this.body.material = toonMat(s, a.shirt);

    // arms
    this.armL = new TransformNode('armL', s);
    this.armR = new TransformNode('armR', s);
    for (const [node, side] of [[this.armL, -1], [this.armR, 1]] as const) {
      node.parent = this.root;
      node.position.set(side * 0.25, 0.95, 0);
      const arm = add(MeshBuilder.CreateCapsule(`arm${side}`, { radius: 0.06, height: 0.34, tessellation: 8 }, s), node);
      arm.position.y = -0.14;
      arm.material = toonMat(s, a.shirt);
      const hand = add(MeshBuilder.CreateSphere(`hand${side}`, { diameter: 0.14, segments: 8 }, s), node);
      hand.position.y = -0.33;
      hand.material = toonMat(s, a.skin);
    }

    // oversized head
    this.head = add(MeshBuilder.CreateSphere('head', { diameter: 0.62, segments: 16 }, s), this.root, 0.024);
    this.head.scaling.set(1, 0.96, 0.95);
    this.head.position.y = 1.36;
    this.head.material = toonMat(s, a.skin);

    // big cartoon eyes: white sclera + dark pupil + highlight
    for (const side of [-1, 1]) {
      const sclera = add(MeshBuilder.CreateSphere(`sclera${side}`, { diameter: 0.17, segments: 10 }, s), this.root, 0);
      sclera.scaling.set(1, 1.15, 0.6);
      sclera.position.set(side * 0.13, 1.38, 0.26);
      sclera.material = toonMat(s, '#ffffff', { emissiveBoost: 0.4 });
      const pupil = add(MeshBuilder.CreateSphere(`pupil${side}`, { diameter: 0.095, segments: 8 }, s), this.root, 0);
      pupil.scaling.z = 0.5;
      pupil.position.set(side * 0.13, 1.37, 0.31);
      pupil.material = toonMat(s, '#2b2118');
      const shine = add(MeshBuilder.CreateSphere(`shine${side}`, { diameter: 0.035, segments: 6 }, s), this.root, 0);
      shine.position.set(side * 0.15, 1.4, 0.335);
      shine.material = toonMat(s, '#ffffff', { emissiveBoost: 1 });
      // eyebrow
      const brow = add(MeshBuilder.CreateBox(`brow${side}`, { width: 0.13, height: 0.028, depth: 0.03 }, s), this.root, 0);
      brow.position.set(side * 0.13, 1.5, 0.27);
      brow.rotation.z = side * 0.12;
      brow.material = toonMat(s, a.hair);
    }

    // small round nose + smiling mouth
    const nose = add(MeshBuilder.CreateSphere('nose', { diameter: 0.075, segments: 8 }, s), this.root, 0);
    nose.position.set(0, 1.3, 0.3);
    nose.material = toonMat(s, a.skin, { emissiveBoost: 0.16 });
    const mouth = add(MeshBuilder.CreateTorus('mouth', { diameter: 0.16, thickness: 0.028, tessellation: 14 }, s), this.root, 0);
    mouth.scaling.set(1, 1, 0.35);
    mouth.rotation.x = Math.PI / 2;
    mouth.position.set(0, 1.2, 0.27);
    mouth.material = toonMat(s, '#8c4a3f');
    this.mouth = mouth;
    // rosy cheeks
    for (const side of [-1, 1]) {
      const cheek = add(MeshBuilder.CreateSphere(`cheek${side}`, { diameter: 0.12, segments: 8 }, s), this.root, 0);
      cheek.scaling.set(1, 0.7, 0.3);
      cheek.position.set(side * 0.22, 1.27, 0.24);
      cheek.material = toonMat(s, '#ff9d9d', { emissiveBoost: 0.3 });
    }

    // hair styles sized for the bigger head
    const hairMat = toonMat(s, a.hair);
    const cap = add(MeshBuilder.CreateSphere('hair-cap', { diameter: 0.66, segments: 14, slice: 0.55 }, s), this.root, 0.02);
    cap.position.y = 1.44;
    cap.material = hairMat;
    if (a.hairstyle === 1) {
      const bun = add(MeshBuilder.CreateSphere('hair-bun', { diameter: 0.24, segments: 10 }, s), this.root, 0.018);
      bun.position.set(0, 1.78, -0.08);
      bun.material = hairMat;
    } else if (a.hairstyle === 2) {
      for (const side of [-1, 1]) {
        const puff = add(MeshBuilder.CreateSphere(`hair-puff${side}`, { diameter: 0.26, segments: 10 }, s), this.root, 0.018);
        puff.position.set(side * 0.3, 1.36, -0.06);
        puff.material = hairMat;
      }
    } else if (a.hairstyle === 3) {
      const back = add(MeshBuilder.CreateSphere('hair-long', { diameter: 0.5, segments: 10 }, s), this.root, 0.018);
      back.scaling.set(1, 1.45, 0.6);
      back.position.set(0, 1.16, -0.2);
      back.material = hairMat;
    }

    if (a.hat) {
      const brim = add(MeshBuilder.CreateCylinder('hat-brim', { diameter: 0.82, height: 0.035, tessellation: 16 }, s), this.root, 0.018);
      brim.position.y = 1.56;
      brim.material = toonMat(s, a.hat);
      const crown = add(MeshBuilder.CreateCylinder('hat-crown', { diameter: 0.44, height: 0.2, tessellation: 14 }, s), this.root, 0.018);
      crown.position.y = 1.66;
      crown.material = toonMat(s, a.hat);
    }
    if (a.glasses) {
      for (const side of [-1, 1]) {
        const lens = add(MeshBuilder.CreateTorus(`glasses${side}`, { diameter: 0.2, thickness: 0.022, tessellation: 14 }, s), this.root, 0);
        lens.position.set(side * 0.13, 1.38, 0.29);
        lens.rotation.x = Math.PI / 2;
        lens.material = toonMat(s, '#3a3a52');
      }
      const bridge = add(MeshBuilder.CreateBox('glasses-bridge', { width: 0.09, height: 0.016, depth: 0.016 }, s), this.root, 0);
      bridge.position.set(0, 1.38, 0.29);
      bridge.material = toonMat(s, '#3a3a52');
    }

    this.root.scaling.setAll(a.scale * 1.15);
    this.moodPlane.position.y = 1.95;
    this.setMood('walking');
  }

  private clearParts(): void {
    this.model?.dispose();
    this.model = undefined;
    this.currentClip = '';
    for (const p of this.parts) p.dispose();
    this.parts = [];
    this.mouth = undefined;
    this.armL?.dispose();
    this.armR?.dispose();
    this.legL?.dispose();
    this.legR?.dispose();
  }

  setMood(mood: CustomerMood): void {
    this.mood = mood;
    if (this.model) {
      if (mood === 'happy') this.playClip('emote-yes');
      else if (mood === 'angry' || mood === 'sad') this.playClip('emote-no');
      else if (!this.path) this.playClip('idle');
    }
    const icon = MOOD_ICONS[mood];
    if (this.mouth) {
      this.mouth.rotation.z = mood === 'angry' || mood === 'sad' ? Math.PI : 0;
      this.mouth.scaling.set(mood === 'happy' ? 1.3 : 1, 1, mood === 'happy' ? 0.55 : 0.35);
    }
    if (!icon) {
      this.moodPlane.setEnabled(false);
      this.moodTex?.dispose();
      this.moodTex = undefined;
      return;
    }
    if (this.mouth) {
      // frown for negative moods, wide grin when happy
      this.mouth.rotation.z = mood === 'angry' || mood === 'sad' ? Math.PI : 0;
      this.mouth.scaling.set(mood === 'happy' ? 1.3 : 1, 1, mood === 'happy' ? 0.55 : 0.35);
    }
    this.moodPlane.setEnabled(true);
    this.moodTex?.dispose();
    this.moodTex = undefined;
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
        if (this.model) {
          this.playClip('walk');
        } else {
          // walk cycle: bob + limb swing
          this.walkPhase += dt * 9;
          this.root.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.045;
          const swing = Math.sin(this.walkPhase) * 0.55;
          this.armL.rotation.x = swing;
          this.armR.rotation.x = -swing;
          this.legL.rotation.x = -swing * 0.8;
          this.legR.rotation.x = swing * 0.8;
        }
      }
    } else {
      // idle: face the cart when queued, subtle breathing sway
      this.idlePhase += dt * 2;
      this.root.position.y = 0;
      const targetYaw = Math.PI; // face -Z (toward the cart window)
      this.root.rotation.y = lerpAngle(this.root.rotation.y, targetYaw, Math.min(1, dt * 4));
      if (this.model) {
        if (this.celebrating > 0) this.celebrating -= dt;
        else if (this.mood !== 'happy' && this.mood !== 'angry' && this.mood !== 'sad') {
          this.playClip('idle');
        }
        return;
      }
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

  /** drop any in-progress walk without firing its completion callback */
  cancelWalk(): void {
    this.path = undefined;
  }

  reset(): void {
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
  private templates: ModelTemplate[] = [];
  private pendingSpawns: CustomerState[] = [];
  private loading = false;

  constructor(
    private scene: Scene,
    private onArrivedAtWindow: (customerId: string) => void
  ) {
    void this.preload();
  }

  /** loads the CC0 character rigs; procedural customers are used until ready */
  private async preload(): Promise<void> {
    this.loading = true;
    const loaded = await Promise.all(CHARACTER_MODELS.map((url) => loadModel(this.scene, url)));
    if (this.scene.isDisposed) return;
    this.templates = loaded.filter((t): t is ModelTemplate => !!t);
    this.loading = false;
    // rebuild anyone who spawned before the models were ready
    for (const customer of this.pendingSpawns) {
      const visual = this.active.get(customer.id);
      if (visual) visual.build(customer, this.pickTemplate(customer.id));
    }
    this.pendingSpawns = [];
  }

  private pickTemplate(id: string): ModelTemplate | undefined {
    if (this.templates.length === 0) return undefined;
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return this.templates[hash % this.templates.length];
  }

  private acquire(): CustomerVisual {
    const visual = this.pool.pop() ?? new CustomerVisual(this.scene);
    visual.root.setEnabled(true);
    return visual;
  }

  spawn(customer: CustomerState): void {
    const visual = this.acquire();
    visual.build(customer, this.pickTemplate(customer.id));
    if (this.loading) this.pendingSpawns.push(customer);
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
    visual.cancelWalk();
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
