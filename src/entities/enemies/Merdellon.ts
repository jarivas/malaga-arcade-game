import Phaser from 'phaser';
import type { Team } from '../../types/combat';

const MAX_HEALTH = 75;
const CHASE_SPEED = 40;
const STOP_DISTANCE = 30;
const HIT_FLASH_MS = 80;
const FLASH_COLOR = 0xffffff;
const KNOCKBACK_SPEED = 200;
const KNOCKBACK_DURATION_MS = 150;
const SPECIAL_KNOCKBACK_SPEED = 240;
const SPECIAL_KNOCKBACK_DURATION_MS = 300;
const SPECIAL_KNOCKDOWN_MS = 800;
const AERIAL_KNOCKBACK_SPEED = 170;
const AERIAL_KNOCKDOWN_MS = 700;
const PROJECTILE_KNOCKBACK_SPEED = 190;
const PROJECTILE_KNOCKDOWN_MS = 650;
// Wooden bat: a heavy horizontal blow that sends the infected flying.
const BAT_KNOCKBACK_SPEED = 300;
const BAT_KNOCKDOWN_MS = 750;
const DEATH_FADE_DELAY_MS = 500;
const DEATH_FADE_MS = 500;
// The artwork has its feet 2 px above the bottom of each 96x96 cell
const FEET_ORIGIN_Y = 94 / 96;

export class Merdellon extends Phaser.Physics.Arcade.Sprite {
  public readonly team: Team = 'enemy';

  private currentHealth: number = MAX_HEALTH;
  private alive = true;
  private isHurt = false;
  private isKnockedDown = false;
  private knockbackUntil = 0;
  private knockdownTimer?: Phaser.Time.TimerEvent;

  private readonly hpText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Keep the enemy at its original 1:1 scale so it matches the
    // proportions of the street furniture in the background.
    this.setScale(1);

    // Feet-based origin and collision box for 2.5D Y-Sort
    this.setOrigin(0.5, FEET_ORIGIN_Y);
    this.setDepth(y);
    const body: Phaser.Physics.Arcade.Body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 14);
    body.setOffset(36, 80);
    body.setDragX(600);
    this.setCollideWorldBounds(true);

    this.hpText = scene.add.text(x, y - 56, this.getHealthLabel(), {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffffff'
    });
    this.hpText.setOrigin(0.5, 1);
    this.hpText.setDepth(y + 1);

    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onAnimationComplete, this);
    this.play('enemy-idle');
  }

  /**
   * Basic chase AI. Called from the scene's update loop.
   */
  public update(target: {
    x: number;
    y: number;
    getGroundY?: () => number;
  }): void {
    if (!this.alive) {
      return;
    }

    // Y-Sort depth based on the feet position
    this.setDepth(this.y);
    this.hpText.setDepth(this.y + 1);
    this.hpText.setPosition(this.x, this.y - 56);

    // Always face Joseph
    this.setFlipX(this.x > target.x);

    // Respect hurt stun and knockback
    if (this.isHurt || this.scene.time.now < this.knockbackUntil) {
      return;
    }

    const targetY = target.getGroundY ? target.getGroundY() : target.y;
    const dx: number = target.x - this.x;
    const dy: number = targetY - this.y;
    const distance: number = Math.sqrt(dx * dx + dy * dy);

    if (distance > STOP_DISTANCE) {
      const direction = new Phaser.Math.Vector2(dx, dy).normalize();
      this.setVelocity(direction.x * CHASE_SPEED, direction.y * CHASE_SPEED);

      if (this.anims.currentAnim?.key !== 'enemy-walk') {
        this.play('enemy-walk');
      }
    } else {
      this.setVelocity(0, 0);

      if (this.anims.currentAnim?.key !== 'enemy-idle') {
        this.play('enemy-idle');
      }
    }
  }

  public takeDamage(amount: number, knockbackDirection: number): void {
    if (!this.alive) {
      return;
    }

    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.hpText.setText(this.getHealthLabel());
    this.flashHit();

    this.isHurt = true;
    this.play('enemy-hurt', true);

    // Knockback along the X axis
    this.setVelocity(knockbackDirection * KNOCKBACK_SPEED, 0);
    this.knockbackUntil = this.scene.time.now + KNOCKBACK_DURATION_MS;

    if (this.currentHealth === 0) {
      this.die();
    }
  }

  /**
   * Heavy 360-degree special hit: radial knockback, white flash and a
   * knockdown that holds the final hurt/fall pose before recovering.
   */
  public takeSpecialDamage(amount: number, dirX: number, dirY: number): void {
    this.takeKnockdownDamage(
      amount,
      dirX,
      dirY,
      SPECIAL_KNOCKBACK_SPEED,
      SPECIAL_KNOCKDOWN_MS
    );
  }

  public takeAerialDamage(amount: number, dirX: number, dirY: number): void {
    this.takeKnockdownDamage(
      amount,
      dirX,
      dirY,
      AERIAL_KNOCKBACK_SPEED,
      AERIAL_KNOCKDOWN_MS
    );
  }

  /** Thrown bottle or knife: damage plus a short horizontal knockdown. */
  public takeProjectileDamage(amount: number, dirX: number): void {
    this.takeKnockdownDamage(
      amount,
      dirX,
      0,
      PROJECTILE_KNOCKBACK_SPEED,
      PROJECTILE_KNOCKDOWN_MS
    );
  }

  /**
   * Wooden-bat blow: damage plus a strong horizontal knockdown that launches
   * the infected away from Joseph.
   */
  public takeBatDamage(amount: number, dirX: number): void {
    this.takeKnockdownDamage(
      amount,
      dirX,
      0,
      BAT_KNOCKBACK_SPEED,
      BAT_KNOCKDOWN_MS
    );
  }

  private takeKnockdownDamage(
    amount: number,
    dirX: number,
    dirY: number,
    knockbackSpeed: number,
    knockdownMs: number
  ): void {
    if (!this.alive) {
      return;
    }

    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.hpText.setText(this.getHealthLabel());
    this.flashHit();

    this.isHurt = true;
    this.isKnockedDown = true;
    this.play('enemy-hurt', true);

    this.setVelocity(dirX * knockbackSpeed, dirY * knockbackSpeed);
    this.knockbackUntil = this.scene.time.now + SPECIAL_KNOCKBACK_DURATION_MS;

    this.knockdownTimer?.remove(false);
    this.knockdownTimer = this.scene.time.delayedCall(knockdownMs, () => {
      this.knockdownTimer = undefined;
      if (!this.active || !this.alive) {
        return;
      }

      this.isKnockedDown = false;
      this.isHurt = false;
      this.play('enemy-idle');
    });

    this.scene.time.delayedCall(SPECIAL_KNOCKBACK_DURATION_MS, () => {
      if (this.active && this.alive && this.isKnockedDown) {
        this.setVelocity(0, 0);
      }
    });

    if (this.currentHealth === 0) {
      this.die();
    }
  }

  private flashHit(): void {
    // Full white hit flash (Phaser 4 separates tint colour and tint mode)
    this.setTint(FLASH_COLOR).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      if (this.active) {
        this.clearTint();
      }
    });
  }

  public isAlive(): boolean {
    return this.alive;
  }

  public getIsKnockedDown(): boolean {
    return this.isKnockedDown;
  }

  public getHealth(): number {
    return this.currentHealth;
  }

  public getMaxHealth(): number {
    return MAX_HEALTH;
  }

  private getHealthLabel(): string {
    return `HP ${this.currentHealth}`;
  }

  private onAnimationComplete(anim: Phaser.Animations.Animation): void {
    if (anim.key !== 'enemy-hurt' || !this.alive) {
      return;
    }

    if (this.isKnockedDown) {
      return; // Hold the fallen pose until the knockdown timer expires.
    }

    this.isHurt = false;
    this.play('enemy-idle');
  }

  private die(): void {
    this.alive = false;
    this.isHurt = true;
    this.knockdownTimer?.remove(false);
    this.knockdownTimer = undefined;

    const body: Phaser.Physics.Arcade.Body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;

    this.hpText.destroy();

    // The hurt animation ends with Merdellón lying on the ground, so it can
    // double as the death animation.
    this.setDepth(this.y);
    this.play('enemy-hurt', true);

    this.scene.time.delayedCall(DEATH_FADE_DELAY_MS, () => {
      if (!this.active) {
        return;
      }

      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: DEATH_FADE_MS,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.destroy();
        }
      });
    });
  }
}
