import Phaser from 'phaser';
import {
  createRotationSheet,
  createSheetTextures,
  type SheetRegion
} from './TextureUtils';

/**
 * Runtime slicing for the pickable-weapons sheet.
 *
 * The generated sheet mixes ground props, square HUD icon cards on a blue
 * background, glass shards and rotation frames for the thrown bottle and
 * knife. The crops below were measured on the source image; each silhouette
 * keeps its natural aspect ratio at 480x270.
 */

export const WEAPONS_SHEET_KEY = 'weapons-sheet';

export const WEAPON_PIPE_TEXTURE = 'weapon-pipe';
export const WEAPON_BOTTLE_TEXTURE = 'weapon-bottle';
export const WEAPON_BAT_TEXTURE = 'weapon-bat';
export const WEAPON_KNIFE_TEXTURE = 'weapon-knife';

export const ICON_PIPE_TEXTURE = 'icon-pipe';
export const ICON_BOTTLE_TEXTURE = 'icon-bottle';
export const ICON_BAT_TEXTURE = 'icon-bat';
export const ICON_KNIFE_TEXTURE = 'icon-knife';

export const GLASS_SHARD_TEXTURE = 'fx-glass-shard';
export const METAL_SPARK_TEXTURE = 'fx-metal-spark';

/** Spinning projectile sheets, four rotation poses each; animations use two. */
export const PROJECTILE_BOTTLE_TEXTURE = 'projectile-bottle';
export const PROJECTILE_KNIFE_TEXTURE = 'projectile-knife';

export const PROJECTILE_BOTTLE_FRAME_SIZE = 16;
export const PROJECTILE_KNIFE_FRAME_SIZE = 20;

/** Square size of the HUD icon textures. The panel draws them slightly smaller. */
export const WEAPON_ICON_TEXTURE_SIZE = 16;

const REGIONS: readonly SheetRegion[] = [
  // Ground pickups: the leftmost object of each row in the sheet.
  // Row 0 = knife, row 1 = bottle, row 2 = bat, row 3 = pipe.
  { key: WEAPON_PIPE_TEXTURE, x: 30, y: 926, width: 172, height: 56, outWidth: 44 },
  { key: WEAPON_BOTTLE_TEXTURE, x: 30, y: 314, width: 92, height: 182, outHeight: 24 },
  { key: WEAPON_BAT_TEXTURE, x: 28, y: 654, width: 426, height: 63, outWidth: 44 },
  { key: WEAPON_KNIFE_TEXTURE, x: 19, y: 150, width: 230, height: 35, outWidth: 44 },
  // Single glass sliver used for the bottle impact burst.
  { key: GLASS_SHARD_TEXTURE, x: 309, y: 443, width: 37, height: 38, outWidth: 8 },
  // Icon cards: blue background and pale frame keyed out to transparency.
  {
    key: ICON_PIPE_TEXTURE,
    x: 494,
    y: 776,
    width: 166,
    height: 161,
    outWidth: WEAPON_ICON_TEXTURE_SIZE,
    outHeight: WEAPON_ICON_TEXTURE_SIZE,
    keyBlue: true
  },
  {
    key: ICON_BOTTLE_TEXTURE,
    x: 831,
    y: 213,
    width: 143,
    height: 143,
    outWidth: WEAPON_ICON_TEXTURE_SIZE,
    outHeight: WEAPON_ICON_TEXTURE_SIZE,
    keyBlue: true
  },
  {
    key: ICON_BAT_TEXTURE,
    x: 473,
    y: 589,
    width: 167,
    height: 161,
    outWidth: WEAPON_ICON_TEXTURE_SIZE,
    outHeight: WEAPON_ICON_TEXTURE_SIZE,
    keyBlue: true
  },
  {
    key: ICON_KNIFE_TEXTURE,
    x: 831,
    y: 30,
    width: 143,
    height: 144,
    outWidth: WEAPON_ICON_TEXTURE_SIZE,
    outHeight: WEAPON_ICON_TEXTURE_SIZE,
    keyBlue: true
  }
];

const BOTTLE_ROTATION_REGIONS: readonly SheetRegion[] = [
  { key: 'bottle-rot-0', x: 259, y: 238, width: 97, height: 123 },
  { key: 'bottle-rot-1', x: 382, y: 243, width: 117, height: 102 },
  { key: 'bottle-rot-2', x: 527, y: 236, width: 91, height: 122 },
  { key: 'bottle-rot-3', x: 655, y: 244, width: 123, height: 96 }
];

const KNIFE_ROTATION_REGIONS: readonly SheetRegion[] = [
  { key: 'knife-rot-0', x: 285, y: 26, width: 29, height: 157 },
  { key: 'knife-rot-1', x: 357, y: 22, width: 104, height: 155 },
  { key: 'knife-rot-2', x: 512, y: 30, width: 138, height: 152 },
  { key: 'knife-rot-3', x: 686, y: 30, width: 94, height: 149 }
];

/**
 * Tiny procedural spark. Kept as a texture so the scene can spin and fade it
 * like every other particle.
 */
function createMetalSparkTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(METAL_SPARK_TEXTURE)) {
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 7;
  canvas.height = 3;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No 2D context available while creating the metal spark');
  }

  context.fillStyle = '#ff9a2a';
  context.fillRect(0, 0, 7, 3);
  context.fillStyle = '#fff3b0';
  context.fillRect(1, 1, 5, 1);

  scene.textures.addCanvas(METAL_SPARK_TEXTURE, canvas);
}

/**
 * Slices every weapon, icon, projectile sheet and particle texture. Safe to
 * call on scene restarts: existing textures are left untouched.
 */
export function createWeaponTextures(scene: Phaser.Scene): void {
  createSheetTextures(scene, WEAPONS_SHEET_KEY, REGIONS);

  createRotationSheet(scene, WEAPONS_SHEET_KEY, {
    key: PROJECTILE_BOTTLE_TEXTURE,
    frameWidth: PROJECTILE_BOTTLE_FRAME_SIZE,
    frameHeight: PROJECTILE_BOTTLE_FRAME_SIZE,
    contentSize: 12,
    regions: BOTTLE_ROTATION_REGIONS
  });

  createRotationSheet(scene, WEAPONS_SHEET_KEY, {
    key: PROJECTILE_KNIFE_TEXTURE,
    frameWidth: PROJECTILE_KNIFE_FRAME_SIZE,
    frameHeight: PROJECTILE_KNIFE_FRAME_SIZE,
    contentSize: 16,
    regions: KNIFE_ROTATION_REGIONS
  });

  createMetalSparkTexture(scene);
}
