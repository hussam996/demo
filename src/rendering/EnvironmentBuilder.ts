import {
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  ShadowGenerator,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { toonMat } from './materials';
import type { QualityLevel } from '../core/SaveManager';

export interface EnvironmentHandles {
  root: TransformNode;
  shadowGenerator?: ShadowGenerator;
  update(elapsedSeconds: number): void;
  setQuality(quality: QualityLevel): void;
  dispose(): void;
}

/**
 * Cartoon beach: sand, animated sea (background only), sky, drifting clouds,
 * palms, boardwalk for the customer path, and distant props.
 * Customers walk the boardwalk along X at z≈3.1 — never through the sea (z>14).
 */
export function buildEnvironment(scene: Scene): EnvironmentHandles {
  const root = new TransformNode('env-root', scene);

  scene.clearColor = new Color4(0.49, 0.78, 0.89, 1);

  const ambient = new HemisphericLight('ambient', new Vector3(0.2, 1, -0.3), scene);
  ambient.intensity = 0.75;
  ambient.diffuse = new Color3(1, 0.98, 0.92);
  ambient.groundColor = new Color3(0.75, 0.68, 0.55);

  const sun = new DirectionalLight('sun', new Vector3(-0.35, -0.8, 0.45), scene);
  sun.position = new Vector3(6, 14, -8);
  sun.intensity = 0.85;
  sun.diffuse = new Color3(1, 0.95, 0.85);

  let shadowGenerator: ShadowGenerator | undefined = new ShadowGenerator(1024, sun);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 16;
  shadowGenerator.darkness = 0.55;

  // ---- sand ----
  const sand = MeshBuilder.CreateGround('sand', { width: 90, height: 40 }, scene);
  sand.parent = root;
  sand.position.z = 2;
  sand.material = toonMat(scene, '#f2dca8');
  sand.receiveShadows = true;

  // ---- sea (background only, beyond the sand) ----
  const sea = MeshBuilder.CreateGround('sea', { width: 120, height: 40 }, scene);
  sea.parent = root;
  sea.position.set(0, 0.05, 34);
  sea.material = toonMat(scene, '#3fa9d6', { gloss: 0.35, emissiveBoost: 0.25 });

  const seaFar = MeshBuilder.CreateGround('sea-far', { width: 160, height: 30 }, scene);
  seaFar.parent = root;
  seaFar.position.set(0, 0.02, 60);
  seaFar.material = toonMat(scene, '#2c86b5', { emissiveBoost: 0.3 });

  // gentle animated wave bands rolling toward the shore
  // each band gets its own material — alpha animates per band
  const waveBands: Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const band = MeshBuilder.CreateGround(`wave-${i}`, { width: 120, height: 0.8 }, scene);
    band.parent = root;
    band.position.set(0, 0.08, 16 + i * 4);
    const mat = toonMat(scene, '#e8f7fb', { emissiveBoost: 0.5 }).clone(`wave-mat-${i}`);
    mat.alpha = 0.85;
    band.material = mat;
    waveBands.push(band);
  }

  // ---- sky clouds (soft blobs drifting slowly) ----
  const clouds: TransformNode[] = [];
  for (let i = 0; i < 5; i++) {
    const cloud = new TransformNode(`cloud-${i}`, scene);
    cloud.parent = root;
    cloud.position.set(-30 + i * 14, 12 + (i % 3) * 2.2, 38 - (i % 2) * 6);
    const blobCount = 3 + (i % 2);
    for (let b = 0; b < blobCount; b++) {
      const blob = MeshBuilder.CreateSphere(`cloud-${i}-${b}`, { diameter: 3 - (b % 2), segments: 8 }, scene);
      blob.parent = cloud;
      blob.position.set(b * 1.6 - blobCount * 0.7, (b % 2) * 0.6, 0);
      blob.scaling.y = 0.55;
      blob.material = toonMat(scene, '#ffffff', { emissiveBoost: 0.55 });
      blob.isPickable = false;
    }
    clouds.push(cloud);
  }

  // ---- palms ----
  const palmPositions = [
    new Vector3(-7, 0, 6.5),
    new Vector3(-11, 0, 10),
    new Vector3(7.5, 0, 7),
    new Vector3(11, 0, 11),
    new Vector3(-16, 0, 7),
    new Vector3(16, 0, 8.5),
  ];
  for (let p = 0; p < palmPositions.length; p++) {
    const palm = new TransformNode(`palm-${p}`, scene);
    palm.parent = root;
    palm.position.copyFrom(palmPositions[p]);
    const lean = p % 2 === 0 ? 1 : -1;
    const segments = 5;
    // gentle quadratic curve so trunk segments stay connected
    const trunkX = (s: number) => lean * s * s * 0.035;
    for (let s = 0; s < segments; s++) {
      const seg = MeshBuilder.CreateCylinder(`palm-${p}-seg-${s}`, {
        diameterBottom: 0.38 - s * 0.045,
        diameterTop: 0.34 - s * 0.045,
        height: 0.9,
        tessellation: 10,
      }, scene);
      seg.parent = palm;
      seg.position.set(trunkX(s), 0.4 + s * 0.8, 0);
      seg.rotation.z = -lean * s * 0.055;
      seg.material = toonMat(scene, '#a9743f');
      seg.isPickable = false;
      shadowGenerator?.addShadowCaster(seg);
    }
    const crownX = trunkX(segments - 0.5);
    const crownY = 0.4 + segments * 0.8;
    for (let leaf = 0; leaf < 6; leaf++) {
      const angle = (leaf / 6) * Math.PI * 2;
      const blade = MeshBuilder.CreateSphere(`palm-${p}-leaf-${leaf}`, { diameter: 1, segments: 6 }, scene);
      blade.parent = palm;
      blade.scaling.set(1.9, 0.12, 0.55);
      blade.position.set(crownX + Math.cos(angle) * 0.95, crownY + 0.15 - Math.abs(Math.sin(angle)) * 0.05, Math.sin(angle) * 0.95);
      blade.rotation.y = -angle;
      blade.rotation.z = 0.32;
      blade.material = toonMat(scene, leaf % 2 === 0 ? '#5fb56a' : '#4da257');
      blade.isPickable = false;
      shadowGenerator?.addShadowCaster(blade);
    }
    const coco = MeshBuilder.CreateSphere(`palm-${p}-coco`, { diameter: 0.3, segments: 6 }, scene);
    coco.parent = palm;
    coco.position.set(crownX + 0.2, crownY - 0.1, 0.15);
    coco.material = toonMat(scene, '#7a5230');
    coco.isPickable = false;
  }

  // ---- boardwalk: the customer path along the front of the cart ----
  const walkway = new TransformNode('walkway', scene);
  walkway.parent = root;
  for (let i = 0; i < 34; i++) {
    const plank = MeshBuilder.CreateBox(`plank-${i}`, { width: 0.95, height: 0.07, depth: 1.7 }, scene);
    plank.parent = walkway;
    plank.position.set(-16.5 + i * 1.0, 0.035, 3.1);
    plank.material = toonMat(scene, i % 2 === 0 ? '#d8a35f' : '#cd9752');
    plank.receiveShadows = true;
    plank.isPickable = false;
  }

  // ---- distant beach props: umbrellas + chairs ----
  const props: Array<{ pos: Vector3; color: string }> = [
    { pos: new Vector3(-12, 0, 12.5), color: '#ff7e67' },
    { pos: new Vector3(-5, 0, 13), color: '#4dd0c4' },
    { pos: new Vector3(6, 0, 12.8), color: '#f7b32b' },
    { pos: new Vector3(13, 0, 12.2), color: '#8d6cc3' },
  ];
  for (let u = 0; u < props.length; u++) {
    const { pos, color } = props[u];
    const group = new TransformNode(`beach-umbrella-${u}`, scene);
    group.parent = root;
    group.position.copyFrom(pos);
    const pole = MeshBuilder.CreateCylinder(`bu-pole-${u}`, { diameter: 0.08, height: 2.2 }, scene);
    pole.parent = group;
    pole.position.y = 1.1;
    pole.rotation.z = 0.12;
    pole.material = toonMat(scene, '#e8ddc8');
    pole.isPickable = false;
    const top = MeshBuilder.CreateCylinder(`bu-top-${u}`, { diameterTop: 0.04, diameterBottom: 2.4, height: 0.7, tessellation: 12 }, scene);
    top.parent = group;
    top.position.set(0.25, 2.25, 0);
    top.material = toonMat(scene, color);
    top.isPickable = false;
    const chair = MeshBuilder.CreateBox(`bu-chair-${u}`, { width: 0.6, height: 0.18, depth: 1.4 }, scene);
    chair.parent = group;
    chair.position.set(0.9, 0.12, 0.3);
    chair.rotation.x = -0.18;
    chair.material = toonMat(scene, '#fff6e8');
    chair.isPickable = false;
  }

  // ---- seagulls: simple V shapes gliding in circles ----
  const gulls: TransformNode[] = [];
  for (let g = 0; g < 3; g++) {
    const gull = new TransformNode(`gull-${g}`, scene);
    gull.parent = root;
    for (const side of [-1, 1]) {
      const wing = MeshBuilder.CreateBox(`gull-${g}-wing-${side}`, { width: 0.5, height: 0.03, depth: 0.14 }, scene);
      wing.parent = gull;
      wing.position.x = side * 0.24;
      wing.rotation.z = side * 0.35;
      wing.material = toonMat(scene, '#ffffff', { emissiveBoost: 0.4 });
      wing.isPickable = false;
    }
    gulls.push(gull);
  }

  let quality: QualityLevel = 'medium';

  function update(elapsed: number): void {
    // waves roll softly toward the shore
    for (let i = 0; i < waveBands.length; i++) {
      const phase = (elapsed * 0.25 + i / waveBands.length) % 1;
      waveBands[i].position.z = 20 - phase * 5.5;
      const mat = waveBands[i].material;
      if (mat) mat.alpha = 0.85 * Math.sin(Math.PI * phase);
    }
    sea.position.y = 0.05 + Math.sin(elapsed * 0.8) * 0.03;

    for (let i = 0; i < clouds.length; i++) {
      clouds[i].position.x += 0.15 * 0.016;
      if (clouds[i].position.x > 40) clouds[i].position.x = -40;
    }

    for (let g = 0; g < gulls.length; g++) {
      const t = elapsed * 0.35 + (g * Math.PI * 2) / gulls.length;
      gulls[g].position.set(Math.cos(t) * (9 + g * 2), 8.5 + Math.sin(t * 2.1) * 0.7, 18 + Math.sin(t) * 5);
      gulls[g].rotation.y = -t + Math.PI / 2;
    }
  }

  function setQuality(next: QualityLevel): void {
    quality = next;
    const gullsVisible = quality !== 'low';
    for (const gull of gulls) gull.setEnabled(gullsVisible);
    for (const cloud of clouds) cloud.setEnabled(quality !== 'low');
    if (shadowGenerator) {
      if (quality === 'low') {
        shadowGenerator.getShadowMap()?.dispose();
        shadowGenerator.dispose();
        shadowGenerator = undefined;
      } else {
        shadowGenerator.blurKernel = quality === 'high' ? 32 : 16;
      }
    }
  }

  return {
    root,
    get shadowGenerator() {
      return shadowGenerator;
    },
    update,
    setQuality,
    dispose() {
      shadowGenerator?.dispose();
      sun.dispose();
      ambient.dispose();
      root.dispose(false, true);
    },
  } as EnvironmentHandles;
}
