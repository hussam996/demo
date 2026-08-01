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
import { outline, setOutlinesEnabled } from './toon';
import { FLAVORS, FLAVOR_IDS } from '../data/flavors';
import { SAUCES, SAUCE_IDS } from '../data/sauces';
import { TOPPINGS, TOPPING_IDS } from '../data/toppings';
import { CONTAINERS, CONTAINER_IDS } from '../data/containers';
import type { ContainerType, FlavorType, SauceType, ToppingType } from '../gameplay/orders/OrderTypes';
import type { LevelConfig } from '../gameplay/levels/LevelTypes';
import type { QualityLevel } from '../core/SaveManager';

export type PickAction =
  | { type: 'container'; id: ContainerType }
  | { type: 'flavor'; id: FlavorType }
  | { type: 'sauce'; id: SauceType }
  | { type: 'topping'; id: ToppingType }
  | { type: 'bell' }
  | { type: 'bin' };

export interface CartHandles {
  root: TransformNode;
  tubPositions: Map<FlavorType, Vector3>;
  prepAnchor: Vector3;
  deliveryAnchor: Vector3;
  bell: Mesh;
  scoopTool: TransformNode;
  scoopRestPosition: Vector3;
  pickables: Mesh[];
  applyLevel(level: LevelConfig): void;
  setQuality(quality: QualityLevel): void;
  update(elapsedSeconds: number): void;
  dispose(): void;
}

/**
 * Storefront palette — a warm seaside ice cream stand in the same visual
 * family as modern cartoon food-shop games: cream sandstone, rose-red
 * signage, pink/cream scalloped awning, teal trim, warm wood.
 */
const C = {
  sandstone: '#f8dcb5',
  sandstoneDeep: '#e9c396',
  signRed: '#df676d',
  signRedDark: '#c04f56',
  lettering: '#fbeccb',
  plum: '#59234e',
  awningPink: '#f49aa8',
  awningCream: '#fcedcf',
  teal: '#2e99a1',
  tealLight: '#68dddb',
  wainscot: '#89a58f',
  wood: '#e19a61',
  woodDark: '#c97a44',
  cream: '#ebe9d4',
  steel: '#cfd8e3',
  gold: '#e0951b',
  leaf: '#7cbf6a',
  pot: '#d9724b',
};

function labelTexture(scene: Scene, icon: string, text: string, bg: string): DynamicTexture {
  const tex = new DynamicTexture(`label-${text}`, { width: 160, height: 72 }, scene, true);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 160, 72);
  ctx.strokeStyle = '#2a2018';
  ctx.lineWidth = 7;
  ctx.strokeRect(0, 0, 160, 72);
  ctx.fillStyle = '#2f2620';
  ctx.font = '34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, 34, 38);
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(text.length > 8 ? text.slice(0, 8) : text, 102, 40);
  tex.update();
  return tex;
}

function makeLabelPlane(
  scene: Scene,
  name: string,
  icon: string,
  text: string,
  bg: string,
  size = { w: 0.34, h: 0.16 }
): Mesh {
  const plane = MeshBuilder.CreatePlane(name, { width: size.w, height: size.h }, scene);
  const mat = new StandardMaterial(`${name}-mat`, scene);
  mat.diffuseTexture = labelTexture(scene, icon, text, bg);
  mat.emissiveColor = new Color3(0.62, 0.62, 0.62);
  mat.specularColor = Color3.Black();
  mat.backFaceCulling = false;
  plane.material = mat;
  plane.isPickable = false;
  return plane;
}

function stripedTexture(scene: Scene, colorA: string, colorB: string, stripes: number): DynamicTexture {
  const tex = new DynamicTexture(`stripes-${colorA}-${stripes}`, { width: 512, height: 128 }, scene, true);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  const w = 512 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
    ctx.fillRect(i * w, 0, w + 1, 128);
  }
  tex.update();
  return tex;
}

/** rose-red board with cream hand-lettered shop name, thick dark border */
function signTexture(scene: Scene, title: string, sub: string): DynamicTexture {
  const tex = new DynamicTexture('sign-tex', { width: 1024, height: 256 }, scene, true);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle = C.signRed;
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = '#2a2018';
  ctx.lineWidth = 18;
  ctx.strokeRect(0, 0, 1024, 256);
  ctx.strokeStyle = C.lettering;
  ctx.lineWidth = 6;
  ctx.strokeRect(26, 26, 972, 204);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.lettering;
  ctx.font = 'bold 96px sans-serif';
  ctx.fillText(title, 512, 108);
  ctx.font = '44px sans-serif';
  ctx.fillText(sub, 512, 190);
  tex.update();
  return tex;
}

/** menu board hung inside the stand, readable from the vendor's side */
function menuTexture(scene: Scene): DynamicTexture {
  const tex = new DynamicTexture('menu-tex', { width: 512, height: 320 }, scene, true);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle = '#3b2a20';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = C.wood;
  ctx.lineWidth = 22;
  ctx.strokeRect(0, 0, 512, 320);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.lettering;
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText('🍦 القائمة 🍦', 256, 74);
  ctx.font = '34px sans-serif';
  ctx.fillStyle = '#ffd9a0';
  ctx.fillText('كوب · مخروط · وافل', 256, 140);
  ctx.fillText('٨ نكهات · ٣ صوصات', 256, 196);
  ctx.fillText('٧ إضافات لذيذة', 256, 252);
  tex.update();
  return tex;
}

/**
 * Builds the decorated ice cream stand: counter, side pillars, scalloped
 * striped awning, illuminated sign, festoon lights, planters and crates,
 * plus every interactive station (tubs, rack, sauces, jars, prep, bell, bin).
 * The serving side faces +Z; the player stands behind the counter at -Z.
 */
export function buildCart(scene: Scene): CartHandles {
  const root = new TransformNode('stand-root', scene);
  const pickables: Mesh[] = [];
  const outlined: Mesh[] = [];
  const tubPositions = new Map<FlavorType, Vector3>();
  const disposables: { dispose(): void }[] = [];

  const attach = (mesh: Mesh, outlineWidth?: number) => {
    mesh.parent = root;
    if (outlineWidth !== undefined) {
      outline(mesh, outlineWidth);
      outlined.push(mesh);
    }
    return mesh;
  };

  // ---------- counter body ----------
  const counterBase = attach(
    MeshBuilder.CreateBox('counter-base', { width: 4.6, height: 0.95, depth: 1.5 }, scene),
    0.02
  );
  counterBase.position.set(0, 0.5, 0.15);
  counterBase.material = toonMat(scene, C.sandstone);

  // painted panel band facing the customers
  const panelBand = attach(MeshBuilder.CreateBox('counter-band', { width: 4.5, height: 0.36, depth: 0.06 }, scene));
  panelBand.position.set(0, 0.42, 0.92);
  panelBand.material = toonMat(scene, C.teal);
  for (let i = 0; i < 7; i++) {
    const dot = attach(MeshBuilder.CreateSphere(`band-dot-${i}`, { diameter: 0.14, segments: 8 }, scene));
    dot.scaling.z = 0.35;
    dot.position.set(-1.8 + i * 0.6, 0.42, 0.96);
    dot.material = toonMat(scene, C.lettering, { emissiveBoost: 0.3 });
  }

  const counterTop = attach(
    MeshBuilder.CreateBox('counter-top', { width: 4.8, height: 0.12, depth: 1.95 }, scene),
    0.022
  );
  counterTop.position.set(0, 1.03, 0.15);
  counterTop.material = toonMat(scene, C.wood);

  // rounded bullnose front edge
  const bullnose = attach(MeshBuilder.CreateCylinder('counter-edge', { diameter: 0.16, height: 4.8, tessellation: 14 }, scene));
  bullnose.rotation.z = Math.PI / 2;
  bullnose.position.set(0, 1.03, 0.98);
  bullnose.material = toonMat(scene, C.woodDark);


  // ---------- side pillars ----------
  const pillarX = 2.62;
  for (const side of [-1, 1]) {
    const pillar = attach(
      MeshBuilder.CreateBox(`pillar-${side}`, { width: 0.34, height: 3.24, depth: 0.34 }, scene),
      0.025
    );
    pillar.position.set(side * pillarX, 1.62, 0.35);
    pillar.material = toonMat(scene, C.sandstoneDeep);

    const capital = attach(MeshBuilder.CreateBox(`capital-${side}`, { width: 0.5, height: 0.18, depth: 0.5 }, scene), 0.02);
    capital.position.set(side * pillarX, 3.32, 0.35);
    capital.material = toonMat(scene, C.lettering);

    const plinth = attach(MeshBuilder.CreateBox(`plinth-${side}`, { width: 0.52, height: 0.22, depth: 0.52 }, scene), 0.02);
    plinth.position.set(side * pillarX, 0.11, 0.35);
    plinth.material = toonMat(scene, C.lettering);

    // teal wainscot stripe
    const stripe = attach(MeshBuilder.CreateBox(`pillar-stripe-${side}`, { width: 0.37, height: 0.7, depth: 0.37 }, scene));
    stripe.position.set(side * pillarX, 0.6, 0.35);
    stripe.material = toonMat(scene, C.wainscot);
  }

  // ---------- awning: striped canopy with a scalloped hem ----------
  const awning = attach(MeshBuilder.CreateBox('awning', { width: 5.5, height: 0.12, depth: 1.9 }, scene), 0.03);
  awning.position.set(0, 3.16, 0.75);
  awning.rotation.x = -0.16;
  const awningMat = new StandardMaterial('awning-mat', scene);
  awningMat.diffuseTexture = stripedTexture(scene, C.awningPink, C.awningCream, 18);
  awningMat.emissiveColor = new Color3(0.5, 0.5, 0.5);
  awningMat.specularColor = Color3.Black();
  awning.material = awningMat;
  disposables.push(awningMat);

  // rose trim along the top of the awning
  const trim = attach(MeshBuilder.CreateBox('awning-trim', { width: 5.55, height: 0.14, depth: 0.16 }, scene), 0.02);
  trim.position.set(0, 3.28, -0.12);
  trim.material = toonMat(scene, C.signRed);

  // scalloped hem: a row of half-discs along the front edge
  const hemY = 3.16 - Math.sin(0.16) * 0.95;
  for (let i = 0; i < 16; i++) {
    const scallop = MeshBuilder.CreateSphere(`scallop-${i}`, { diameter: 0.36, segments: 10 }, scene);
    scallop.parent = root;
    scallop.scaling.set(1, 1, 0.28);
    scallop.position.set(-2.62 + i * 0.35, hemY - 0.06, 1.68);
    scallop.material = toonMat(scene, i % 2 === 0 ? C.awningPink : C.awningCream);
    scallop.isPickable = false;
  }

  // ---------- shop sign (faces the customers) ----------
  const signBoard = attach(MeshBuilder.CreateBox('sign-board', { width: 3.4, height: 0.72, depth: 0.1 }, scene), 0.03);
  signBoard.position.set(0, 2.74, 1.52);
  signBoard.material = toonMat(scene, C.lettering);
  const signFace = attach(MeshBuilder.CreatePlane('sign-face', { width: 3.3, height: 0.7 }, scene));
  signFace.position.set(0, 2.74, 1.6);
  signFace.rotation.y = Math.PI; // shop name reads from the customers' side
  const signMat = new StandardMaterial('sign-mat', scene);
  const signTex = signTexture(scene, 'آيس كريم الشاطئ', 'Beach Ice Cream');
  signMat.diffuseTexture = signTex;
  signMat.emissiveColor = new Color3(0.85, 0.85, 0.85);
  signMat.specularColor = Color3.Black();
  signMat.backFaceCulling = false;
  signFace.material = signMat;
  disposables.push(signMat, signTex);

  // ice cream motif on the vendor-facing side of the board
  for (let i = 0; i < 5; i++) {
    const scoop = MeshBuilder.CreateSphere(`sign-motif-${i}`, { diameter: 0.22, segments: 10 }, scene);
    scoop.parent = root;
    scoop.scaling.z = 0.3;
    scoop.position.set(-1.2 + i * 0.6, 2.74, 1.44);
    scoop.material = toonMat(scene, ['#ff8ba7', '#ffd166', '#a8e06a', '#68dddb', '#c9a0ff'][i], {
      emissiveBoost: 0.35,
    });
    scoop.isPickable = false;
  }

  // plum corner sign hanging on the left pillar
  const cornerSign = attach(MeshBuilder.CreateBox('corner-sign', { width: 0.5, height: 1.1, depth: 0.08 }, scene), 0.02);
  cornerSign.position.set(-pillarX - 0.24, 1.95, 0.35);
  cornerSign.rotation.y = Math.PI / 2;
  cornerSign.material = toonMat(scene, C.plum);
  const coneIcon = attach(MeshBuilder.CreateCylinder('corner-cone', { diameterTop: 0.2, diameterBottom: 0.02, height: 0.34, tessellation: 12 }, scene));
  coneIcon.rotation.z = Math.PI;
  coneIcon.position.set(-pillarX - 0.3, 1.7, 0.35);
  coneIcon.material = toonMat(scene, C.wood);
  const coneBall = attach(MeshBuilder.CreateSphere('corner-ball', { diameter: 0.24, segments: 10 }, scene));
  coneBall.position.set(-pillarX - 0.3, 2.01, 0.35);
  coneBall.material = toonMat(scene, '#f7c8d8', { emissiveBoost: 0.3 });

  // ---------- festoon lights strung under the awning ----------
  const bulbColors = ['#ffd166', '#ff8ba7', '#68dddb', '#a8e06a', '#ffa66b'];
  const bulbs: Mesh[] = [];
  const wire = attach(MeshBuilder.CreateCylinder('festoon-wire', { diameter: 0.02, height: 5.2, tessellation: 6 }, scene));
  wire.rotation.z = Math.PI / 2;
  wire.position.set(0, 2.34, 1.66);
  wire.material = toonMat(scene, '#3b2a20');
  for (let i = 0; i < 13; i++) {
    const bulb = MeshBuilder.CreateSphere(`bulb-${i}`, { diameter: 0.13, segments: 8 }, scene);
    bulb.parent = root;
    bulb.position.set(-2.4 + i * 0.4, 2.25, 1.66);
    bulb.material = toonMat(scene, bulbColors[i % bulbColors.length], { emissiveBoost: 0.85, gloss: 0.4 });
    bulb.isPickable = false;
    bulbs.push(bulb);
  }

  // ---------- planters and crates ----------
  for (const side of [-1, 1]) {
    const pot = attach(MeshBuilder.CreateCylinder(`pot-${side}`, { diameterTop: 0.5, diameterBottom: 0.36, height: 0.42, tessellation: 14 }, scene), 0.02);
    pot.position.set(side * (pillarX + 0.62), 0.21, 0.9);
    pot.material = toonMat(scene, C.pot);
    const rim = attach(MeshBuilder.CreateTorus(`pot-rim-${side}`, { diameter: 0.5, thickness: 0.07, tessellation: 14 }, scene));
    rim.position.set(side * (pillarX + 0.62), 0.42, 0.9);
    rim.material = toonMat(scene, '#b95a37');
    // topiary ball
    const topiary = attach(MeshBuilder.CreateSphere(`topiary-${side}`, { diameter: 0.66, segments: 10 }, scene), 0.025);
    topiary.position.set(side * (pillarX + 0.62), 0.82, 0.9);
    topiary.material = toonMat(scene, C.leaf);
    const topiarySmall = attach(MeshBuilder.CreateSphere(`topiary2-${side}`, { diameter: 0.44, segments: 10 }, scene), 0.02);
    topiarySmall.position.set(side * (pillarX + 0.62), 1.22, 0.9);
    topiarySmall.material = toonMat(scene, '#8fd07a');
  }

  // small potted plants on the counter ends
  for (const side of [-1, 1]) {
    const smallPot = attach(MeshBuilder.CreateCylinder(`counter-pot-${side}`, { diameterTop: 0.26, diameterBottom: 0.2, height: 0.24, tessellation: 12 }, scene), 0.014);
    smallPot.position.set(side * 2.16, 1.21, 0.55);
    smallPot.material = toonMat(scene, C.pot);
    const bush = attach(MeshBuilder.CreateSphere(`counter-bush-${side}`, { diameter: 0.36, segments: 10 }, scene), 0.016);
    bush.position.set(side * 2.16, 1.45, 0.55);
    bush.material = toonMat(scene, C.leaf);
    const bloom = attach(MeshBuilder.CreateSphere(`counter-bloom-${side}`, { diameter: 0.1, segments: 8 }, scene));
    bloom.position.set(side * 2.16 + 0.1, 1.58, 0.48);
    bloom.material = toonMat(scene, '#ff8ba7', { emissiveBoost: 0.35 });
  }

  // stacked crates of cones on the vendor side
  for (let i = 0; i < 2; i++) {
    const crate = attach(MeshBuilder.CreateBox(`crate-${i}`, { width: 0.6, height: 0.36, depth: 0.5 }, scene), 0.02);
    crate.position.set(-2.5, 0.18 + i * 0.37, -0.75);
    crate.rotation.y = i * 0.25;
    crate.material = toonMat(scene, i === 0 ? C.wood : C.woodDark);
  }

  // ---------- flavor tub console ----------
  const console_ = attach(MeshBuilder.CreateBox('tub-console', { width: 2.7, height: 0.18, depth: 1.0 }, scene), 0.02);
  console_.position.set(0, 1.12, 0.42);
  console_.material = toonMat(scene, C.steel);

  const tubMeshes = new Map<FlavorType, { tub: Mesh; surface: Mesh; mound: Mesh; lid: Mesh; label: Mesh }>();
  FLAVOR_IDS.forEach((flavorId, i) => {
    const def = FLAVORS[flavorId];
    const row = Math.floor(i / 4);
    const col = i % 4;
    const x = -0.99 + col * 0.66;
    const z = 0.66 - row * 0.48;
    const y = 1.22;

    const tub = attach(MeshBuilder.CreateCylinder(`tub-${flavorId}`, { diameter: 0.46, height: 0.18, tessellation: 20 }, scene), 0.014);
    tub.position.set(x, y, z);
    tub.material = toonMat(scene, C.steel, { gloss: 0.3 });

    const surface = attach(MeshBuilder.CreateCylinder(`tub-surface-${flavorId}`, { diameter: 0.42, height: 0.06, tessellation: 20 }, scene));
    surface.position.set(x, y + 0.09, z);
    surface.material = toonMat(scene, def.color, { gloss: 0.12 });

    const mound = attach(MeshBuilder.CreateSphere(`tub-mound-${flavorId}`, { diameter: 0.32, segments: 10 }, scene));
    mound.scaling.y = 0.5;
    mound.position.set(x + 0.04, y + 0.11, z - 0.03);
    mound.material = toonMat(scene, def.color, { gloss: 0.12 });
    mound.isPickable = false;

    const lid = attach(MeshBuilder.CreateCylinder(`tub-lid-${flavorId}`, { diameter: 0.48, height: 0.06, tessellation: 20 }, scene));
    lid.position.set(x, y + 0.1, z);
    lid.material = toonMat(scene, '#9aa5b1');

    const label = makeLabelPlane(scene, `tub-label-${flavorId}`, def.icon, def.nameAr, C.lettering);
    label.parent = root;
    label.position.set(x, y + 0.07, z - 0.27);
    label.rotation.x = -0.95;

    surface.metadata = { pickAction: { type: 'flavor', id: flavorId } satisfies PickAction };
    tub.metadata = surface.metadata;
    pickables.push(surface, tub);
    tubMeshes.set(flavorId, { tub, surface, mound, lid, label });
    tubPositions.set(flavorId, new Vector3(x, y + 0.15, z));
  });

  // ---------- container rack (left wing) ----------
  const leftWing = attach(MeshBuilder.CreateBox('left-wing', { width: 0.8, height: 0.1, depth: 1.6 }, scene), 0.018);
  leftWing.position.set(-1.85, 1.04, 0.15);
  leftWing.material = toonMat(scene, C.woodDark);

  const containerMeshes = new Map<ContainerType, { group: TransformNode; label: Mesh }>();
  CONTAINER_IDS.forEach((containerId, i) => {
    const def = CONTAINERS[containerId];
    const group = new TransformNode(`rack-${containerId}`, scene);
    group.parent = root;
    group.position.set(-1.85, 1.09, 0.74 - i * 0.31);
    const meshes: Mesh[] = [];
    if (def.kind === 'cup') {
      const scale = containerId === 'cup-small' ? 0.8 : containerId === 'cup-medium' ? 1.0 : 1.2;
      const cup = MeshBuilder.CreateCylinder(`rack-cup-${containerId}`, {
        diameterTop: 0.22 * scale, diameterBottom: 0.15 * scale, height: 0.18 * scale, tessellation: 14,
      }, scene);
      cup.parent = group;
      cup.position.y = 0.09 * scale;
      cup.material = toonMat(scene, def.color, { gloss: 0.15 });
      meshes.push(cup);
    } else {
      const cone = MeshBuilder.CreateCylinder(`rack-cone-${containerId}`, {
        diameterTop: 0.19, diameterBottom: 0.02, height: 0.28, tessellation: 12,
      }, scene);
      cone.parent = group;
      cone.position.y = 0.14;
      cone.material = toonMat(scene, def.color);
      meshes.push(cone);
      if (containerId === 'waffle-cone') {
        const rim = MeshBuilder.CreateTorus(`rack-rim-${containerId}`, { diameter: 0.19, thickness: 0.028, tessellation: 12 }, scene);
        rim.parent = group;
        rim.position.y = 0.27;
        rim.material = toonMat(scene, '#8a5a2b');
        meshes.push(rim);
      }
    }
    const label = makeLabelPlane(scene, `rack-label-${containerId}`, def.icon, def.nameAr, '#fffef2', { w: 0.3, h: 0.14 });
    label.parent = group;
    label.position.set(0, 0.02, -0.15);
    label.rotation.x = -0.95;
    for (const m of meshes) {
      m.metadata = { pickAction: { type: 'container', id: containerId } satisfies PickAction };
      m.isPickable = true;
      outline(m, 0.012);
      outlined.push(m);
      pickables.push(m);
    }
    containerMeshes.set(containerId, { group, label });
  });

  // ---------- sauce bottles (right wing) ----------
  const rightWing = attach(MeshBuilder.CreateBox('right-wing', { width: 0.8, height: 0.1, depth: 1.6 }, scene), 0.018);
  rightWing.position.set(1.85, 1.04, 0.15);
  rightWing.material = toonMat(scene, C.woodDark);

  const sauceMeshes = new Map<SauceType, TransformNode>();
  SAUCE_IDS.forEach((sauceId, i) => {
    const def = SAUCES[sauceId];
    const group = new TransformNode(`sauce-${sauceId}`, scene);
    group.parent = root;
    group.position.set(1.85, 1.09, 0.62 - i * 0.42);
    const bottle = MeshBuilder.CreateCylinder(`sauce-bottle-${sauceId}`, { diameter: 0.18, height: 0.32, tessellation: 14 }, scene);
    bottle.parent = group;
    bottle.position.y = 0.16;
    bottle.material = toonMat(scene, def.color, { gloss: def.glossiness * 0.5 });
    outline(bottle, 0.012);
    outlined.push(bottle);
    const tip = MeshBuilder.CreateCylinder(`sauce-tip-${sauceId}`, { diameterBottom: 0.11, diameterTop: 0.03, height: 0.13, tessellation: 10 }, scene);
    tip.parent = group;
    tip.position.y = 0.38;
    tip.material = toonMat(scene, '#f2f2f2');
    const label = makeLabelPlane(scene, `sauce-label-${sauceId}`, def.icon, def.nameAr.replace('صوص ', ''), '#fff2f6', { w: 0.3, h: 0.14 });
    label.parent = group;
    label.position.set(0, 0.17, -0.1);
    bottle.metadata = { pickAction: { type: 'sauce', id: sauceId } satisfies PickAction };
    tip.metadata = bottle.metadata;
    pickables.push(bottle, tip);
    sauceMeshes.set(sauceId, group);
  });

  // ---------- topping jars (row nearest the player) ----------
  const toppingMeshes = new Map<ToppingType, TransformNode>();
  TOPPING_IDS.forEach((toppingId, i) => {
    const def = TOPPINGS[toppingId];
    const group = new TransformNode(`topping-${toppingId}`, scene);
    group.parent = root;
    group.position.set(-1.14 + i * 0.38, 1.09, -0.6);
    const jar = MeshBuilder.CreateCylinder(`jar-${toppingId}`, { diameterTop: 0.24, diameterBottom: 0.2, height: 0.16, tessellation: 14 }, scene);
    jar.parent = group;
    jar.position.y = 0.08;
    jar.material = toonMat(scene, '#f4f9fb', { gloss: 0.4, alpha: 0.95 });
    outline(jar, 0.012);
    outlined.push(jar);
    const fill = MeshBuilder.CreateCylinder(`jar-fill-${toppingId}`, { diameter: 0.21, height: 0.06, tessellation: 14 }, scene);
    fill.parent = group;
    fill.position.y = 0.13;
    fill.material = toonMat(scene, def.color, { gloss: 0.1 });
    const label = makeLabelPlane(scene, `jar-label-${toppingId}`, def.icon, def.nameAr.split(' ')[0], '#f4fff4', { w: 0.3, h: 0.14 });
    label.parent = group;
    label.position.set(0, 0.05, -0.13);
    label.rotation.x = -0.6;
    jar.metadata = { pickAction: { type: 'topping', id: toppingId } satisfies PickAction };
    fill.metadata = jar.metadata;
    pickables.push(jar, fill);
    toppingMeshes.set(toppingId, group);
  });

  // ---------- prep pedestal ----------
  const pedestal = attach(MeshBuilder.CreateCylinder('prep-pedestal', { diameter: 0.56, height: 0.06, tessellation: 24 }, scene), 0.016);
  pedestal.position.set(0, 1.12, -0.2);
  pedestal.material = toonMat(scene, '#ffd9e8', { gloss: 0.25 });
  const pedestalRim = attach(MeshBuilder.CreateTorus('prep-rim', { diameter: 0.56, thickness: 0.04, tessellation: 24 }, scene));
  pedestalRim.position.set(0, 1.14, -0.2);
  pedestalRim.material = toonMat(scene, C.gold);

  // ---------- delivery bell ----------
  const bellBase = attach(MeshBuilder.CreateCylinder('bell-base', { diameter: 0.26, height: 0.04 }, scene));
  bellBase.position.set(0.8, 1.11, -0.3);
  bellBase.material = toonMat(scene, '#8a8f98');
  const bell = attach(MeshBuilder.CreateSphere('bell', { diameter: 0.24, segments: 12, slice: 0.5 }, scene), 0.016);
  bell.position.set(0.8, 1.13, -0.3);
  bell.material = toonMat(scene, C.gold, { gloss: 0.6, emissiveBoost: 0.3 });
  const bellButton = attach(MeshBuilder.CreateCylinder('bell-button', { diameter: 0.06, height: 0.07 }, scene));
  bellButton.position.set(0.8, 1.22, -0.3);
  bellButton.material = toonMat(scene, '#5b5f66');
  bell.metadata = { pickAction: { type: 'bell' } satisfies PickAction };
  bellBase.metadata = bell.metadata;
  bellButton.metadata = bell.metadata;
  pickables.push(bell, bellBase, bellButton);
  const bellLabel = makeLabelPlane(scene, 'bell-label', '🔔', 'تسليم', '#fff8dc', { w: 0.32, h: 0.15 });
  bellLabel.parent = root;
  bellLabel.position.set(0.8, 1.1, -0.56);
  bellLabel.rotation.x = -1.15;

  // ---------- bin ----------
  const bin = attach(MeshBuilder.CreateCylinder('bin', { diameterTop: 0.24, diameterBottom: 0.19, height: 0.22, tessellation: 14 }, scene), 0.014);
  bin.position.set(-0.8, 1.2, -0.3);
  bin.material = toonMat(scene, '#9fb8c8', { gloss: 0.3 });
  bin.metadata = { pickAction: { type: 'bin' } satisfies PickAction };
  pickables.push(bin);
  const binLabel = makeLabelPlane(scene, 'bin-label', '🗑️', 'تفريغ', '#f0f4f8', { w: 0.32, h: 0.15 });
  binLabel.parent = root;
  binLabel.position.set(-0.8, 1.1, -0.56);
  binLabel.rotation.x = -1.15;

  // ---------- menu board hanging inside, facing the vendor ----------
  const menuBoard = attach(MeshBuilder.CreatePlane('menu-board', { width: 1.1, height: 0.7 }, scene));
  menuBoard.position.set(-2.15, 2.25, 0.75);
  menuBoard.rotation.y = -0.45;
  const menuMat = new StandardMaterial('menu-mat', scene);
  const menuTex = menuTexture(scene);
  menuMat.diffuseTexture = menuTex;
  menuMat.emissiveColor = new Color3(0.8, 0.8, 0.8);
  menuMat.specularColor = Color3.Black();
  menuMat.backFaceCulling = false;
  menuBoard.material = menuMat;
  menuBoard.isPickable = false;
  disposables.push(menuMat, menuTex);

  // ---------- scoop tool ----------
  const scoopTool = new TransformNode('scoop-tool', scene);
  scoopTool.parent = root;
  const scoopHead = MeshBuilder.CreateSphere('scoop-head', { diameter: 0.17, segments: 12, slice: 0.55 }, scene);
  scoopHead.parent = scoopTool;
  scoopHead.rotation.x = Math.PI;
  scoopHead.material = toonMat(scene, C.steel, { gloss: 0.7 });
  scoopHead.isPickable = false;
  const scoopHandle = MeshBuilder.CreateCylinder('scoop-handle', { diameter: 0.04, height: 0.3 }, scene);
  scoopHandle.parent = scoopTool;
  scoopHandle.position.set(0.02, 0.13, -0.1);
  scoopHandle.rotation.x = 0.9;
  scoopHandle.material = toonMat(scene, '#e05f7a');
  scoopHandle.isPickable = false;
  const scoopRestPosition = new Vector3(0.42, 1.18, -0.22);
  scoopTool.position.copyFrom(scoopRestPosition);

  const prepAnchor = new Vector3(0, 1.15, -0.2);
  const deliveryAnchor = new Vector3(0, 1.12, 1.0);

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
    for (const [id, parts] of containerMeshes) parts.group.setEnabled(level.allowedContainers.includes(id));
    for (const [id, group] of sauceMeshes) group.setEnabled(level.allowedSauces.includes(id));
    for (const [id, group] of toppingMeshes) group.setEnabled(level.allowedToppings.includes(id));
  }

  function setQuality(quality: QualityLevel): void {
    // outlines double the draw calls — drop them on low-end devices
    setOutlinesEnabled(outlined, quality !== 'low');
  }

  function update(elapsed: number): void {
    // festoon bulbs twinkle gently in sequence
    for (let i = 0; i < bulbs.length; i++) {
      const pulse = 0.75 + 0.25 * Math.sin(elapsed * 2.2 + i * 0.55);
      bulbs[i].scaling.setAll(pulse);
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
    setQuality,
    update,
    dispose() {
      for (const d of disposables) d.dispose();
      root.dispose(false, true);
    },
  };
}
