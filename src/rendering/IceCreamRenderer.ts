import {
  Animation,
  CubicEase,
  EasingFunction,
  Mesh,
  MeshBuilder,
  QuadraticEase,
  Scene,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { toonMat } from './materials';
import { FLAVORS } from '../data/flavors';
import { SAUCES } from '../data/sauces';
import { CONTAINERS } from '../data/containers';
import type { ContainerType, FlavorType, SauceType, ToppingType } from '../gameplay/orders/OrderTypes';
import { Rng } from '../core/Rng';

const SCOOP_RADIUS = 0.13;
const SCOOP_SPACING = 0.185;
const FPS = 60;

const SPRINKLE_COLORS = ['#ff5c8a', '#ffd166', '#4dd0c4', '#8d6cc3', '#6bd0ff', '#8ee08a'];
const NUT_COLORS = ['#b98a52', '#a3743c', '#c99a66'];

function containerTopY(type: ContainerType): number {
  switch (type) {
    case 'cup-small': return 0.1;
    case 'cup-medium': return 0.14;
    case 'cup-large': return 0.18;
    case 'cone': return 0.24;
    case 'waffle-cone': return 0.28;
  }
}

function animateVec(
  target: TransformNode, prop: 'position' | 'scaling',
  to: Vector3, durationSec: number, ease?: EasingFunction
): Promise<void> {
  return new Promise((resolve) => {
    const anim = Animation.CreateAndStartAnimation(
      `anim-${prop}-${target.name}`, target, prop, FPS,
      Math.max(1, Math.round(durationSec * FPS)),
      (target as TransformNode)[prop].clone(), to, Animation.ANIMATIONLOOPMODE_CONSTANT,
      ease, () => resolve()
    );
    if (!anim) resolve();
  });
}

/**
 * Visual representation of one ice cream product being built.
 * Pure rendering: game rules live in PreparationStation/LevelSession.
 */
export class IceCreamVisual {
  readonly root: TransformNode;
  private containerMeshes: Mesh[] = [];
  private scoopMeshes: Mesh[] = [];
  private extraMeshes: Mesh[] = [];
  private scoopFlavors: FlavorType[] = [];
  private containerType?: ContainerType;
  private hasCreamTop = false;
  private rng = new Rng(1234);

  constructor(private scene: Scene, anchor: Vector3) {
    this.root = new TransformNode('ice-cream-product', scene);
    this.root.position.copyFrom(anchor);
  }

  get isEmpty(): boolean {
    return this.containerMeshes.length === 0;
  }

  async setContainer(type: ContainerType): Promise<void> {
    this.containerType = type;
    const def = CONTAINERS[type];
    const meshes: Mesh[] = [];
    if (def.kind === 'cup') {
      const scale = type === 'cup-small' ? 0.8 : type === 'cup-medium' ? 1.0 : 1.2;
      const cup = MeshBuilder.CreateCylinder(`prod-cup`, {
        diameterTop: 0.26 * scale, diameterBottom: 0.18 * scale,
        height: containerTopY(type) + 0.02, tessellation: 18,
      }, this.scene);
      cup.position.y = (containerTopY(type) + 0.02) / 2;
      cup.material = toonMat(this.scene, def.color, { gloss: 0.2 });
      const rim = MeshBuilder.CreateTorus('prod-cup-rim', { diameter: 0.26 * scale, thickness: 0.018, tessellation: 18 }, this.scene);
      rim.position.y = containerTopY(type);
      rim.material = toonMat(this.scene, '#ff8ba7');
      meshes.push(cup, rim);
    } else {
      const cone = MeshBuilder.CreateCylinder('prod-cone', {
        diameterTop: 0.22, diameterBottom: 0.03,
        height: containerTopY(type), tessellation: 14,
      }, this.scene);
      cone.position.y = containerTopY(type) / 2;
      cone.material = toonMat(this.scene, def.color);
      meshes.push(cone);
      if (type === 'waffle-cone') {
        const rim = MeshBuilder.CreateTorus('prod-cone-rim', { diameter: 0.23, thickness: 0.025, tessellation: 14 }, this.scene);
        rim.position.y = containerTopY(type) - 0.01;
        rim.material = toonMat(this.scene, '#8a5a2b');
        meshes.push(rim);
      }
    }
    for (const m of meshes) {
      m.parent = this.root;
      m.isPickable = false;
    }
    this.containerMeshes = meshes;
    // pop-in animation
    this.root.scaling.setAll(0.01);
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    await animateVec(this.root, 'scaling', new Vector3(1, 1, 1), 0.25, ease);
  }

  private scoopCenterY(index: number): number {
    const base = this.containerType ? containerTopY(this.containerType) : 0;
    return base + SCOOP_RADIUS * 0.7 + index * SCOOP_SPACING;
  }

  /** drops a scoop with squash & stretch; resolves when it settles */
  async addScoop(flavor: FlavorType): Promise<void> {
    const index = this.scoopFlavors.length;
    this.scoopFlavors.push(flavor);
    const def = FLAVORS[flavor];
    const scoop = MeshBuilder.CreateSphere(`prod-scoop-${index}`, { diameter: SCOOP_RADIUS * 2, segments: 16 }, this.scene);
    scoop.material = toonMat(this.scene, def.color, { gloss: 0.1 });
    scoop.parent = this.root;
    scoop.isPickable = false;
    const targetY = this.scoopCenterY(index);
    scoop.position.set(0, targetY + 0.45, 0);
    scoop.scaling.set(0.9, 1.15, 0.9);
    this.scoopMeshes.push(scoop);

    const fall = new QuadraticEase();
    fall.setEasingMode(EasingFunction.EASINGMODE_EASEIN);
    await animateVec(scoop, 'position', new Vector3(0, targetY, 0), 0.18, fall);
    // squash on impact, then settle
    await animateVec(scoop, 'scaling', new Vector3(1.18, 0.72, 1.18), 0.07);
    await animateVec(scoop, 'scaling', new Vector3(1.02, 0.94, 1.02), 0.09);
  }

  get topScoopCenter(): Vector3 | undefined {
    if (this.scoopFlavors.length === 0) return undefined;
    return new Vector3(0, this.scoopCenterY(this.scoopFlavors.length - 1), 0);
  }

  /**
   * Sauce as glossy winding ribbons hugging the scoop surfaces,
   * plus small side drips — never floating dots.
   */
  addSauce(sauce: SauceType): void {
    if (this.scoopFlavors.length === 0) return;
    const def = SAUCES[sauce];
    const mat = toonMat(this.scene, def.color, { gloss: def.glossiness, emissiveBoost: 0.1 });

    const topIndex = this.scoopFlavors.length - 1;
    const centerY = this.scoopCenterY(topIndex);
    const surface = SCOOP_RADIUS * 0.98;

    // main spiral ribbon wrapped over the upper hemisphere of the top scoop
    const spiral: Vector3[] = [];
    const turns = 3.2;
    const steps = 72;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const theta = t * turns * Math.PI * 2;
      const phi = 0.12 + t * 1.15; // from near the pole down past the equator
      const r = surface + 0.008;
      spiral.push(new Vector3(
        Math.sin(phi) * Math.cos(theta) * r,
        centerY + Math.cos(phi) * r,
        Math.sin(phi) * Math.sin(theta) * r
      ));
    }
    const ribbon = MeshBuilder.CreateTube('sauce-spiral', { path: spiral, radius: 0.013, tessellation: 8 }, this.scene);
    ribbon.material = mat;
    ribbon.parent = this.root;
    ribbon.isPickable = false;
    this.extraMeshes.push(ribbon);

    // thin curved streaks flowing down over the lower scoops
    const streakCount = Math.min(4, 2 + this.scoopFlavors.length);
    for (let s = 0; s < streakCount; s++) {
      const theta = (s / streakCount) * Math.PI * 2 + 0.5;
      const path: Vector3[] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const phi = 0.5 + t * 1.25;
        const y = centerY + Math.cos(phi) * surface - t * 0.02;
        const r = Math.sin(phi) * surface + 0.006;
        path.push(new Vector3(Math.cos(theta + t * 0.6) * r, y, Math.sin(theta + t * 0.6) * r));
      }
      const streak = MeshBuilder.CreateTube(`sauce-streak-${s}`, { path, radius: 0.008, tessellation: 6 }, this.scene);
      streak.material = mat;
      streak.parent = this.root;
      streak.isPickable = false;
      this.extraMeshes.push(streak);

      // a rounded drip bead at the end of each streak
      const end = path[path.length - 1];
      const drip = MeshBuilder.CreateSphere(`sauce-drip-${s}`, { diameter: 0.024, segments: 6 }, this.scene);
      drip.scaling.y = 1.5;
      drip.position.copyFrom(end);
      drip.material = mat;
      drip.parent = this.root;
      drip.isPickable = false;
      this.extraMeshes.push(drip);
    }
  }

  /** random point on the upper surface of a scoop, with outward normal */
  private surfacePoint(scoopIndex: number, minPhi = 0.15, maxPhi = 1.15): { pos: Vector3; normal: Vector3 } {
    const theta = this.rng.next() * Math.PI * 2;
    const phi = minPhi + this.rng.next() * (maxPhi - minPhi);
    const normal = new Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    );
    const pos = normal.scale(SCOOP_RADIUS * 0.99);
    pos.y += this.scoopCenterY(scoopIndex);
    return { pos, normal };
  }

  addTopping(topping: ToppingType): void {
    if (this.scoopFlavors.length === 0) return;
    switch (topping) {
      case 'sprinkles': this.scatterSprinkles(); break;
      case 'nuts': this.scatterChunks('nuts', NUT_COLORS, 0.028, 7); break;
      case 'oreo': this.scatterOreo(); break;
      case 'chocolate-chips': this.scatterChunks('chips', ['#3d2314', '#2c180d'], 0.024, 8); break;
      case 'fruit': this.scatterChunks('fruit', ['#ff6f61', '#ffd166', '#8ee08a'], 0.03, 6); break;
      case 'whipped-cream': this.addWhippedCream(); break;
      case 'cherry': this.addCherry(); break;
    }
  }

  private scatterSprinkles(): void {
    // small colored sticks lying tangent to the scoop surface with varied directions
    for (let i = 0; i < this.scoopFlavors.length; i++) {
      for (let n = 0; n < 12; n++) {
        const { pos, normal } = this.surfacePoint(i, 0.1, 1.05);
        const stick = MeshBuilder.CreateCapsule(`sprinkle-${i}-${n}`, { radius: 0.006, height: 0.034, tessellation: 5, subdivisions: 1 }, this.scene);
        stick.material = toonMat(this.scene, SPRINKLE_COLORS[(i * 12 + n) % SPRINKLE_COLORS.length], { emissiveBoost: 0.25 });
        stick.parent = this.root;
        stick.position.copyFrom(pos);
        stick.alignWithNormal(normal);
        stick.rotate(new Vector3(1, 0, 0), Math.PI / 2 + (this.rng.next() - 0.5) * 0.6, 1);
        stick.rotate(new Vector3(0, 0, 1), (this.rng.next() - 0.5) * 0.6, 1);
        stick.isPickable = false;
        this.extraMeshes.push(stick);
      }
    }
  }

  private scatterChunks(name: string, colors: string[], size: number, perScoop: number): void {
    for (let i = 0; i < this.scoopFlavors.length; i++) {
      for (let n = 0; n < perScoop; n++) {
        const { pos, normal } = this.surfacePoint(i, 0.15, 1.0);
        const chunk = MeshBuilder.CreatePolyhedron(`${name}-${i}-${n}`, { type: 1, size: size * (0.75 + this.rng.next() * 0.5) }, this.scene);
        chunk.material = toonMat(this.scene, colors[n % colors.length]);
        chunk.parent = this.root;
        chunk.position.copyFrom(pos.subtract(normal.scale(size * 0.35)));
        chunk.rotation.set(this.rng.next() * Math.PI, this.rng.next() * Math.PI, this.rng.next() * Math.PI);
        chunk.isPickable = false;
        this.extraMeshes.push(chunk);
      }
    }
  }

  private scatterOreo(): void {
    // dark crumbs, a few larger pieces clearly visible on top
    for (let i = 0; i < this.scoopFlavors.length; i++) {
      const count = 8;
      for (let n = 0; n < count; n++) {
        const large = n < 2;
        const { pos, normal } = this.surfacePoint(i, 0.12, large ? 0.5 : 1.0);
        const crumb = MeshBuilder.CreateCylinder(`oreo-${i}-${n}`, {
          diameter: large ? 0.05 : 0.024 + this.rng.next() * 0.012,
          height: large ? 0.02 : 0.012,
          tessellation: 8,
        }, this.scene);
        crumb.material = toonMat(this.scene, n % 3 === 0 ? '#1f1b1a' : '#2f2a28');
        crumb.parent = this.root;
        crumb.position.copyFrom(pos);
        crumb.alignWithNormal(normal);
        crumb.rotate(new Vector3(1, 0, 0), (this.rng.next() - 0.5) * 0.5, 1);
        crumb.isPickable = false;
        this.extraMeshes.push(crumb);
      }
    }
  }

  private addWhippedCream(): void {
    const top = this.topScoopCenter;
    if (!top) return;
    this.hasCreamTop = true;
    const mat = toonMat(this.scene, '#fffaf0', { gloss: 0.15, emissiveBoost: 0.3 });
    const baseY = top.y + SCOOP_RADIUS * 0.75;
    // soft swirl: stacked shrinking tori + a rounded tip
    const layers = 4;
    for (let l = 0; l < layers; l++) {
      const t = l / layers;
      const torus = MeshBuilder.CreateTorus(`cream-${l}`, {
        diameter: 0.16 * (1 - t * 0.75),
        thickness: 0.045 * (1 - t * 0.35),
        tessellation: 16,
      }, this.scene);
      torus.material = mat;
      torus.parent = this.root;
      torus.position.set(0, baseY + l * 0.035, 0);
      torus.rotation.y = t * 2.2;
      torus.isPickable = false;
      this.extraMeshes.push(torus);
    }
    const tip = MeshBuilder.CreateSphere('cream-tip', { diameter: 0.055, segments: 8 }, this.scene);
    tip.scaling.y = 1.4;
    tip.material = mat;
    tip.parent = this.root;
    tip.position.set(0, baseY + layers * 0.035 + 0.015, 0);
    tip.isPickable = false;
    this.extraMeshes.push(tip);
  }

  private addCherry(): void {
    const top = this.topScoopCenter;
    if (!top) return;
    const y = top.y + SCOOP_RADIUS * (this.hasCreamTop ? 0.8 : 0.9) + (this.hasCreamTop ? 0.17 : 0);
    const cherry = MeshBuilder.CreateSphere('cherry', { diameter: 0.06, segments: 12 }, this.scene);
    cherry.material = toonMat(this.scene, '#d81e3f', { gloss: 0.9, emissiveBoost: 0.2 });
    cherry.parent = this.root;
    cherry.position.set(0, y, 0);
    cherry.isPickable = false;
    // glossy highlight dot
    const shine = MeshBuilder.CreateSphere('cherry-shine', { diameter: 0.014, segments: 6 }, this.scene);
    shine.material = toonMat(this.scene, '#ffffff', { emissiveBoost: 0.9 });
    shine.parent = this.root;
    shine.position.set(0.016, y + 0.02, -0.012);
    shine.isPickable = false;
    // curved stem
    const stemPath: Vector3[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      stemPath.push(new Vector3(Math.sin(t * 1.3) * 0.035, y + 0.025 + t * 0.055, 0));
    }
    const stem = MeshBuilder.CreateTube('cherry-stem', { path: stemPath, radius: 0.005, tessellation: 6 }, this.scene);
    stem.material = toonMat(this.scene, '#5a7d3a');
    stem.parent = this.root;
    stem.isPickable = false;
    // little leaf
    const leaf = MeshBuilder.CreateSphere('cherry-leaf', { diameter: 0.03, segments: 6 }, this.scene);
    leaf.scaling.set(1.6, 0.35, 0.8);
    leaf.material = toonMat(this.scene, '#5fb56a');
    leaf.parent = this.root;
    leaf.position.set(stemPath[8].x + 0.02, stemPath[8].y, 0);
    leaf.isPickable = false;
    this.extraMeshes.push(cherry, shine, stem, leaf);
  }

  /** slides the product to the window ledge, then toward the customer */
  async deliverTo(ledge: Vector3, customerPos: Vector3): Promise<void> {
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    await animateVec(this.root, 'position', ledge, 0.3, ease);
    const handoff = customerPos.clone();
    handoff.y = ledge.y + 0.15;
    await animateVec(this.root, 'position', handoff, 0.35, ease);
    await animateVec(this.root, 'scaling', new Vector3(0.01, 0.01, 0.01), 0.18);
  }

  dispose(): void {
    this.root.dispose(false, true);
  }
}
