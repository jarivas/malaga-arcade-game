import Phaser from 'phaser';
import {
  PICKUP_CAMPERO_TEXTURE,
  PICKUP_DINERO_TEXTURE,
  PICKUP_REFRESCO_TEXTURE
} from './PropTextures';

export type PickupKind = 'campero' | 'refresco' | 'dinero';

export interface PickupDefinition {
  texture: string;
  healAmount: number;
  scoreValue: number;
  label: string;
  bodyWidth: number;
  bodyHeight: number;
}

export const PICKUP_DEFINITIONS: Record<PickupKind, PickupDefinition> = {
  campero: {
    texture: PICKUP_CAMPERO_TEXTURE,
    healAmount: 30,
    scoreValue: 500,
    label: 'CAMPERO',
    bodyWidth: 14,
    bodyHeight: 8
  },
  refresco: {
    texture: PICKUP_REFRESCO_TEXTURE,
    healAmount: 15,
    scoreValue: 200,
    label: 'REFRESCO',
    bodyWidth: 8,
    bodyHeight: 8
  },
  dinero: {
    texture: PICKUP_DINERO_TEXTURE,
    healAmount: 0,
    scoreValue: 1000,
    label: 'DINERO',
    bodyWidth: 14,
    bodyHeight: 8
  }
};

const SPAWN_ARC_DURATION_MS = 430;
const SPAWN_ARC_HEIGHT_MIN = 22;
const SPAWN_ARC_HEIGHT_MAX = 34;
const SPAWN_HORIZONTAL_SPREAD = 20;
const BLINK_DURATION_MS = 420;
const BLINK_MIN_ALPHA = 0.38;
const SHADOW_ALPHA = 0.32;

/**
 * Health/score pickup dropped by a broken prop.
 *
 * It is launched in a small parabolic arc from the container, lands on the
 * asphalt and then blinks softly until Joseph walks over it. Its physics body
 * stays disabled while airborne so it cannot be collected mid-flight.
 */
export class PickupItem extends Phaser.Physics.Arcade.Sprite {
  public readonly kind: PickupKind;
  public readonly healAmount: number;
  public readonly scoreValue: number;
  public readonly label: string;

  private collected = false;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private blinkTween?: Phaser.Tweens.Tween;
  private spawnTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: PickupKind) {
    const definition = PICKUP_DEFINITIONS[kind];
    super(scene, x, y, definition.texture);

    this.kind = kind;
    this.healAmount = definition.healAmount;
    this.scoreValue = definition.scoreValue;
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
    body.enable = false;

    const worldBounds = scene.physics.world.bounds;
    const targetX = Phaser.Math.Clamp(
      x + Phaser.Math.Between(-SPAWN_HORIZONTAL_SPREAD, SPAWN_HORIZONTAL_SPREAD),
      worldBounds.left + 20,
      worldBounds.right - 20
    );
    const targetY = Phaser.Math.Clamp(
      y + Phaser.Math.Between(-2, 2),
      worldBounds.top + 20,
      worldBounds.bottom - 20
    );

    this.setDepth(targetY + 0.4);

    this.shadow = scene.add
      .ellipse(x, y - 1, 12, 4, 0x000000, SHADOW_ALPHA)
      .setDepth(targetY - 0.1);

    this.launchArc(x, y, targetX, targetY);
  }

  /**
   * True once the item has been picked up or is being destroyed, used to make
   * the overlap callback idempotent.
   */
  public isCollected(): boolean {
    return this.collected;
  }

  public collect(): void {
    if (this.collected) {
      return;
    }

    this.collected = true;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;

    this.blinkTween?.stop();
    this.blinkTween = undefined;

    this.destroy();
  }

  public getDefinition(): PickupDefinition {
    return PICKUP_DEFINITIONS[this.kind];
  }

  private launchArc(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number
  ): void {
    const scene = this.scene;
    const apex = Phaser.Math.Between(SPAWN_ARC_HEIGHT_MIN, SPAWN_ARC_HEIGHT_MAX);

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.spawnTween?.stop();
      this.spawnTween = undefined;
      this.blinkTween?.stop();
      this.blinkTween = undefined;
      if (this.shadow.active) {
        this.shadow.destroy();
      }
    });

    this.spawnTween = scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: SPAWN_ARC_DURATION_MS,
      ease: 'Linear',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;

        // Parabolic hop: y(0) = startY, y(1) = targetY, with a clear apex in
        // the middle while x travels linearly to the resting spot.
        const x = Phaser.Math.Linear(startX, targetX, t);
        const y =
          Phaser.Math.Linear(startY, targetY, t) -
          4 * apex * t * (1 - t);
        const height = targetY - y;

        this.setPosition(x, y);
        this.shadow.setPosition(x, targetY - 1);
        this.shadow.setScale(Phaser.Math.Clamp(1 - height / 90, 0.55, 1));
        this.shadow.setAlpha(SHADOW_ALPHA * (1 - height / 140));
      },
      onComplete: () => {
        this.spawnTween = undefined;
        if (this.active) {
          this.onLanded(targetX, targetY);
        }
      }
    });
  }

  private onLanded(targetX: number, targetY: number): void {
    this.setPosition(targetX, targetY);
    this.setDepth(targetY + 0.4);

    this.shadow.setPosition(targetX, targetY - 1);
    this.shadow.setScale(1);
    this.shadow.setAlpha(SHADOW_ALPHA);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.updateFromGameObject();

    this.blinkTween = this.scene.tweens.add({
      targets: this,
      alpha: BLINK_MIN_ALPHA,
      duration: BLINK_DURATION_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
}
