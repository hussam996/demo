import { test, expect, type Page } from '@playwright/test';

/**
 * E2E smoke suite: drives the real 3D scene through a full order.
 * Meshes are clicked by projecting their world position to screen space.
 */

interface DebugWindow {
  __icecreamDebug?: {
    debugSession?: {
      state: string;
      activeCustomer?: { id: string; order: { containerType: string; scoops: { flavor: string }[] } };
      prep: { current: { scoops: string[]; containerType?: string } };
      score: { score: number; coins: number; customersServed: number };
      queue?: { length: number; all?: Array<{ id: string }> };
      notifyCustomerArrived?: (id: string) => void;
    };
    debugScene?: { scene: unknown };
  };
}

const collectErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
};

/** click the screen-space projection of a named mesh in the Babylon scene */
async function clickMesh(page: Page, meshName: string): Promise<void> {
  const pos = await page.evaluate((name) => {
    const w = window as unknown as DebugWindow & {
      __icecreamDebug?: { debugScene?: { scene: any } };
    };
    const scene = w.__icecreamDebug?.debugScene?.scene;
    if (!scene) return null;
    const mesh = scene.getMeshByName(name);
    if (!mesh) return null;
    const engine = scene.getEngine();
    const BABYLON_Vector3 = mesh.getAbsolutePosition().constructor;
    const projected = BABYLON_Vector3.Project(
      mesh.getAbsolutePosition(),
      // identity world matrix — position is already absolute
      scene.getTransformMatrix().constructor.Identity(),
      scene.getTransformMatrix(),
      { x: 0, y: 0, width: engine.getRenderWidth(), height: engine.getRenderHeight() }
    );
    const scale = engine.getHardwareScalingLevel();
    return { x: projected.x * scale, y: projected.y * scale };
  }, meshName);
  expect(pos, `mesh ${meshName} should be projectable`).not.toBeNull();
  await page.mouse.click(pos!.x, pos!.y);
}

async function startLevelOne(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByText('ابدأ اللعب').click();
  await page.locator('[data-start="1"]').click();
  await page.getByText('ابدأ! 🍦').click();

  // Headless CI renders through a software rasteriser at a few FPS, so the
  // walk-to-window animation would dominate the run time. Signal the arrival
  // directly — the same hook the renderer calls — then assert the state
  // machine reacted.
  await page.waitForFunction(
    () => ((window as unknown as DebugWindow).__icecreamDebug?.debugSession?.queue?.length ?? 0) > 0,
    undefined,
    { timeout: 60_000 }
  );
  await page.evaluate(() => {
    const session = (window as unknown as DebugWindow).__icecreamDebug!.debugSession!;
    const front = session.queue!.all![0];
    if (front) session.notifyCustomerArrived!(front.id);
  });
  await page.waitForFunction(() => {
    const w = window as unknown as DebugWindow;
    return w.__icecreamDebug?.debugSession?.state === 'PreparingOrder';
  }, undefined, { timeout: 60_000 });
}

test('menu → level select → level start shows HUD without console errors', async ({ page }) => {
  const errors = collectErrors(page);
  await startLevelOne(page);
  await expect(page.locator('.hud-bar')).toBeVisible();
  await expect(page.locator('.order-card')).toBeVisible();
  expect(errors).toEqual([]);
});

test('full order flow: container → scoop → deliver earns score', async ({ page }) => {
  const errors = collectErrors(page);
  await startLevelOne(page);

  // read the active order to build it correctly
  const order = await page.evaluate(() => {
    const w = window as unknown as DebugWindow;
    return w.__icecreamDebug!.debugSession!.activeCustomer!.order;
  });

  const rackMesh = order.containerType.startsWith('cup')
    ? `rack-cup-${order.containerType}`
    : `rack-cone-${order.containerType}`;
  await clickMesh(page, rackMesh);
  await page.waitForFunction(() => {
    const w = window as unknown as DebugWindow;
    return !!w.__icecreamDebug?.debugSession?.prep.current.containerType;
  });

  for (const scoop of order.scoops) {
    const before = await page.evaluate(() => {
      const w = window as unknown as DebugWindow;
      return w.__icecreamDebug!.debugSession!.prep.current.scoops.length;
    });
    await clickMesh(page, `tub-surface-${scoop.flavor}`);
    await page.waitForFunction((count) => {
      const w = window as unknown as DebugWindow;
      return (w.__icecreamDebug?.debugSession?.prep.current.scoops.length ?? 0) > count;
    }, before, { timeout: 60_000 });
  }

  // the bell ignores clicks while the ladle animation is in flight — retry until served
  await expect
    .poll(
      async () => {
        await clickMesh(page, 'bell');
        return page.evaluate(() => {
          const w = window as unknown as DebugWindow;
          return w.__icecreamDebug?.debugSession?.score.customersServed ?? 0;
        });
      },
      { timeout: 90_000, intervals: [1500] }
    )
    .toBeGreaterThanOrEqual(1);

  const score = await page.evaluate(() => {
    const w = window as unknown as DebugWindow;
    return w.__icecreamDebug!.debugSession!.score.score;
  });
  expect(score).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('pause and resume keep the session intact', async ({ page }) => {
  const errors = collectErrors(page);
  await startLevelOne(page);
  await page.locator('[data-action="pause"]').click();
  await expect(page.getByText('⏸️ إيقاف مؤقت')).toBeVisible();
  await page.getByText('▶️ استكمال').click();
  await page.waitForFunction(() => {
    const w = window as unknown as DebugWindow;
    return w.__icecreamDebug?.debugSession?.state === 'PreparingOrder';
  });
  expect(errors).toEqual([]);
});

test('restarting the level several times does not error (leak smoke check)', async ({ page }) => {
  const errors = collectErrors(page);
  await startLevelOne(page);
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-action="pause"]').click();
    await page.getByText('🔄 إعادة المرحلة').click();
    await page.getByText('ابدأ! 🍦').click();
    await page.waitForFunction(() => {
      const w = window as unknown as DebugWindow;
      const state = w.__icecreamDebug?.debugSession?.state;
      return state === 'PreparingOrder' || state === 'WaitingForCustomer';
    }, undefined, { timeout: 60_000 });
  }
  expect(errors).toEqual([]);
});

test('responsive: portrait phone viewport keeps HUD and canvas usable', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await startLevelOne(page);
  await expect(page.locator('.hud-bar')).toBeVisible();
  await expect(page.locator('.order-card')).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('.hud-bar')).toBeVisible();
  expect(errors).toEqual([]);
});
