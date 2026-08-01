import { Color3, Scene, StandardMaterial } from '@babylonjs/core';

const sceneCaches = new WeakMap<Scene, Map<string, StandardMaterial>>();

/** Flat cartoon material: bright diffuse, soft specular. Cached per scene+color. */
export function toonMat(
  scene: Scene,
  hex: string,
  options: { gloss?: number; emissiveBoost?: number; alpha?: number } = {}
): StandardMaterial {
  let cache = sceneCaches.get(scene);
  if (!cache) {
    cache = new Map();
    sceneCaches.set(scene, cache);
  }
  const key = `${hex}-${options.gloss ?? 0}-${options.emissiveBoost ?? 0}-${options.alpha ?? 1}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const mat = new StandardMaterial(`toon-${hex}`, scene);
  const color = Color3.FromHexString(hex);
  mat.diffuseColor = color;
  mat.specularColor = new Color3(1, 1, 1).scale(options.gloss ?? 0.05);
  mat.specularPower = 32;
  mat.emissiveColor = color.scale(options.emissiveBoost ?? 0.1);
  if (options.alpha !== undefined) mat.alpha = options.alpha;
  cache.set(key, mat);
  return mat;
}
