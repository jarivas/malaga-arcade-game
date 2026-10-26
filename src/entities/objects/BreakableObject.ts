import Phaser from 'phaser';
import type { SoundFX } from '../../audio/SoundFX';
import {
  BREAKABLE_BIN_TEXTURE,
  BREAKABLE_CRATE_TEXTURE,
  DEBRIS_METAL_TEXTURE,
  DEBRIS_WOOD_TEXTURE
} from './PropTextures';

export type BreakableKind = 'bin' | 'crate';

const MAX_HEALTH = 2;
const HIT_FLASH_MS = 90;
const HIT_FLASH_COLOR = 0xffffff;
const IMPACT_COOLDOWN_MS = 600;
const DEBRIS_MIN_COUNT = 8;

interface BreakableConfig {
  texture: string;
  bodyWidth: number;
  bodyHeight: number;
  shadowWidth: number;
  debrisTexture: string;
  debrisCount: number;
}

const BREAKABLE_CONFIG: Record<BreakableKind, BreakableConfig> = {
  bin: {
    texture: BREAKABLE_BIN_TEXTURE,
    bodyWidth: 26,
    bodyHeight: 10,
    shadowWidth: 26,
    debrisTexture: DEBRIS_METAL_TEXTURE,
    debrisCount: 11
  },
  crate: {
    texture: BREAKABLE_CRATE_TEXTURE,
    bodyWidth: 24,
    bodyHeight: 10,
    shadowWidth: 24,
    debrisTexture: DEBRIS_WOOD_TEXTURE,
    debrisCount: 10
  }
};

export interface BreakableObjectOptions {
  soundFX?: SoundFX;
  onBreak?: (object: BreakableObject) => void;
}

/**
 * Interactive street prop (green wheeled bin or wooden crate).
 *
 * It has a static Arcade body at its feet, participates in the scene Y-Sort and
 * breaks after two katana hits (or knockdown impacts). On destruction it spits
 * out physics-flavoured debris and delegates the drop roll to the scene.
 */
export class BreakableObject extends Phaser.Physics.Arcade.Sprite {
  public readonly kind: BreakableKind;

  private currentHealth = MAX_HEALTH;
  private broken = false;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly impactSources = new Set<Phaser.GameObjects.GameObject>();
  private readonly soundFX?: SoundFX;
  private readonly onBreak?: (object: BreakableObject) => void;

  private flashTimer?: Phaser.Time.TimerEvent;
  private wobbleTween?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: BreakableKind,
    options: BreakableObjectOptions = {}
  ) {
    const config = BREAKABLE_CONFIG[kind];
    super(scene, x, y, config.texture);

    this.kind = kind;
    this.soundFX = options.soundFX;
    this.onBreak = options.onBreak;

    this.setOrigin(0.5, 1);
    scene.add.existing(this);

    // Static body, sized to the footprint instead of the full artwork so the
    // player can walk in front/behind the prop naturally.
    scene.physics.add.existing(this, true);
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(config.bodyWidth, config.bodyHeight, false);
    body.setOffset(
      (this.displayWidth - config.bodyWidth) / 2,
      this.displayHeight - config.bodyHeight
    );

    this.setDepth(y);

    this.shadow = scene.add
      .ellipse(x, y - 1, config.shadowWidth, 6, 0x000000, 0.35)
      .setDepth(y - 0.1);

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.flashTimer?.remove(false);
      this.flashTimer = undefined;
      this.wobbleTween?.stop();
      this.wobbleTween = undefined;
      if (this.shadow.active) {
        this.shadow.destroy();
      }
    });
  }

  /**
   * Applies one katana hit. Returns true when this hit destroyed the prop.
   */
  public hit(): boolean {
    if (!this.active || this.broken) {
      return false;
    }

    this.currentHealth -= 1;

    if (this.currentHealth <= 0) {
      this.breakApart();
      return true;
    }

    this.soundFX?.playHit();
    this.flashHit();
    this.wobble();
    return false;
  }

  /**
   * Knockdown impacts are filtered so a single airborne enemy cannot damage the
   * same prop on every physics frame while it flies through it.
   */
  public tryRegisterImpact(source: Phaser.GameObjects.GameObject): boolean {
    if (this.impactSources.has(source)) {
      return false;
    }

    this.impactSources.add(source);
    this.scene.time.delayedCall(IMPACT_COOLDOWN_MS, () => {
      this.impactSources.delete(source);
    });

    return true;
  }

  public getHealth(): number {
    return this.currentHealth;
  }

  public getMaxHealth(): number {
    return MAX_HEALTH;
  }

  private flashHit(): void {
    this.flashTimer?.remove(false);
    this.setTint(HIT_FLASH_COLOR).setTintMode(Phaser.TintModes.FILL);

    this.flashTimer = this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      this.flashTimer = undefined;
      if (this.active) {
        this.clearTint();
      }
    });
  }

  private wobble(): void {
    this.wobbleTween?.stop();
    this.setAngle(0);

    this.wobbleTween = this.scene.tweens.add({
      targets: this,
      angle: 3,
      duration: 45,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.wobbleTween = undefined;
        if (this.active) {
          this.setAngle(0);
        }
      }
    });
  }

  private breakApart(): void {
    if (this.broken) {
      return;
    }

    this.broken = true;
    this.flashTimer?.remove(false);
    this.flashTimer = undefined;
    this.wobbleTween?.stop();
    this.wobbleTween = undefined;
    this.clearTint();

    this.soundFX?.playBreak();
    this.spawnDebris();
    this.spawnDust();

    // The scene uses this callback to roll a pickup before the sprite and its
    // static body disappear from the world.
    this.onBreak?.(this);

    this.destroy();
  }

  private spawnDebris(): void {
    const config = BREAKABLE_CONFIG[this.kind];
    const count = Math.max(DEBRIS_MIN_COUNT, config.debrisCount);
    const scene = this.scene;
    const groundY = this.y;

    for (let i = 0; i < count; i++) {
      const startX = this.x + Phaser.Math.Between(-10, 10);
      const startY = this.y - Phaser.Math.Between(5, 28);
      const endX = startX + Phaser.Math.Between(-38, 38);
      const endY = groundY + Phaser.Math.Between(-2, 2);
      const peak = Phaser.Math.Between(14, 30);
      const duration = Phaser.Math.Between(380, 620);
      const startAngle = Phaser.Math.Between(0, 360);
      const spin = Phaser.Math.Between(-540, 540);

      const shard = scene.add
        .image(startX, startY, config.debrisTexture)
        .setDepth(groundY + 0.8)
        .setAngle(startAngle)
        .setScale(Phaser.Math.FloatBetween(0.7, 1.25))
        .setFlipX(Math.random() < 0.5)
        .setFlipY(Math.random() < 0.5);

      scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration,
        ease: 'Linear',
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 0;
          const fadeStart = 0.68;
          const alpha =
            t <= fadeStart ? 1 : 1 - (t - fadeStart) / (1 - fadeStart);

          shard.setPosition(
            Phaser.Math.Linear(startX, endX, t),
            Phaser.Math.Linear(startY, endY, t) -
              Math.sin(Math.PI * t) * peak
          );
          shard.setAngle(startAngle + spin * t);
          shard.setAlpha(alpha);
        },
        onComplete: () => {
          shard.destroy();
        }
      });
    }
  }

  private spawnDust(): void {
    const scene = this.scene;
    const groundY = this.y;

    for (let i = 0; i < 3; i++) {
      const puff = scene.add
        .ellipse(
          this.x + Phaser.Math.Between(-9, 9),
          groundY - 2,
          8,
          4,
          0x9a9a9a,
          0.5
        )
        .setDepth(groundY + 0.7);

      scene.tweens.add({
        targets: puff,
        scaleX: 2.2,
        scaleY: 1.8,
        alpha: 0,
        duration: 350 + i * 60,
        ease: 'Quad.easeOut',
        onComplete: () => {
          puff.destroy();
        }
      });
    }
  }
}
