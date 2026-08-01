import { Color3, Mesh } from '@babylonjs/core';

/** warm near-black used for all cartoon outlines */
export const OUTLINE_COLOR = Color3.FromHexString('#2a2018');

/**
 * Thick dark outline around a mesh — the single strongest cue of the
 * hand-drawn cartoon look. Costs one extra draw call per mesh, so it is
 * applied to silhouette-defining shapes only, and skipped on low quality.
 */
export function outline(mesh: Mesh, width = 0.02): Mesh {
  mesh.renderOutline = true;
  mesh.outlineWidth = width;
  mesh.outlineColor = OUTLINE_COLOR;
  return mesh;
}

export function setOutlinesEnabled(meshes: Mesh[], enabled: boolean): void {
  for (const mesh of meshes) mesh.renderOutline = enabled;
}
