import Phaser from 'phaser';
import type { ThrowableWeaponKind } from './WeaponItem';
import {
  PROJECTILE_BOTTLE_TEXTURE,
  PROJECTILE_KNIFE_TEXTURE
} from './WeaponTextures';

const BOTTLE_SPEED = 500;
const KNIFE_SPEED = 600;
const PROJECTILE_LIFETIME_MS = 2500;
const BOTTLE_BODY_WIDTH = 8;
const BOTTLE_BODY_HEIGHT = 20;
const KNIFE_BODY_WIDTH = 12;
const KNIFE_BODY_HEIGHT = 20;

export const PROJECTILE_DAMAGE = 35;

export const PROJECTILE_BOTTLE_ANIM = 'projectile-bottle-spin';
export const PROJECTILE_KNIFE_ANIM = 'projectile-knife-spin';

/**
 * A thrown bottle or knife. It always travels in a straight horizontal line
 * (vy = 0) while its two-frame rotation animation spins the artwork.
 *
 * The knife is faster than the bottle. Collision, damage, knockdown and the
 * impact burst are handled by the scene so the projectile stays a small,
 * reusable physics object.
 */
export class WeaponProjectile extends Phaser.Physics.Arcade.Sprite {
  public readonly kind: ThrowableWeaponKind;
  public readonly damage = PROJECTILE_DAMAGE;

  private consumed = false;
  private readonly expireTimer: Phaser.Time.TimerEvent;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: ThrowableWeaponKind,
    direction: number
  ) {
    super(
      scene,
      x,
      y,
      kind === 'bottle' ? PROJECTILE_BOTTLE_TEXTURE : PROJECTILE_KNIFE_TEXTURE,
      0
    );

    this.kind = kind;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const width = kind === 'bottle' ? BOTTLE_BODY_WIDTH : KNIFE_BODY_WIDTH;
    const height = kind === 'bottle' ? BOTTLE_BODY_HEIGHT : KNIFE_BODY_HEIGHT;
    body.setSize(width, height, true);
    body.setAllowGravity(false);
    body.setImmovable(true);
    const speed = kind === 'bottle' ? BOTTLE_SPEED : KNIFE_SPEED;
    body.setVelocity(direction * speed, 0);

    this.setDepth(y + 0.8);
    this.setFlipX(direction < 0);

    this.play(kind === 'bottle' ? PROJECTILE_BOTTLE_ANIM : PROJECTILE_KNIFE_ANIM);

    this.expireTimer = scene.time.delayedCall(PROJECTILE_LIFETIME_MS, () => {
      if (this.active) {
        this.destroy();
      }
    });

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.expireTimer.remove(false);
    });
  }

  /**
   * Marks the projectile as spent and removes it. Returns false when another
   * overlap already consumed it during the same physics step.
   */
  public consume(): boolean {
    if (this.consumed || !this.active) {
      return false;
    }

    this.consumed = true;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.destroy();
    return true;
  }

  public isConsumed(): boolean {
    return this.consumed;
  }
}
