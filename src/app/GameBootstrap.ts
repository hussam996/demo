import { AbstractEngine, Engine, WebGPUEngine } from '@babylonjs/core';
import { GameApp } from './GameApp';

/** Creates a WebGPU engine when available, otherwise falls back to WebGL. */
export async function createEngine(canvas: HTMLCanvasElement): Promise<AbstractEngine> {
  const nav = navigator as Navigator & { gpu?: unknown };
  // the single-file/sandboxed build skips WebGPU: its shader toolchain may need
  // external fetches that a strict CSP blocks, and WebGL2 is universally stable
  const allowWebGPU = typeof __FORCE_WEBGL__ === 'undefined' ? true : !__FORCE_WEBGL__;
  if (nav.gpu && allowWebGPU) {
    try {
      const supported = await WebGPUEngine.IsSupportedAsync;
      if (supported) {
        const engine = new WebGPUEngine(canvas, { antialias: true });
        await engine.initAsync();
        return engine;
      }
    } catch {
      // fall through to WebGL
    }
  }
  return new Engine(canvas, true, { adaptToDeviceRatio: false, stencil: true });
}

export async function bootstrap(): Promise<GameApp> {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui-root') as HTMLElement;
  const engine = await createEngine(canvas);
  return new GameApp(engine, uiRoot);
}
