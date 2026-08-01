import {
  AnimationGroup,
  AssetContainer,
  Mesh,
  Scene,
  SceneLoader,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

export interface ModelTemplate {
  container: AssetContainer;
  /** un-scaled height of the model in model units */
  height: number;
}

export interface ModelInstance {
  root: TransformNode;
  animations: Map<string, AnimationGroup>;
  dispose(): void;
}

const cache = new Map<string, Promise<ModelTemplate | undefined>>();

/**
 * Loads a self-contained GLB into an AssetContainer once per scene.
 * AssetContainer is what allows correct duplication of skinned meshes with
 * their own skeleton and animation groups. Returns undefined on failure so
 * callers can fall back to procedural geometry rather than break the level.
 */
export async function loadModel(scene: Scene, url: string): Promise<ModelTemplate | undefined> {
  const key = `${scene.uid}:${url}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<ModelTemplate | undefined> => {
    try {
      const container = await SceneLoader.LoadAssetContainerAsync('', url, scene, undefined, '.glb');
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (const mesh of container.meshes) {
        const info = mesh.getBoundingInfo?.();
        if (!info) continue;
        min = Math.min(min, info.boundingBox.minimum.y * (mesh.scaling.y || 1));
        max = Math.max(max, info.boundingBox.maximum.y * (mesh.scaling.y || 1));
      }
      const height = Number.isFinite(max - min) && max > min ? max - min : 1;
      return { container, height };
    } catch (err) {
      console.warn(`model failed to load (${url}):`, err);
      return undefined;
    }
  })();

  cache.set(key, promise);
  return promise;
}

/** creates an independent, animatable copy of a loaded model */
export function instantiate(template: ModelTemplate, name: string): ModelInstance {
  const entries = template.container.instantiateModelsToScene((n) => `${name}-${n}`, false, {
    doNotInstantiate: true,
  });
  const root = new TransformNode(name, template.container.scene);
  for (const node of entries.rootNodes) node.parent = root;
  for (const mesh of root.getChildMeshes()) mesh.isPickable = false;

  const animations = new Map<string, AnimationGroup>();
  for (const group of entries.animationGroups) {
    group.stop();
    // glTF groups come back prefixed with the instance name
    const base = group.name.replace(`${name}-`, '');
    animations.set(base, group);
  }

  return {
    root,
    animations,
    dispose() {
      for (const group of entries.animationGroups) group.dispose();
      entries.dispose();
      root.dispose(false, true);
    },
  };
}

/** places a static decorative prop instance under a parent node */
export function placeProp(
  template: ModelTemplate,
  parent: TransformNode,
  position: Vector3,
  options: { scale?: number; rotationY?: number; name?: string } = {}
): TransformNode {
  const scene = parent.getScene();
  const holder = new TransformNode(options.name ?? 'prop', scene);
  holder.parent = parent;
  holder.position.copyFrom(position);
  holder.scaling.setAll(options.scale ?? 1);
  holder.rotation.y = options.rotationY ?? 0;
  for (const mesh of template.container.meshes) {
    if (!(mesh instanceof Mesh) || mesh.getTotalVertices() === 0) continue;
    const clone = mesh.clone(`${holder.name}-part`, holder);
    if (!clone) continue;
    clone.position.copyFrom(mesh.position);
    clone.rotationQuaternion = mesh.rotationQuaternion?.clone() ?? null;
    clone.rotation.copyFrom(mesh.rotation);
    clone.scaling.copyFrom(mesh.scaling);
    clone.setEnabled(true);
    clone.isPickable = false;
  }
  return holder;
}

export function clearModelCache(scene: Scene): void {
  for (const key of [...cache.keys()]) {
    if (key.startsWith(`${scene.uid}:`)) cache.delete(key);
  }
}
