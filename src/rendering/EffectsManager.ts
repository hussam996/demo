import {
  Animation,
  Color4,
  Mesh,
  ParticleSystem,
  Scene,
  Texture,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { QualityLevel } from '../core/SaveManager';

/** small round particle texture generated in-memory (no external asset) */
function makeParticleTexture(scene: Scene): Texture {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new Texture(canvas.toDataURL(), scene);
  return tex;
}

export class EffectsManager {
  private particleTexture: Texture;
  private quality: QualityLevel = 'medium';

  constructor(private scene: Scene) {
    this.particleTexture = makeParticleTexture(scene);
  }

  setQuality(quality: QualityLevel): void {
    this.quality = quality;
  }

  private particleBudget(base: number): number {
    return this.quality === 'high' ? base : this.quality === 'medium' ? base * 0.6 : base * 0.25;
  }

  /** confetti-like burst for happy customers / perfect orders */
  celebrationBurst(position: Vector3, colors: Color4[] = defaultCelebration): void {
    const count = Math.round(this.particleBudget(40));
    if (count === 0) return;
    const ps = new ParticleSystem('celebrate', count, this.scene);
    ps.particleTexture = this.particleTexture;
    ps.emitter = position.clone();
    ps.minEmitBox = new Vector3(-0.15, 0, -0.15);
    ps.maxEmitBox = new Vector3(0.15, 0.2, 0.15);
    ps.color1 = colors[0];
    ps.color2 = colors[1 % colors.length];
    ps.colorDead = new Color4(1, 1, 1, 0);
    ps.minSize = 0.05;
    ps.maxSize = 0.14;
    ps.minLifeTime = 0.4;
    ps.maxLifeTime = 0.9;
    ps.emitRate = 200;
    ps.direction1 = new Vector3(-1, 2.5, -1);
    ps.direction2 = new Vector3(1, 3.5, 1);
    ps.gravity = new Vector3(0, -6, 0);
    ps.targetStopDuration = 0.25;
    ps.disposeOnStop = true;
    ps.start();
  }

  /** small dark puff for anger */
  angerCloud(position: Vector3): void {
    const count = Math.round(this.particleBudget(20));
    if (count === 0) return;
    const ps = new ParticleSystem('anger', count, this.scene);
    ps.particleTexture = this.particleTexture;
    ps.emitter = position.add(new Vector3(0, 0.3, 0));
    ps.color1 = new Color4(0.4, 0.35, 0.4, 0.8);
    ps.color2 = new Color4(0.6, 0.25, 0.25, 0.8);
    ps.colorDead = new Color4(0.5, 0.5, 0.5, 0);
    ps.minSize = 0.1;
    ps.maxSize = 0.25;
    ps.minLifeTime = 0.35;
    ps.maxLifeTime = 0.7;
    ps.emitRate = 60;
    ps.direction1 = new Vector3(-0.5, 1, -0.5);
    ps.direction2 = new Vector3(0.5, 1.6, 0.5);
    ps.targetStopDuration = 0.3;
    ps.disposeOnStop = true;
    ps.start();
  }

  /** tiny splash when a scoop lands */
  scoopPuff(position: Vector3, color: Color4): void {
    const count = Math.round(this.particleBudget(14));
    if (count === 0) return;
    const ps = new ParticleSystem('scoop-puff', count, this.scene);
    ps.particleTexture = this.particleTexture;
    ps.emitter = position.clone();
    ps.color1 = color;
    ps.color2 = new Color4(1, 1, 1, 0.9);
    ps.colorDead = new Color4(1, 1, 1, 0);
    ps.minSize = 0.03;
    ps.maxSize = 0.08;
    ps.minLifeTime = 0.15;
    ps.maxLifeTime = 0.35;
    ps.emitRate = 120;
    ps.direction1 = new Vector3(-0.8, 0.6, -0.8);
    ps.direction2 = new Vector3(0.8, 1.2, 0.8);
    ps.gravity = new Vector3(0, -4, 0);
    ps.targetStopDuration = 0.12;
    ps.disposeOnStop = true;
    ps.start();
  }

  /** quick shake of the bell mesh */
  ringBell(bell: Mesh | TransformNode): void {
    const frames = 20;
    const anim = new Animation('bell-shake', 'rotation.z', 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
    anim.setKeys([
      { frame: 0, value: 0 },
      { frame: 4, value: 0.18 },
      { frame: 9, value: -0.15 },
      { frame: 14, value: 0.08 },
      { frame: frames, value: 0 },
    ]);
    bell.animations = [anim];
    this.scene.beginAnimation(bell, 0, frames, false);
  }

  dispose(): void {
    this.particleTexture.dispose();
  }
}

const defaultCelebration = [
  new Color4(1, 0.75, 0.35, 1),
  new Color4(0.55, 0.85, 1, 1),
];
