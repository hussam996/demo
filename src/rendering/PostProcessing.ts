import { Camera, Color4, DefaultRenderingPipeline, Scene } from '@babylonjs/core';
import type { QualityLevel } from '../core/SaveManager';

/**
 * Colour grading and post effects. Flat diffuse colours read as "programmer
 * art" until they are tone-mapped and bloomed: ACES tone mapping compresses
 * the bright cartoon palette into film-like rolloff, bloom adds the glow that
 * makes saturated colours feel lit rather than painted, and a slight vignette
 * plus sharpening focuses attention on the counter.
 */
export class ScenePost {
  private pipeline?: DefaultRenderingPipeline;

  constructor(
    private scene: Scene,
    private camera: Camera,
    quality: QualityLevel
  ) {
    this.apply(quality);
  }

  apply(quality: QualityLevel): void {
    this.dispose();
    if (quality === 'low') {
      // still grade the image — it is nearly free and does most of the work
      this.gradeOnly();
      return;
    }

    try {
      const pipeline = new DefaultRenderingPipeline('post', true, this.scene, [this.camera]);
      // MSAA inside a post pipeline is very expensive on weak GPUs;
      // FXAA gives most of the benefit for a fraction of the cost.
      pipeline.samples = 1;
      pipeline.fxaaEnabled = true;

      // only genuine highlights (festoon bulbs, sun on chrome) may bloom —
      // a low threshold turns a bright cartoon palette into milk
      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = 0.94;
      pipeline.bloomWeight = quality === 'high' ? 0.16 : 0.11;
      pipeline.bloomKernel = quality === 'high' ? 40 : 28;
      pipeline.bloomScale = 0.35;

      pipeline.imageProcessingEnabled = true;
      const ip = pipeline.imageProcessing;
      ip.toneMappingEnabled = false;
      ip.exposure = 1.0;
      ip.contrast = 1.1;
      ip.vignetteEnabled = true;
      ip.vignetteWeight = 1.1;
      ip.vignetteStretch = 0.6;
      ip.vignetteColor = new Color4(0.1, 0.06, 0.14, 0);
      ip.vignetteCameraFov = 1.3;

      if (quality === 'high') {
        pipeline.sharpenEnabled = true;
        pipeline.sharpen.edgeAmount = 0.22;
        pipeline.sharpen.colorAmount = 1;
      }
      this.pipeline = pipeline;
    } catch (err) {
      // post-processing is a nicety: never let it stop a level from running
      console.warn('post-processing unavailable:', err);
      this.gradeOnly();
    }
  }

  /** tone mapping + contrast without any render targets */
  private gradeOnly(): void {
    const ip = this.scene.imageProcessingConfiguration;
    ip.toneMappingEnabled = false;
    ip.exposure = 1.0;
    ip.contrast = 1.08;
  }

  dispose(): void {
    this.pipeline?.dispose();
    this.pipeline = undefined;
  }
}
