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

/** Spinning projectile sheets, four rotation frames each. */
export const PROJECTILE_BOTTLE_TEXTURE = 'projectile-bottle';
export const PROJECTILE_KNIFE_TEXTURE = 'projectile-knife';

export const PROJECTILE_BOTTLE_FRAME_SIZE = 16;
export const PROJECTILE_KNIFE_FRAME_SIZE = 20;

/** Square size of the HUD icon textures. The panel draws them slightly smaller. */
export const WEAPON_ICON_TEXTURE_SIZE = 16;

/** Ground footprint of the hand-drawn pipe and bat, in game pixels. */
const PIPE_GROUND_SIZE = { width: 34, height: 20 } as const;
const BAT_GROUND_SIZE = { width: 36, height: 22 } as const;

const REGIONS: readonly SheetRegion[] = [
  // Green glass bottle resting diagonally.
  { key: WEAPON_BOTTLE_TEXTURE, x: 258, y: 238, width: 98, height: 123, outWidth: 11 },
  // Steel knife: one of the rotation poses, dropped diagonally on the street.
  { key: WEAPON_KNIFE_TEXTURE, x: 512, y: 30, width: 138, height: 152, outWidth: 22 },
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

/** Rounded-rectangle path helper (roundRect is still missing in older TS libs). */
function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

/**
 * The sheet's photoreal pipe and bat collapse into a muddy 1-2 px line once
 * reduced to ground-pickup size. They are drawn instead: a diagonal pose with
 * a dark outline reads instantly over the busy asphalt.
 */
function createGroundWeaponTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  paint: (context: CanvasRenderingContext2D) => void
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const scale = 4;
  const art = document.createElement('canvas');
  art.width = width * scale;
  art.height = height * scale;

  const artContext = art.getContext('2d');
  if (!artContext) {
    throw new Error(`No 2D context available while drawing ${key}`);
  }

  artContext.scale(scale, scale);
  paint(artContext);

  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) {
    throw new Error(`Could not create canvas texture ${key}`);
  }

  const context = texture.getContext();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, width, height);
  context.drawImage(art, 0, 0, width, height);
  texture.refresh();
}

function paintPipe(context: CanvasRenderingContext2D): void {
  context.translate(PIPE_GROUND_SIZE.width / 2, PIPE_GROUND_SIZE.height / 2);
  // Barrel points to the upper right so the pipe reads as a diagonal object.
  context.rotate(-Math.PI / 7.5);

  const steel = context.createLinearGradient(0, -2.4, 0, 2.4);
  steel.addColorStop(0, '#f1f6fb');
  steel.addColorStop(0.35, '#c6d0db');
  steel.addColorStop(0.72, '#858f9b');
  steel.addColorStop(1, '#4a525d');

  roundedRectPath(context, -14, -2.4, 28, 4.8, 2.1);
  context.fillStyle = steel;
  context.fill();
  context.lineWidth = 0.9;
  context.strokeStyle = '#262b33';
  context.stroke();

  for (const couplingX of [-11.2, 11.2]) {
    roundedRectPath(context, couplingX - 1.5, -3.8, 3, 7.6, 1.2);
    const ring = context.createLinearGradient(0, -3.8, 0, 3.8);
    ring.addColorStop(0, '#e2eaf3');
    ring.addColorStop(0.45, '#8e99a6');
    ring.addColorStop(1, '#3b424c');
    context.fillStyle = ring;
    context.fill();
    context.lineWidth = 0.8;
    context.strokeStyle = '#232830';
    context.stroke();
  }

  // Hollow mouth at the right tip.
  context.beginPath();
  context.ellipse(14, 0, 0.9, 2, 0, 0, Math.PI * 2);
  context.fillStyle = '#2f353d';
  context.fill();
  context.lineWidth = 0.5;
  context.strokeStyle = '#7d8792';
  context.stroke();

  // Specular streak and a couple of rust flecks.
  context.beginPath();
  context.moveTo(-12.4, -1.5);
  context.lineTo(12.4, -1.5);
  context.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  context.lineWidth = 0.8;
  context.lineCap = 'round';
  context.stroke();

  context.fillStyle = 'rgba(150, 94, 48, 0.6)';
  context.fillRect(-9.4, -1.3, 1.2, 2.2);
  context.fillRect(6.4, 0.5, 1, 1.5);
}

function paintBat(context: CanvasRenderingContext2D): void {
  context.translate(BAT_GROUND_SIZE.width / 2, BAT_GROUND_SIZE.height / 2);
  // Handle bottom-left, barrel top-right.
  context.rotate(-Math.PI / 7.5);

  // Tapered barrel with a rounded tip.
  context.beginPath();
  context.moveTo(-15, -1.5);
  context.lineTo(-8, -1.75);
  context.lineTo(-2, -2.3);
  context.lineTo(5, -3.05);
  context.lineTo(12, -3.25);
  context.quadraticCurveTo(16.2, -2.9, 16.2, 0);
  context.quadraticCurveTo(16.2, 2.9, 12, 3.25);
  context.lineTo(5, 3.05);
  context.lineTo(-2, 2.3);
  context.lineTo(-8, 1.75);
  context.lineTo(-15, 1.5);
  context.closePath();

  const wood = context.createLinearGradient(0, -3.25, 0, 3.25);
  wood.addColorStop(0, '#eac08a');
  wood.addColorStop(0.45, '#c08a52');
  wood.addColorStop(1, '#744620');
  context.fillStyle = wood;
  context.fill();
  context.lineWidth = 0.9;
  context.strokeStyle = '#331d0e';
  context.stroke();

  // Knob and taped grip.
  context.beginPath();
  context.ellipse(-15.4, 0, 2.1, 2.5, 0, 0, Math.PI * 2);
  context.fillStyle = '#96612f';
  context.fill();
  context.lineWidth = 0.8;
  context.strokeStyle = '#331d0e';
  context.stroke();

  context.strokeStyle = 'rgba(58, 34, 14, 0.6)';
  context.lineWidth = 0.7;
  for (const gripX of [-13.6, -11.6, -9.6]) {
    context.beginPath();
    context.moveTo(gripX, -1.75);
    context.lineTo(gripX, 1.75);
    context.stroke();
  }

  // Grain lines and a soft highlight along the barrel.
  context.strokeStyle = 'rgba(92, 54, 22, 0.4)';
  context.lineWidth = 0.45;
  context.beginPath();
  context.moveTo(1, -0.9);
  context.lineTo(12, -1.1);
  context.moveTo(2, 1);
  context.lineTo(11.5, 1.3);
  context.stroke();

  context.beginPath();
  context.moveTo(-6, -1.9);
  context.lineTo(12, -2.6);
  context.strokeStyle = 'rgba(255, 236, 205, 0.5)';
  context.lineWidth = 0.55;
  context.stroke();
}

/**
 * Slices every weapon, icon, projectile sheet and particle texture. Safe to
 * call on scene restarts: existing textures are left untouched.
 */
export function createWeaponTextures(scene: Phaser.Scene): void {
  createSheetTextures(scene, WEAPONS_SHEET_KEY, REGIONS);
  createGroundWeaponTexture(
    scene,
    WEAPON_PIPE_TEXTURE,
    PIPE_GROUND_SIZE.width,
    PIPE_GROUND_SIZE.height,
    paintPipe
  );
  createGroundWeaponTexture(
    scene,
    WEAPON_BAT_TEXTURE,
    BAT_GROUND_SIZE.width,
    BAT_GROUND_SIZE.height,
    paintBat
  );

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
