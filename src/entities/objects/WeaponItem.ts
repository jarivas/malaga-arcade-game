import Phaser from 'phaser';
import {
  ICON_BAT_TEXTURE,
  ICON_BOTTLE_TEXTURE,
  ICON_PIPE_TEXTURE,
  WEAPON_BAT_TEXTURE,
  WEAPON_BOTTLE_TEXTURE,
  WEAPON_PIPE_TEXTURE
} from './WeaponTextures';

export type WeaponKind = 'pipe' | 'bottle' | 'bat';

export interface WeaponDefinition {
  texture: string;
  iconTexture: string;
  label: string;
  /** Successful impacts before the weapon breaks. */
  uses: number;
  /** Damage dealt by a normal weapon swing. */
  damage: number;
  bodyWidth: number;
  bodyHeight: number;
}

export const WEAPON_DEFINITIONS: Record<WeaponKind, WeaponDefinition> = {
  pipe: {
    texture: WEAPON_PIPE_TEXTURE,
    iconTexture: ICON_PIPE_TEXTURE,
    label: 'TUBERÍA',
    uses: 5,
    damage: 30,
    bodyWidth: 24,
    bodyHeight: 10
  },
  bottle: {
    texture: WEAPON_BOTTLE_TEXTURE,
    iconTexture: ICON_BOTTLE_TEXTURE,
    label: 'BOTELLA',
    uses: 3,
    damage: 45,
    bodyWidth: 10,
    bodyHeight: 10
  },
  bat: {
    texture: WEAPON_BAT_TEXTURE,
    iconTexture: ICON_BAT_TEXTURE,
    label: 'BATE',
    uses: 4,
    damage: 40,
    bodyWidth: 28,
    bodyHeight: 8
  }
};

const SHADOW_ALPHA = 0.26;
const DEFAULT_PICKUP_DELAY_MS = 300;

export interface WeaponItemOptions {
  /** Keeps the item from being collected while it is still under Joseph. */
  pickupDelayMs?: number;
  /** A dropped weapon must be left behind before it can be picked up again. */
  requiresClearDistance?: boolean;
}

/**
 * A weapon lying on the street. It is an overlap-only pickup: it never blocks
 * movement. Usable weapons stay on the ground until Joseph picks them up; they
 * never expire on their own.
 */
export class WeaponItem extends Phaser.Physics.Arcade.Sprite {
  public readonly kind: WeaponKind;
  public readonly uses: number;
  public readonly label: string;

  private collected = false;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly pickupBlockedUntil: number;
  private readonly requiresClearDistance: boolean;
  private clearedDistance: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: WeaponKind,
    uses?: number,
    options: WeaponItemOptions = {}
  ) {
    const definition = WEAPON_DEFINITIONS[kind];
    super(scene, x, y, definition.texture);

    this.kind = kind;
    this.uses = Math.max(1, uses ?? definition.uses);
    this.label = definition.label;

    this.setOrigin(0.5, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(definition.bodyWidth, definition.bodyHeight);
    body.setOffset(
      (this.width - definition.bodyWidth) / 2,
      this.height - definition.bodyHeight
    );
    body.setAllowGravity(false);
    body.setImmovable(true);

    this.setDepth(y + 0.3);
    this.pickupBlockedUntil =
      scene.time.now + (options.pickupDelayMs ?? DEFAULT_PICKUP_DELAY_MS);
    this.requiresClearDistance = options.requiresClearDistance ?? false;
    this.clearedDistance = !this.requiresClearDistance;

    this.shadow = scene.add
      .ellipse(x, y - 1, definition.bodyWidth + 6, 4, 0x000000, SHADOW_ALPHA)
      .setDepth(y - 0.1);

    this.once(Phaser.GameObjects.Events.DESTROY, () => this.cleanUp());
  }

  /**
   * Called by the scene every frame. A dropped weapon stays locked until
   * Joseph has stepped at least 28 px away from it once.
   */
  public updatePickupAvailability(playerX: number, playerY: number): void {
    if (this.clearedDistance) {
      return;
    }

    if (Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY) >= 28) {
      this.clearedDistance = true;
    }
  }

  public canBeCollected(playerX?: number, playerY?: number): boolean {
    if (!this.active || this.collected || this.scene.time.now < this.pickupBlockedUntil) {
      return false;
    }

    if (
      !this.clearedDistance &&
      playerX !== undefined &&
      playerY !== undefined &&
      Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY) < 28
    ) {
      return false;
    }

    return true;
  }

  public isCollected(): boolean {
    return this.collected;
  }

  public getDefinition(): WeaponDefinition {
    return WEAPON_DEFINITIONS[this.kind];
  }

  public collect(): void {
    if (this.collected) {
      return;
    }

    this.collected = true;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.destroy();
  }

  private cleanUp(): void {
    if (this.shadow.active) {
      this.shadow.destroy();
    }
  }
}
