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
import { FLAVORS, FLAVOR_IDS } from '../data/flavors';
import { SAUCES, SAUCE_IDS } from '../data/sauces';
import { TOPPINGS, TOPPING_IDS } from '../data/toppings';
import { CONTAINERS, CONTAINER_IDS } from '../data/containers';
import type { ContainerType, FlavorType, SauceType, ToppingType } from '../gameplay/orders/OrderTypes';
import type { LevelConfig } from '../gameplay/levels/LevelTypes';

export type PickAction =
  | { type: 'container'; id: ContainerType }
  | { type: 'flavor'; id: FlavorType }
  | { type: 'sauce'; id: SauceType }
  | { type: 'topping'; id: ToppingType }
  | { type: 'bell' }
  | { type: 'bin' };

export interface CartHandles {
  root: TransformNode;
  /** world-space center of each flavor tub surface */
  tubPositions: Map<FlavorType, Vector3>;
  /** world-space anchor where the product is built */
  prepAnchor: Vector3;
  /** world-space point on the window ledge where delivered orders land */
  deliveryAnchor: Vector3;
  bell: Mesh;
  scoopTool: TransformNode;
  scoopRestPosition: Vector3;
  /** meshes with metadata.pickAction used by the interaction layer */
  pickables: Mesh[];
  applyLevel(level: LevelConfig): void;
  dispose(): void;
}

const CREAM = '#fff6e8';
const WOOD = '#c98a4b';
const CART_BODY = '#ff8ba7';
const CART_PANEL = '#ffe3ec';
const METAL = '#cfd8e3';

function labelTexture(scene: Scene, icon: string, text: string, bg: string): DynamicTexture {
  const tex = new DynamicTexture(`label-${text}`, { width: 128, height: 64 }, scene, true);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#3b3b3b';
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(icon, 30, 42);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(text.length > 7 ? text.slice(0, 7) : text, 84, 42);
  tex.update();
  return tex;
}

function makeLabelPlane(
  scene: Scene,
  name: string,
  icon: string,
  text: string,
  bg: string,
  size = { w: 0.34, h: 0.17 }
): Mesh {
  const plane = MeshBuilder.CreatePlane(name, { width: size.w, height: size.h }, scene);
  const mat = new StandardMaterial(`${name}-mat`, scene);
  const tex = labelTexture(scene, icon, text, bg);
  mat.diffuseTexture = tex;
  mat.emissiveColor = new Color3(0.85, 0.85, 0.85);
  mat.specularColor = Color3.Black();
  plane.material = mat;
  plane.isPickable = false;
  return plane;
}

function stripedTexture(scene: Scene, colorA: string, colorB: string, stripes = 12): DynamicTexture {
  const tex = new DynamicTexture(`stripes-${colorA}`, { width: 256, height: 128 }, scene, true);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  const w = 256 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
    ctx.fillRect(i * w, 0, w, 128);
  }
  tex.update();
  return tex;
}

/**
 * Builds the full ice cream cart: chassis, wheels, handle, umbrella,
 * counter, flavor tubs, container rack, sauce bottles, topping jars,
 * prep pedestal, delivery bell and trash bin.
 * The cart front (serving window) faces +Z; the player stands at -Z.
 */
export function buildCart(scene: Scene): CartHandles {
  const root = new TransformNode('cart-root', scene);
  const pickables: Mesh[] = [];
  const tubPositions = new Map<FlavorType, Vector3>();
  const disposables: { dispose(): void }[] = [];

  const attach = (mesh: Mesh) => {
    mesh.parent = root;
    return mesh;
  };

  // ---- chassis ----
  const body = attach(MeshBuilder.CreateBox('cart-body', { width: 2.7, height: 0.78, depth: 1.5 }, scene));
  body.position.set(0, 0.62, 0.05);
  body.material = toonMat(scene, CART_BODY);

  const bodyTrim = attach(MeshBuilder.CreateBox('cart-trim', { width: 2.78, height: 0.1, depth: 1.58 }, scene));
  bodyTrim.position.set(0, 0.98, 0.05);
  bodyTrim.material = toonMat(scene, '#ffffff');

  // striped skirt facing the customers
  const skirt = attach(MeshBuilder.CreatePlane('cart-skirt', { width: 2.6, height: 0.6 }, scene));
  skirt.position.set(0, 0.62, 0.81);
  const skirtMat = new StandardMaterial('skirt-mat', scene);
  skirtMat.diffuseTexture = stripedTexture(scene, '#ffffff', '#ff8ba7', 10);
  skirtMat.emissiveColor = new Color3(0.5, 0.5, 0.5);
  skirtMat.specularColor = Color3.Black();
  skirt.material = skirtMat;
  disposables.push(skirtMat);

  // storage door on the player side
  const door = attach(MeshBuilder.CreateBox('cart-door', { width: 1.0, height: 0.5, depth: 0.04 }, scene));
  door.position.set(0, 0.58, -0.72);
  door.material = toonMat(scene, CART_PANEL);
  const doorKnob = attach(MeshBuilder.CreateSphere('door-knob', { diameter: 0.07 }, scene));
  doorKnob.position.set(0.35, 0.58, -0.76);
  doorKnob.material = toonMat(scene, '#f7b32b');

  // counter top
  const counter = attach(MeshBuilder.CreateBox('cart-counter', { width: 2.8, height: 0.08, depth: 1.62 }, scene));
  counter.position.set(0, 1.05, 0.05);
  counter.material = toonMat(scene, CREAM);

  // ---- wheels + axle + handle ----
  const axle = attach(MeshBuilder.CreateCylinder('axle', { diameter: 0.09, height: 1.7 }, scene));
  axle.rotation.z = Math.PI / 2;
  axle.rotation.y = Math.PI / 2;
  axle.position.set(-1.05, 0.36, 0.05);
  axle.material = toonMat(scene, '#8a8f98');

  for (const side of [-1, 1]) {
    const wheel = attach(MeshBuilder.CreateCylinder(`wheel-${side}`, { diameter: 0.74, height: 0.1, tessellation: 24 }, scene));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(-1.05, 0.37, 0.05 + side * 0.84);
    wheel.material = toonMat(scene, '#f7b32b');
    const hub = attach(MeshBuilder.CreateCylinder(`hub-${side}`, { diameter: 0.2, height: 0.12 }, scene));
    hub.rotation.x = Math.PI / 2;
    hub.position.set(-1.05, 0.37, 0.05 + side * 0.85);
    hub.material = toonMat(scene, '#ffffff');
    for (let s = 0; s < 5; s++) {
      const spoke = attach(MeshBuilder.CreateBox(`spoke-${side}-${s}`, { width: 0.05, height: 0.6, depth: 0.04 }, scene));
      spoke.position.set(-1.05, 0.37, 0.05 + side * 0.84);
      spoke.rotation.z = (s * Math.PI) / 2.5;
      spoke.rotation.x = Math.PI / 2;
      spoke.material = toonMat(scene, '#e8ddc8');
    }
  }

  // support legs on the handle side
  for (const side of [-1, 1]) {
    const leg = attach(MeshBuilder.CreateCylinder(`leg-${side}`, { diameter: 0.08, height: 0.42 }, scene));
    leg.position.set(1.15, 0.21, 0.05 + side * 0.6);
    leg.material = toonMat(scene, '#8a8f98');
  }

  // push handle
  for (const side of [-1, 1]) {
    const rod = attach(MeshBuilder.CreateCylinder(`handle-rod-${side}`, { diameter: 0.06, height: 0.9 }, scene));
    rod.rotation.z = -Math.PI / 3;
    rod.position.set(1.62, 0.78, 0.05 + side * 0.45);
    rod.material = toonMat(scene, WOOD);
  }
  const handleBar = attach(MeshBuilder.CreateCylinder('handle-bar', { diameter: 0.08, height: 1.05 }, scene));
  handleBar.rotation.x = Math.PI / 2;
  handleBar.position.set(2.0, 1.0, 0.05);
  handleBar.material = toonMat(scene, WOOD);

  // ---- umbrella ----
  const pole = attach(MeshBuilder.CreateCylinder('umbrella-pole', { diameter: 0.09, height: 2.3 }, scene));
  pole.position.set(0.95, 2.1, -0.35);
  pole.material = toonMat(scene, WOOD);
  const canopy = attach(MeshBuilder.CreateCylinder('umbrella-canopy', { diameterTop: 0.05, diameterBottom: 3.4, height: 0.85, tessellation: 20 }, scene));
  canopy.position.set(0.95, 3.5, -0.35);
  const canopyMat = new StandardMaterial('canopy-mat', scene);
  canopyMat.diffuseTexture = stripedTexture(scene, '#ff8ba7', '#fff6e8', 16);
  canopyMat.emissiveColor = new Color3(0.45, 0.45, 0.45);
  canopyMat.specularColor = Color3.Black();
  canopy.material = canopyMat;
  disposables.push(canopyMat);
  const canopyTip = attach(MeshBuilder.CreateSphere('canopy-tip', { diameter: 0.16 }, scene));
  canopyTip.position.set(0.95, 3.95, -0.35);
  canopyTip.material = toonMat(scene, '#f7b32b');
  const canopyRim = attach(MeshBuilder.CreateTorus('canopy-rim', { diameter: 3.32, thickness: 0.07, tessellation: 24 }, scene));
  canopyRim.position.set(0.95, 3.1, -0.35);
  canopyRim.material = toonMat(scene, '#ffffff');

  // ---- name sign facing the customers ----
  const sign = attach(MeshBuilder.CreateBox('cart-sign', { width: 1.7, height: 0.42, depth: 0.06 }, scene));
  sign.position.set(0, 1.28, 0.92);
  sign.material = toonMat(scene, '#4dd0c4');
  const signText = attach(MeshBuilder.CreatePlane('sign-text', { width: 1.6, height: 0.34 }, scene));
  signText.position.set(0, 1.28, 0.96);
  const signMat = new StandardMaterial('sign-text-mat', scene);
  const signTex = new DynamicTexture('sign-tex', { width: 512, height: 128 }, scene, true);
  const sctx = signTex.getContext() as CanvasRenderingContext2D;
  sctx.fillStyle = '#4dd0c4';
  sctx.fillRect(0, 0, 512, 128);
  sctx.fillStyle = '#ffffff';
  sctx.font = 'bold 64px sans-serif';
  sctx.textAlign = 'center';
  sctx.fillText('🍦 آيس كريم الشاطئ 🍦', 256, 88);
  signTex.update();
  signMat.diffuseTexture = signTex;
  signMat.emissiveColor = new Color3(0.8, 0.8, 0.8);
  signMat.specularColor = Color3.Black();
  signText.material = signMat;
  disposables.push(signMat, signTex);

  // ---- flavor tub console (front half of the counter, tilted toward the player) ----
  const console_ = attach(MeshBuilder.CreateBox('tub-console', { width: 2.5, height: 0.16, depth: 0.95 }, scene));
  console_.position.set(0, 1.14, 0.38);
  console_.material = toonMat(scene, METAL);

  const tubMeshes = new Map<FlavorType, { tub: Mesh; surface: Mesh; mound: Mesh; lid: Mesh; label: Mesh }>();
  FLAVOR_IDS.forEach((flavorId, i) => {
    const def = FLAVORS[flavorId];
    const row = Math.floor(i / 4);
    const col = i % 4;
    const x = -0.93 + col * 0.62;
    const z = 0.6 - row * 0.46;
    const y = 1.22;

    const tub = attach(MeshBuilder.CreateCylinder(`tub-${flavorId}`, { diameter: 0.44, height: 0.16, tessellation: 20 }, scene));
    tub.position.set(x, y, z);
    tub.material = toonMat(scene, METAL, { gloss: 0.3 });

    const surface = attach(MeshBuilder.CreateCylinder(`tub-surface-${flavorId}`, { diameter: 0.4, height: 0.05, tessellation: 20 }, scene));
    surface.position.set(x, y + 0.08, z);
    surface.material = toonMat(scene, def.color, { gloss: 0.12 });
    // a scoop-shaped mound so the tub looks full
    const mound = attach(MeshBuilder.CreateSphere(`tub-mound-${flavorId}`, { diameter: 0.3, segments: 10 }, scene));
    mound.scaling.y = 0.5;
    mound.position.set(x + 0.04, y + 0.1, z - 0.03);
    mound.material = toonMat(scene, def.color, { gloss: 0.12 });
    mound.isPickable = false;

    const lid = attach(MeshBuilder.CreateCylinder(`tub-lid-${flavorId}`, { diameter: 0.46, height: 0.05, tessellation: 20 }, scene));
    lid.position.set(x, y + 0.09, z);
    lid.material = toonMat(scene, '#9aa5b1');

    const label = makeLabelPlane(scene, `tub-label-${flavorId}`, def.icon, def.nameAr, '#ffffff');
    label.parent = root;
    label.position.set(x, y + 0.06, z - 0.26);
    label.rotation.x = -0.95;

    surface.metadata = { pickAction: { type: 'flavor', id: flavorId } satisfies PickAction };
    tub.metadata = surface.metadata;
    pickables.push(surface, tub);
    tubMeshes.set(flavorId, { tub, surface, mound, lid, label });
    tubPositions.set(flavorId, new Vector3(x, y + 0.14, z));
  });

  // ---- container rack (left wing) ----
  const leftWing = attach(MeshBuilder.CreateBox('left-wing', { width: 0.72, height: 0.06, depth: 1.5 }, scene));
  leftWing.position.set(-1.72, 1.02, 0.05);
  leftWing.material = toonMat(scene, WOOD);
  const leftWingLeg = attach(MeshBuilder.CreateCylinder('left-wing-leg', { diameter: 0.07, height: 1.0 }, scene));
  leftWingLeg.position.set(-1.9, 0.5, 0.05);
  leftWingLeg.material = toonMat(scene, WOOD);

  const containerMeshes = new Map<ContainerType, { group: TransformNode; meshes: Mesh[]; label: Mesh }>();
  CONTAINER_IDS.forEach((containerId, i) => {
    const def = CONTAINERS[containerId];
    const group = new TransformNode(`rack-${containerId}`, scene);
    group.parent = root;
    const z = 0.62 - i * 0.29;
    group.position.set(-1.72, 1.05, z);
    const meshes: Mesh[] = [];
    if (def.kind === 'cup') {
      const scale = containerId === 'cup-small' ? 0.75 : containerId === 'cup-medium' ? 0.95 : 1.15;
      const cup = MeshBuilder.CreateCylinder(`rack-cup-${containerId}`, { diameterTop: 0.2 * scale, diameterBottom: 0.14 * scale, height: 0.16 * scale, tessellation: 14 }, scene);
      cup.parent = group;
      cup.position.y = 0.08 * scale;
      cup.material = toonMat(scene, def.color, { gloss: 0.15 });
      meshes.push(cup);
    } else {
      const cone = MeshBuilder.CreateCylinder(`rack-cone-${containerId}`, { diameterTop: 0.17, diameterBottom: 0.02, height: 0.26, tessellation: 12 }, scene);
      cone.parent = group;
      cone.position.y = 0.13;
      cone.material = toonMat(scene, def.color, { gloss: containerId === 'waffle-cone' ? 0.05 : 0.02 });
      meshes.push(cone);
      if (containerId === 'waffle-cone') {
        const rim = MeshBuilder.CreateTorus(`rack-rim-${containerId}`, { diameter: 0.17, thickness: 0.025, tessellation: 12 }, scene);
        rim.parent = group;
        rim.position.y = 0.25;
        rim.material = toonMat(scene, '#8a5a2b');
        meshes.push(rim);
      }
    }
    const label = makeLabelPlane(scene, `rack-label-${containerId}`, def.icon, def.nameAr, '#fffef2', { w: 0.3, h: 0.14 });
    label.parent = group;
    label.position.set(0, 0.02, -0.145);
    label.rotation.x = -0.9;
    for (const m of meshes) {
      m.metadata = { pickAction: { type: 'container', id: containerId } satisfies PickAction };
      pickables.push(m);
    }
    containerMeshes.set(containerId, { group, meshes, label });
  });

  // ---- sauce bottles (right wing) ----
  const rightWing = attach(MeshBuilder.CreateBox('right-wing', { width: 0.72, height: 0.06, depth: 1.5 }, scene));
  rightWing.position.set(1.72, 1.02, 0.05);
  rightWing.material = toonMat(scene, WOOD);
  const rightWingLeg = attach(MeshBuilder.CreateCylinder('right-wing-leg', { diameter: 0.07, height: 1.0 }, scene));
  rightWingLeg.position.set(1.9, 0.5, 0.05);
  rightWingLeg.material = toonMat(scene, WOOD);

  const sauceMeshes = new Map<SauceType, { group: TransformNode; label: Mesh }>();
  SAUCE_IDS.forEach((sauceId, i) => {
    const def = SAUCES[sauceId];
    const group = new TransformNode(`sauce-${sauceId}`, scene);
    group.parent = root;
    group.position.set(1.72, 1.05, 0.5 - i * 0.4);
    const bottle = MeshBuilder.CreateCylinder(`sauce-bottle-${sauceId}`, { diameter: 0.16, height: 0.3, tessellation: 14 }, scene);
    bottle.parent = group;
    bottle.position.y = 0.15;
    bottle.material = toonMat(scene, def.color, { gloss: def.glossiness * 0.5 });
    const tip = MeshBuilder.CreateCylinder(`sauce-tip-${sauceId}`, { diameterBottom: 0.1, diameterTop: 0.025, height: 0.12, tessellation: 10 }, scene);
    tip.parent = group;
    tip.position.y = 0.36;
    tip.material = toonMat(scene, '#f2f2f2');
    const label = makeLabelPlane(scene, `sauce-label-${sauceId}`, def.icon, def.nameAr.replace('صوص ', ''), '#fff2f6', { w: 0.3, h: 0.14 });
    label.parent = group;
    label.position.set(0, 0.16, -0.095);
    bottle.metadata = { pickAction: { type: 'sauce', id: sauceId } satisfies PickAction };
    tip.metadata = bottle.metadata;
    pickables.push(bottle, tip);
    sauceMeshes.set(sauceId, { group, label });
  });

  // ---- topping jars (row nearest the player) ----
  const toppingMeshes = new Map<ToppingType, { group: TransformNode; label: Mesh }>();
  TOPPING_IDS.forEach((toppingId, i) => {
    const def = TOPPINGS[toppingId];
    const group = new TransformNode(`topping-${toppingId}`, scene);
    group.parent = root;
    group.position.set(-1.05 + i * 0.35, 1.09, -0.62);
    const jar = MeshBuilder.CreateCylinder(`jar-${toppingId}`, { diameterTop: 0.22, diameterBottom: 0.18, height: 0.14, tessellation: 14 }, scene);
    jar.parent = group;
    jar.position.y = 0.07;
    jar.material = toonMat(scene, '#f4f9fb', { gloss: 0.4, alpha: 0.95 });
    const fill = MeshBuilder.CreateCylinder(`jar-fill-${toppingId}`, { diameter: 0.19, height: 0.05, tessellation: 14 }, scene);
    fill.parent = group;
    fill.position.y = 0.12;
    fill.material = toonMat(scene, def.color, { gloss: 0.1 });
    const label = makeLabelPlane(scene, `jar-label-${toppingId}`, def.icon, def.nameAr.split(' ')[0], '#f4fff4', { w: 0.28, h: 0.13 });
    label.parent = group;
    label.position.set(0, 0.045, -0.115);
    label.rotation.x = -0.55;
    jar.metadata = { pickAction: { type: 'topping', id: toppingId } satisfies PickAction };
    fill.metadata = jar.metadata;
    pickables.push(jar, fill);
    toppingMeshes.set(toppingId, { group, label });
  });

  // ---- prep pedestal ----
  const pedestal = attach(MeshBuilder.CreateCylinder('prep-pedestal', { diameter: 0.5, height: 0.05, tessellation: 24 }, scene));
  pedestal.position.set(0, 1.11, -0.18);
  pedestal.material = toonMat(scene, '#ffd9e8', { gloss: 0.25 });
  const pedestalRim = attach(MeshBuilder.CreateTorus('prep-rim', { diameter: 0.5, thickness: 0.03, tessellation: 24 }, scene));
  pedestalRim.position.set(0, 1.13, -0.18);
  pedestalRim.material = toonMat(scene, '#f7b32b');

  // ---- delivery bell ----
  const bellBase = attach(MeshBuilder.CreateCylinder('bell-base', { diameter: 0.22, height: 0.03 }, scene));
  bellBase.position.set(0.72, 1.1, -0.35);
  bellBase.material = toonMat(scene, '#8a8f98');
  const bell = attach(MeshBuilder.CreateSphere('bell', { diameter: 0.2, segments: 12, slice: 0.5 }, scene));
  bell.position.set(0.72, 1.12, -0.35);
  bell.material = toonMat(scene, '#f7b32b', { gloss: 0.6 });
  const bellButton = attach(MeshBuilder.CreateCylinder('bell-button', { diameter: 0.05, height: 0.06 }, scene));
  bellButton.position.set(0.72, 1.2, -0.35);
  bellButton.material = toonMat(scene, '#5b5f66');
  bell.metadata = { pickAction: { type: 'bell' } satisfies PickAction };
  bellBase.metadata = bell.metadata;
  bellButton.metadata = bell.metadata;
  pickables.push(bell, bellBase, bellButton);
  const bellLabel = makeLabelPlane(scene, 'bell-label', '🔔', 'تسليم', '#fff8dc', { w: 0.3, h: 0.14 });
  bellLabel.parent = root;
  bellLabel.position.set(0.72, 1.36, -0.35);
  bellLabel.rotation.x = -0.55;

  // ---- trash bin (clear prep) ----
  const bin = attach(MeshBuilder.CreateCylinder('bin', { diameterTop: 0.22, diameterBottom: 0.17, height: 0.2, tessellation: 14 }, scene));
  bin.position.set(-0.72, 1.18, -0.28);
  bin.material = toonMat(scene, '#9fb8c8', { gloss: 0.3 });
  bin.metadata = { pickAction: { type: 'bin' } satisfies PickAction };
  pickables.push(bin);
  const binLabel = makeLabelPlane(scene, 'bin-label', '🗑️', 'تفريغ', '#f0f4f8', { w: 0.3, h: 0.14 });
  binLabel.parent = root;
  binLabel.position.set(-0.72, 1.32, -0.28);
  binLabel.rotation.x = -0.55;

  // ---- scoop tool (ladle) resting beside the prep pedestal ----
  const scoopTool = new TransformNode('scoop-tool', scene);
  scoopTool.parent = root;
  const scoopHead = MeshBuilder.CreateSphere('scoop-head', { diameter: 0.16, segments: 12, slice: 0.55 }, scene);
  scoopHead.parent = scoopTool;
  scoopHead.rotation.x = Math.PI;
  scoopHead.material = toonMat(scene, METAL, { gloss: 0.7 });
  scoopHead.isPickable = false;
  const scoopHandle = MeshBuilder.CreateCylinder('scoop-handle', { diameter: 0.035, height: 0.28 }, scene);
  scoopHandle.parent = scoopTool;
  scoopHandle.position.set(0.02, 0.12, -0.1);
  scoopHandle.rotation.x = 0.9;
  scoopHandle.material = toonMat(scene, '#e05f7a');
  scoopHandle.isPickable = false;
  const scoopRestPosition = new Vector3(0.42, 1.16, -0.22);
  scoopTool.position.copyFrom(scoopRestPosition);

  const prepAnchor = new Vector3(0, 1.135, -0.18);
  const deliveryAnchor = new Vector3(0, 1.1, 0.95);

  // window ledge where the finished order is handed over
  const ledge = attach(MeshBuilder.CreateBox('ledge', { width: 0.9, height: 0.05, depth: 0.35 }, scene));
  ledge.position.set(0, 1.06, 0.95);
  ledge.material = toonMat(scene, WOOD);

  function applyLevel(level: LevelConfig): void {
    for (const [id, parts] of tubMeshes) {
      const unlocked = level.allowedFlavors.includes(id);
      parts.lid.setEnabled(!unlocked);
      parts.mound.setEnabled(unlocked);
      parts.surface.setEnabled(unlocked);
      parts.label.setEnabled(unlocked);
      parts.surface.isPickable = unlocked;
      parts.tub.isPickable = unlocked;
    }
    for (const [id, parts] of containerMeshes) {
      const unlocked = level.allowedContainers.includes(id);
      parts.group.setEnabled(unlocked);
    }
    for (const [id, parts] of sauceMeshes) {
      parts.group.setEnabled(level.allowedSauces.includes(id));
    }
    for (const [id, parts] of toppingMeshes) {
      parts.group.setEnabled(level.allowedToppings.includes(id));
    }
  }

  return {
    root,
    tubPositions,
    prepAnchor,
    deliveryAnchor,
    bell,
    scoopTool,
    scoopRestPosition,
    pickables,
    applyLevel,
    dispose() {
      for (const d of disposables) d.dispose();
      root.dispose(false, true);
    },
  };
}
