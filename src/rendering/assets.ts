import charFemaleA from '../../assets/models/kenney-mini-characters/character-female-a.glb?url';
import charFemaleB from '../../assets/models/kenney-mini-characters/character-female-b.glb?url';
import charFemaleF from '../../assets/models/kenney-mini-characters/character-female-f.glb?url';
import charMaleA from '../../assets/models/kenney-mini-characters/character-male-a.glb?url';
import charMaleB from '../../assets/models/kenney-mini-characters/character-male-b.glb?url';
import charMaleF from '../../assets/models/kenney-mini-characters/character-male-f.glb?url';

import potSmall from '../../assets/models/kenney-nature-kit/pot_small.glb?url';
import bushDetailed from '../../assets/models/kenney-nature-kit/plant_bushDetailed.glb?url';
import bushSmall from '../../assets/models/kenney-nature-kit/plant_bushSmall.glb?url';
import flowerRed from '../../assets/models/kenney-nature-kit/flower_redA.glb?url';
import flowerYellow from '../../assets/models/kenney-nature-kit/flower_yellowA.glb?url';

import barrel from '../../assets/models/kenney-survival-kit/barrel.glb?url';
import boxLarge from '../../assets/models/kenney-survival-kit/box-large.glb?url';

import lantern from '../../assets/models/kenney-fantasy-town-kit/lantern.glb?url';
import bannerRed from '../../assets/models/kenney-fantasy-town-kit/banner-red.glb?url';
import stallCounter from '../../assets/models/kenney-fantasy-town-kit/stall.glb?url';
import stallRed from '../../assets/models/kenney-fantasy-town-kit/stall-red.glb?url';
import stallGreen from '../../assets/models/kenney-fantasy-town-kit/stall-green.glb?url';
import stallBench from '../../assets/models/kenney-fantasy-town-kit/stall-bench.glb?url';
import stallStool from '../../assets/models/kenney-fantasy-town-kit/stall-stool.glb?url';

import iceCream from '../../assets/models/kenney-food-kit/ice-cream.glb?url';
import sundae from '../../assets/models/kenney-food-kit/sundae.glb?url';
import cupcake from '../../assets/models/kenney-food-kit/cupcake.glb?url';
import donutSprinkles from '../../assets/models/kenney-food-kit/donut-sprinkles.glb?url';

/**
 * CC0 model URLs (Kenney). Textures are embedded in each GLB by
 * tools/embed-glb-textures.mjs, so a single URL is fully self-contained —
 * which also lets the single-file build inline them as data URIs.
 */
export const CHARACTER_MODELS: readonly string[] = [
  charFemaleA,
  charFemaleB,
  charFemaleF,
  charMaleA,
  charMaleB,
  charMaleF,
];

export const PROP_MODELS = {
  potSmall,
  bushDetailed,
  bushSmall,
  flowerRed,
  flowerYellow,
  barrel,
  boxLarge,
  lantern,
  bannerRed,
  stallCounter,
  stallRed,
  stallGreen,
  stallBench,
  stallStool,
  iceCream,
  sundae,
  cupcake,
  donutSprinkles,
} as const;

/**
 * The Kenney market-stall counter piece is 0.366 model units tall, so this
 * scale puts its work surface at y = 1.098 — the height the interaction
 * anchors (tubs, pedestal, bell) are already calibrated to.
 */
export const STALL_COUNTER_SCALE = 3;

/**
 * Uniform scale that brings the Kenney mini-character rigs (~0.67-0.79 model
 * units tall) to roughly 1.6-1.8 world units. Bounding boxes of skinned meshes
 * report pre-skin bounds, so a measured height is unreliable — this constant
 * comes from rendering the rigs and measuring the result.
 */
export const CHARACTER_SCALE = 2.35;
/** approximate world height after CHARACTER_SCALE, for placing mood bubbles */
export const CHARACTER_TARGET_HEIGHT = 1.7;
