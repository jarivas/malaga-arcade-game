import Phaser from 'phaser';

/**
 * One crop of an AI-generated sprite sheet, expressed in source pixels.
 *
 * The AI sheets use flat chroma-key backgrounds (normally magenta, sometimes
 * blue for icon tiles). A crop is keyed at full resolution, then reduced with
 * a box filter so the tiny in-game texture keeps the original aspect ratio.
 */
export interface SheetRegion {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Target size in game pixels. One of the two is derived from the aspect. */
  outWidth?: number;
  outHeight?: number;
  /** Key the flat blue background used by the weapon icon tiles as well. */
  keyBlue?: boolean;
}

function targetSize(region: SheetRegion): { width: number; height: number } {
  const { width, height, outWidth, outHeight } = region;

  if (outWidth !== undefined && outHeight !== undefined) {
    return { width: outWidth, height: outHeight };
  }

  if (outWidth !== undefined) {
    return { width: outWidth, height: Math.max(1, Math.round((height * outWidth) / width)) };
  }

  if (outHeight !== undefined) {
    return { width: Math.max(1, Math.round((width * outHeight) / height)), height: outHeight };
  }

  return { width, height };
}

/**
 * Removes the magenta chroma key, including the soft halo the generator left
 * around silhouettes. Only pixels where both red and blue are bright are
 * considered magenta, so red weapons and golden details are never keyed out.
 */
function keyMagenta(context: CanvasRenderingContext2D, width: number, height: number): void {
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;

  for (let i = 0; i < data.length; i += 4) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];

    if (red < 110 || blue < 110) {
      continue;
    }

    const score = Math.min(red, blue) - green;

    if (score > 40) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      continue;
    }

    if (score > 14) {
      // Semi-transparent fringe pixel: fade it and pull the surviving colour
      // away from magenta so no pink halo shows against the asphalt.
      data[i + 3] = Math.round(255 * (1 - (score - 14) / 26));
      data[i] = Math.min(red, green + 96);
      data[i + 2] = Math.min(blue, green + 96);
    }
  }

  context.putImageData(image, 0, 0);
}

/**
 * Some generated tiles place the subject on a flat blue card instead of the
 * magenta key. The weapon itself is white/grey, so a strong blue dominance is
 * enough to remove the card and its frame without eating the artwork.
 */
function keyBlue(context: CanvasRenderingContext2D, width: number, height: number): void {
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;

  for (let i = 0; i < data.length; i += 4) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];

    if (blue > 85 && blue - red > 45 && blue - green > 38) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }

  context.putImageData(image, 0, 0);
}

/**
 * Box-filter downscale built from successive halvings. A single nearest
 * sample from the high-resolution AI illustration produces speckled noise;
 * halving with smoothing keeps coherent colours before the final resize.
 */
function downscale(
  source: HTMLCanvasElement,
  outWidth: number,
  outHeight: number
): HTMLCanvasElement {
  let current = source;

  while (current.width / 2 >= outWidth && current.height / 2 >= outHeight) {
    const next = document.createElement('canvas');
    next.width = Math.max(1, Math.round(current.width / 2));
    next.height = Math.max(1, Math.round(current.height / 2));

    const context = next.getContext('2d');
    if (!context) {
      throw new Error('No 2D context available while downscaling a sheet texture');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(current, 0, 0, current.width, current.height, 0, 0, next.width, next.height);
    current = next;
  }

  if (current.width === outWidth && current.height === outHeight) {
    return current;
  }

  const output = document.createElement('canvas');
  output.width = outWidth;
  output.height = outHeight;

  const context = output.getContext('2d');
  if (!context) {
    throw new Error('No 2D context available while sizing a sheet texture');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(current, 0, 0, current.width, current.height, 0, 0, outWidth, outHeight);
  return output;
}

function sliceRegion(scene: Phaser.Scene, source: CanvasImageSource, region: SheetRegion): void {
  if (scene.textures.exists(region.key)) {
    return;
  }

  // Key at full resolution first: scaling first would blend the chroma key into
  // the silhouette and leave a coloured border after the alpha is removed.
  const scratch = document.createElement('canvas');
  scratch.width = region.width;
  scratch.height = region.height;

  const scratchContext = scratch.getContext('2d');
  if (!scratchContext) {
    throw new Error(`No 2D context available while slicing ${region.key}`);
  }

  scratchContext.drawImage(
    source,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height
  );
  keyMagenta(scratchContext, region.width, region.height);

  if (region.keyBlue) {
    keyBlue(scratchContext, region.width, region.height);
  }

  const size = targetSize(region);
  const texture = scene.textures.createCanvas(region.key, size.width, size.height);
  if (!texture) {
    throw new Error(`Could not create canvas texture ${region.key}`);
  }

  const scaled = downscale(scratch, size.width, size.height);
  const context = texture.getContext();
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, size.width, size.height);
  context.drawImage(scaled, 0, 0);
  texture.refresh();
}

function keyedCrop(
  source: CanvasImageSource,
  region: SheetRegion
): HTMLCanvasElement {
  // Key at full resolution first: scaling first would blend the chroma key into
  // the silhouette and leave a coloured border after the alpha is removed.
  const scratch = document.createElement('canvas');
  scratch.width = region.width;
  scratch.height = region.height;

  const scratchContext = scratch.getContext('2d');
  if (!scratchContext) {
    throw new Error(`No 2D context available while slicing ${region.key}`);
  }

  scratchContext.drawImage(
    source,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height
  );
  keyMagenta(scratchContext, region.width, region.height);

  if (region.keyBlue) {
    keyBlue(scratchContext, region.width, region.height);
  }

  return scratch;
}

export interface RotationSheetConfig {
  /** Key of the spritesheet texture that will be created. */
  key: string;
  /** Square frame size baked into the spritesheet. */
  frameWidth: number;
  frameHeight: number;
  /** Longest side of the artwork inside a frame, in game pixels. */
  contentSize: number;
  /** Ordered rotation frames, from the same source sheet. */
  regions: readonly SheetRegion[];
}

/**
 * Packs several keyed crops into a uniform spritesheet. Every crop is scaled by
 * the same factor and centred in its frame, so playing the frames back as an
 * animation spins the object around a stable centre.
 *
 * Used for the bottle/knife projectile rotation frames.
 */
export function createRotationSheet(
  scene: Phaser.Scene,
  sheetKey: string,
  config: RotationSheetConfig
): void {
  if (scene.textures.exists(config.key)) {
    return;
  }

  if (!scene.textures.exists(sheetKey)) {
    throw new Error(
      `Texture "${sheetKey}" is missing. Load it in preload() before slicing it.`
    );
  }

  if (config.regions.length === 0) {
    throw new Error(`No rotation regions supplied for ${config.key}`);
  }

  const source = scene.textures.get(sheetKey).getSourceImage() as CanvasImageSource;
  const longestSide = Math.max(
    ...config.regions.map((region) => Math.max(region.width, region.height))
  );
  const scale = config.contentSize / longestSide;

  const output = document.createElement('canvas');
  output.width = config.frameWidth * config.regions.length;
  output.height = config.frameHeight;

  const context = output.getContext('2d');
  if (!context) {
    throw new Error(`No 2D context available while building ${config.key}`);
  }

  config.regions.forEach((region, index) => {
    const crop = keyedCrop(source, region);
    const width = Math.max(1, Math.round(region.width * scale));
    const height = Math.max(1, Math.round(region.height * scale));
    const scaled = downscale(crop, width, height);

    const x = index * config.frameWidth + Math.round((config.frameWidth - width) / 2);
    const y = Math.round((config.frameHeight - height) / 2);

    context.imageSmoothingEnabled = false;
    context.drawImage(scaled, x, y);
  });

  scene.textures.addSpriteSheet(
    config.key,
    output as unknown as HTMLImageElement,
    {
      frameWidth: config.frameWidth,
      frameHeight: config.frameHeight
    }
  );
}

/**
 * Bakes every region of a loaded sheet into its own canvas texture. Safe to
 * call on scene restarts: existing textures are left untouched.
 */
export function createSheetTextures(
  scene: Phaser.Scene,
  sheetKey: string,
  regions: readonly SheetRegion[]
): void {
  if (!scene.textures.exists(sheetKey)) {
    throw new Error(
      `Texture "${sheetKey}" is missing. Load it in preload() before slicing it.`
    );
  }

  const source = scene.textures.get(sheetKey).getSourceImage() as CanvasImageSource;

  for (const region of regions) {
    sliceRegion(scene, source, region);
  }
}
