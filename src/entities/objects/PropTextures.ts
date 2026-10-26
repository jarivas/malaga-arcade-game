import Phaser from 'phaser';
import { createSheetTextures, type SheetRegion } from './TextureUtils';

/**
 * Runtime slicing for the props/pickups sprite sheet.
 *
 * `assets/sprites/props_pickups.png` is a 1024x1024 AI-generated sheet on a
 * flat magenta chroma key. Instead of shipping hand-painted procedural art we
 * crop the regions once per scene, key the magenta out and bake small canvas
 * textures at the sizes the gameplay code expects.
 *
 * Coordinates are the tight bounding boxes measured on the source sheet. Each
 * crop keeps its aspect ratio and is reduced with a box filter so the shrunk
 * illustration stays readable at 480x270.
 */

export const PROP_SHEET_KEY = 'props-pickups';

export const BREAKABLE_BIN_TEXTURE = 'prop-bin';
export const BREAKABLE_CRATE_TEXTURE = 'prop-crate';
export const PICKUP_CAMPERO_TEXTURE = 'item-campero';
export const PICKUP_REFRESCO_TEXTURE = 'item-soda';
export const PICKUP_DINERO_TEXTURE = 'item-money';
export const DEBRIS_WOOD_TEXTURE = 'fx-debris-wood';
export const DEBRIS_METAL_TEXTURE = 'fx-debris-metal';

const REGIONS: readonly SheetRegion[] = [
  // Green wheeled dumpster: keep the 236:317 silhouette, 32 px tall.
  { key: BREAKABLE_BIN_TEXTURE, x: 34, y: 26, width: 236, height: 317, outHeight: 32 },
  // Wooden crate with diagonal brace.
  { key: BREAKABLE_CRATE_TEXTURE, x: 311, y: 30, width: 269, height: 313, outHeight: 26 },
  // Toasted "campero" sandwich (replaces the old hamburger).
  { key: PICKUP_CAMPERO_TEXTURE, x: 27, y: 774, width: 273, height: 208, outWidth: 18 },
  // Red soda can.
  { key: PICKUP_REFRESCO_TEXTURE, x: 334, y: 774, width: 106, height: 208, outHeight: 15 },
  // Green money bag with a pale currency mark.
  { key: PICKUP_DINERO_TEXTURE, x: 599, y: 771, width: 215, height: 218, outWidth: 16 },
  // Single splinter / scrap chunk cut from the debris illustrations.
  { key: DEBRIS_WOOD_TEXTURE, x: 719, y: 604, width: 64, height: 64, outWidth: 8 },
  { key: DEBRIS_METAL_TEXTURE, x: 815, y: 583, width: 64, height: 64, outWidth: 8 }
];

/**
 * Slices every prop, pickup and debris texture from the sheet. Safe to call on
 * scene restarts: existing textures are left untouched.
 */
export function createPropTextures(scene: Phaser.Scene): void {
  createSheetTextures(scene, PROP_SHEET_KEY, REGIONS);
}
