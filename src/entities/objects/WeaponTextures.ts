import Phaser from 'phaser';
import { createSheetTextures, type SheetRegion } from './TextureUtils';

/**
 * Runtime slicing for the pickable-weapons sheet.
 *
 * The generated sheet mixes three kinds of art: ground props, square HUD icon
 * cards on a blue background and small glass shards. The crops below were
 * measured on the source image and keep each silhouette at its natural aspect
 * ratio so a dropped pipe still looks like a pipe at 480x270.
 */

export const WEAPONS_SHEET_KEY = 'weapons-sheet';

export const WEAPON_PIPE_TEXTURE = 'weapon-pipe';
export const WEAPON_BOTTLE_TEXTURE = 'weapon-bottle';
export const WEAPON_BAT_TEXTURE = 'weapon-bat';

export const ICON_PIPE_TEXTURE = 'icon-pipe';
export const ICON_BOTTLE_TEXTURE = 'icon-bottle';
export const ICON_BAT_TEXTURE = 'icon-bat';

export const GLASS_SHARD_TEXTURE = 'fx-glass-shard';

/** Square size of the HUD icon textures. The panel draws them slightly smaller. */
export const WEAPON_ICON_TEXTURE_SIZE = 16;

const REGIONS: readonly SheetRegion[] = [
  // Iron pipe with fixed couplings, lying horizontally.
  { key: WEAPON_PIPE_TEXTURE, x: 33, y: 927, width: 167, height: 53, outWidth: 26 },
  // Green glass bottle resting diagonally.
  { key: WEAPON_BOTTLE_TEXTURE, x: 258, y: 238, width: 98, height: 123, outWidth: 11 },
  // Long wooden baseball bat, already horizontal.
  { key: WEAPON_BAT_TEXTURE, x: 29, y: 655, width: 424, height: 61, outWidth: 32 },
  // Single glass sliver used for the bottle impact burst.
  { key: GLASS_SHARD_TEXTURE, x: 309, y: 443, width: 37, height: 38, outWidth: 8 },
  // Icon cards: blue background and pale frame keyed out to transparency.
  {
    key: ICON_PIPE_TEXTURE,
    x: 842,
    y: 42,
    width: 120,
    height: 120,
    outWidth: WEAPON_ICON_TEXTURE_SIZE,
    outHeight: WEAPON_ICON_TEXTURE_SIZE,
    keyBlue: true
  },
  {
    key: ICON_BAT_TEXTURE,
    x: 485,
    y: 600,
    width: 143,
    height: 139,
    outWidth: WEAPON_ICON_TEXTURE_SIZE,
    outHeight: WEAPON_ICON_TEXTURE_SIZE,
    keyBlue: true
  },
  {
    key: ICON_BOTTLE_TEXTURE,
    x: 506,
    y: 787,
    width: 143,
    height: 138,
    outWidth: WEAPON_ICON_TEXTURE_SIZE,
    outHeight: WEAPON_ICON_TEXTURE_SIZE,
    keyBlue: true
  }
];

/**
 * Slices every weapon, icon and glass-shard texture. Safe to call on scene
 * restarts: existing textures are left untouched.
 */
export function createWeaponTextures(scene: Phaser.Scene): void {
  createSheetTextures(scene, WEAPONS_SHEET_KEY, REGIONS);
}
