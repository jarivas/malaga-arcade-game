import Phaser from 'phaser';
import type { DamageData, Team } from '../../types/combat';
import type { SoundFX } from '../../audio/SoundFX';
import { WEAPON_DEFINITIONS, type WeaponKind } from '../objects/WeaponItem';

export interface EquippedWeapon {
  kind: WeaponKind;
  uses: number;
  maxUses: number;
}

interface JosephKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  J: Phaser.Input.Keyboard.Key;
  K: Phaser.Input.Keyboard.Key;
  U: Phaser.Input.Keyboard.Key;
  SPACE: Phaser.Input.Keyboard.Key;
}

const MAX_HEALTH = 100;
const MOVE_SPEED = 140;
const ATTACK_COOLDOWN_MS = 350;
const LUNGE_DISTANCE = 30;
const LUNGE_DURATION_MS = 100;
const HURT_KNOCKBACK_MS = 150;
// The artwork has its feet 2 px above the bottom of each 96x96 cell
const FEET_ORIGIN_Y = 94 / 96;
// Draw the player slightly above enemies sharing the same feet Y
const DEPTH_BIAS = 0.5;
const HITBOX_WIDTH = 76;
const HITBOX_HEIGHT = 40;
const HITBOX_FORWARD_OFFSET = 32;

// Devastating 360-degree katana spin.
const SPECIAL_DURATION_MS = 400;
const SPECIAL_HITBOX_DURATION_MS = 250;
const SPECIAL_HITBOX_RADIUS = 55;
const SPECIAL_HITBOX_SIZE = SPECIAL_HITBOX_RADIUS * 2;
const SPECIAL_SLASH_DURATION_MS = 250;
const SPECIAL_COOLDOWN_MS = 1000;
const SPECIAL_SPIN_INTERVAL_MS = 50;
const SPECIAL_SPIN_REPEATS = 6;
const SPECIAL_HEALTH_COST = 8;

export const JOSEPH_SPECIAL_DAMAGE = 50;

// Fake-Z 2.5D jump and aerial attack.
const JUMP_GRAVITY = -600;
const JUMP_FORCE = 280;
const JUMP_AIR_CONTROL = 0.6;
const JUMP_DODGE_HEIGHT = 20;
const JUMP_SHADOW_WIDTH = 30;
const JUMP_SHADOW_HEIGHT = 10;
const JUMP_SHADOW_ALPHA = 0.4;
const JUMP_ATTACK_HITBOX_WIDTH = 92;
const JUMP_ATTACK_HITBOX_HEIGHT = 64;
const JUMP_ATTACK_FORWARD_OFFSET = 24;
const JUMP_ATTACK_GROUND_OFFSET = 20;

export const JOSEPH_JUMP_ATTACK_DAMAGE = 35;

const WEAPON_SWING_COLORS: Record<WeaponKind, number> = {
  pipe: 0xbfd6e6,
  bottle: 0x9fe08a,
  bat: 0xe0a45a
};

const GAMEPAD_DEADZONE = 0.25;
const GAMEPAD_DPAD_UP = 12;
const GAMEPAD_DPAD_DOWN = 13;
const GAMEPAD_DPAD_LEFT = 14;
const GAMEPAD_DPAD_RIGHT = 15;
const GAMEPAD_BUTTON_A = 0;
const GAMEPAD_BUTTON_B = 1;
const GAMEPAD_BUTTON_Y = 3;

export class Joseph extends Phaser.Physics.Arcade.Sprite {
  public readonly team: Team = 'player';

  private readonly moveSpeed: number = MOVE_SPEED;
  private currentHealth: number = MAX_HEALTH;
  private readonly maxHealth: number = MAX_HEALTH;
  private isAttacking = false;
  private isSpecialAttacking = false;
  private isInvulnerable = false;
  private isHurt = false;
  private lastAttackTime = -Infinity;
  private lastSpecialTime = -Infinity;
  private wasGamepadAttackDown = false;
  private wasGamepadSpecialDown = false;
  private wasGamepadSpecialComboDown = false;
  private wasKeyboardSpecialComboDown = false;
  private specialHasHit = false;
  private specialFacingDirection = 1;
  private specialSpinEvent?: Phaser.Time.TimerEvent;

  public isJumping = false;
  public isJumpAttacking = false;
  public z = 0;
  public vz = 0;
  public readonly gravityZ = JUMP_GRAVITY;
  public readonly jumpForce = JUMP_FORCE;
  private isLanding = false;

  private groundY: number;
  private wasGamepadJumpDown = false;
  private attackAnimationType: 'normal' | 'jump' | 'special' | null = null;
  private readonly jumpShadow: Phaser.GameObjects.Ellipse;
  private readonly jumpAttackHitbox: Phaser.GameObjects.Zone;
  private readonly jumpAttackHitTargets: Set<Phaser.GameObjects.GameObject> = new Set<Phaser.GameObjects.GameObject>();

  /**
   * Callback invoked whenever Joseph's health changes. The HUD subscribes to
   * this to refresh the 1P health bar.
   */
  public onHealthChanged?: (newHealth: number, maxHealth: number) => void;

  /**
   * Callback invoked when Joseph equips, spends or loses a weapon. The HUD uses
   * it to show the weapon icon and its remaining uses.
   */
  public onWeaponChanged?: (weapon: EquippedWeapon | null) => void;

  /**
   * Callback invoked when the equipped weapon breaks or is dropped by damage.
   * The scene uses it to spawn debris and the dropped pickup.
   */
  public onWeaponLost?: (
    kind: WeaponKind,
    usesRemaining: number,
    reason: 'broken' | 'dropped'
  ) => void;

  private currentWeapon: EquippedWeapon | null = null;
  private weaponHitThisAttack = false;

  private readonly keys: JosephKeys;
  private readonly hitbox: Phaser.GameObjects.Zone;
  private readonly specialHitbox: Phaser.GameObjects.Zone;
  private readonly hitTargetsThisAttack: Set<Phaser.GameObjects.GameObject> = new Set<Phaser.GameObjects.GameObject>();
  private readonly specialHitTargets: Set<Phaser.GameObjects.GameObject> = new Set<Phaser.GameObjects.GameObject>();
  private readonly soundFX?: SoundFX;

  constructor(scene: Phaser.Scene, x: number, y: number, soundFX?: SoundFX) {
    super(scene, x, y, 'joseph', 0);

    this.soundFX = soundFX;
    this.groundY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Keep the character at its original 1:1 scale so it matches the
    // proportions of the street furniture in the background.
    this.setScale(1);

    // Origin at the feet so this.y is the Y-Sort depth
    this.setOrigin(0.5, FEET_ORIGIN_Y);
    this.setDepth(y + DEPTH_BIAS);

    // Collision box at the feet, in source-texture pixels (96x96 frames)
    const body: Phaser.Physics.Arcade.Body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 14);
    body.setOffset(36, 80);
    this.setCollideWorldBounds(true);

    // Input setup
    this.keys = scene.input.keyboard!.addKeys(
      'W,A,S,D,J,K,U,SPACE'
    ) as unknown as JosephKeys;

    // Normal attack hitbox (disabled until an attack starts)
    this.hitbox = scene.add.zone(x, y, HITBOX_WIDTH, HITBOX_HEIGHT);
    scene.physics.add.existing(this.hitbox);
    this.setHitboxEnabled(false);

    // Circular 360-degree special hitbox, centered on Joseph's feet.
    this.specialHitbox = scene.add.zone(x, y, SPECIAL_HITBOX_SIZE, SPECIAL_HITBOX_SIZE);
    scene.physics.add.existing(this.specialHitbox);
    (this.specialHitbox.body as Phaser.Physics.Arcade.Body).setCircle(
      SPECIAL_HITBOX_RADIUS
    );
    this.setSpecialHitboxEnabled(false);

    // Ground-anchored aerial hitbox and fake-Z shadow.
    this.jumpAttackHitbox = scene.add.zone(
      x,
      y,
      JUMP_ATTACK_HITBOX_WIDTH,
      JUMP_ATTACK_HITBOX_HEIGHT
    );
    scene.physics.add.existing(this.jumpAttackHitbox);
    this.setJumpAttackHitboxEnabled(false);

    this.jumpShadow = scene.add.ellipse(
      x,
      y,
      JUMP_SHADOW_WIDTH,
      JUMP_SHADOW_HEIGHT,
      0x000000,
      JUMP_SHADOW_ALPHA
    );
    this.jumpShadow.setDepth(y - 0.1);

    // Animation frame events used to sync the katana hitbox with the slash
    this.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.onAnimationUpdate, this);
    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onAnimationComplete, this);

    this.play('joseph-idle');
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    // Dynamic Y-Sort depth (critical for brawler vertical layering)
    this.updateDepth();

    this.handleSpecialAttack(time);
    this.handleJump(delta);
    this.handleMovement();
    this.handleAttack(time);
    this.updateAnimationState();

    if (this.isSpecialAttacking) {
      this.specialHitbox.setPosition(this.x, this.y);
    } else if (this.isJumpAttacking) {
      const direction: number = this.getFacingDirection();
      this.jumpAttackHitbox.setPosition(
        this.x + direction * JUMP_ATTACK_FORWARD_OFFSET,
        this.groundY - JUMP_ATTACK_GROUND_OFFSET
      );
    } else if (this.isAttacking) {
      // Keep the active hitbox in front of Joseph while the lunge moves him
      const direction: number = this.getFacingDirection();
      this.hitbox.setPosition(this.x + direction * HITBOX_FORWARD_OFFSET, this.y - 18);
    }
  }

  /**
   * Re-applies the feet-based depth after the physics step. The scene calls
   * this so Joseph and dynamically spawned enemies are sorted in the same
   * frame, without a one-frame depth lag.
   */
  public updateDepth(): void {
    const body: Phaser.Physics.Arcade.Body = this.body as Phaser.Physics.Arcade.Body;
    this.groundY = body.bottom;

    this.setDepth(this.groundY + DEPTH_BIAS);

    this.jumpShadow.setPosition(this.x, this.groundY);
    this.jumpShadow.setScale(this.getShadowScale());
    this.jumpShadow.setDepth(this.groundY - 0.1);
  }

  public getGroundY(): number {
    return this.groundY;
  }

  private getShadowScale(): number {
    return Phaser.Math.Clamp(1 - this.z / 220, 0.45, 1);
  }

  private getGamepad(): Phaser.Input.Gamepad.Gamepad | null {
    const plugin: Phaser.Input.Gamepad.GamepadPlugin | null = this.scene.input.gamepad;
    if (plugin === null) {
      return null;
    }
    return plugin.getPad(0) ?? null;
  }

  private handleMovement(): void {
    if (this.isAttacking || this.isSpecialAttacking || this.isHurt) {
      return; // Keep lunge / special / knockback velocity while busy
    }

    const velocity = new Phaser.Math.Vector2(0, 0);

    // Keyboard (WASD)
    if (this.keys.W.isDown) {
      velocity.y -= 1;
    }
    if (this.keys.S.isDown) {
      velocity.y += 1;
    }
    if (this.keys.A.isDown) {
      velocity.x -= 1;
    }
    if (this.keys.D.isDown) {
      velocity.x += 1;
    }

    // Gamepad (left stick + D-pad)
    const pad: Phaser.Input.Gamepad.Gamepad | null = this.getGamepad();
    if (pad !== null) {
      if (pad.leftStick.lengthSq() > GAMEPAD_DEADZONE * GAMEPAD_DEADZONE) {
        velocity.x += pad.leftStick.x;
        velocity.y += pad.leftStick.y;
      } else {
        if (this.isButtonPressed(pad, GAMEPAD_DPAD_LEFT)) {
          velocity.x -= 1;
        }
        if (this.isButtonPressed(pad, GAMEPAD_DPAD_RIGHT)) {
          velocity.x += 1;
        }
        if (this.isButtonPressed(pad, GAMEPAD_DPAD_UP)) {
          velocity.y -= 1;
        }
        if (this.isButtonPressed(pad, GAMEPAD_DPAD_DOWN)) {
          velocity.y += 1;
        }
      }
    }

    // Normalize diagonal movement
    if (velocity.lengthSq() > 1) {
      velocity.normalize();
    }

    const speed = this.isJumping
      ? this.moveSpeed * JUMP_AIR_CONTROL
      : this.moveSpeed;
    velocity.scale(speed);
    this.setVelocity(velocity.x, velocity.y);
  }

  private updateAnimationState(): void {
    if (
      this.isAttacking ||
      this.isJumpAttacking ||
      this.isSpecialAttacking ||
      this.isHurt ||
      this.isJumping ||
      this.isLanding
    ) {
      return;
    }

    const body: Phaser.Physics.Arcade.Body = this.body as Phaser.Physics.Arcade.Body;
    const velocity: Phaser.Math.Vector2 = body.velocity;
    const currentKey: string | undefined = this.anims.currentAnim?.key;

    if (velocity.lengthSq() > 25) {
      if (currentKey !== 'joseph-run') {
        this.play('joseph-run');
      }
      this.setFlipX(velocity.x < 0);
    } else if (currentKey !== 'joseph-idle') {
      this.play('joseph-idle');
    }
  }

  private isButtonPressed(pad: Phaser.Input.Gamepad.Gamepad, index: number): boolean {
    const button: Phaser.Input.Gamepad.Button | undefined = pad.buttons[index];
    return button !== undefined && button.pressed;
  }

  private handleAttack(currentTime: number): void {
    if (this.isJumping) {
      this.handleJumpAttackInput(currentTime);
      return;
    }

    if (
      this.isAttacking ||
      this.isSpecialAttacking ||
      this.isHurt ||
      currentTime < this.lastAttackTime + ATTACK_COOLDOWN_MS
    ) {
      this.wasGamepadAttackDown = this.isGamepadAttackDown();
      return;
    }

    // Consume the J edge even when the special combo suppresses the attack.
    const keyboardPressed: boolean = Phaser.Input.Keyboard.JustDown(this.keys.J);
    const pad: Phaser.Input.Gamepad.Gamepad | null = this.getGamepad();
    const gamepadDown: boolean =
      pad !== null && this.isButtonPressed(pad, GAMEPAD_BUTTON_A);
    const gamepadPressed: boolean = gamepadDown && !this.wasGamepadAttackDown;
    this.wasGamepadAttackDown = gamepadDown;

    const specialComboDown: boolean =
      this.keys.K.isDown ||
      (pad !== null &&
        this.isButtonPressed(pad, GAMEPAD_BUTTON_A) &&
        this.isButtonPressed(pad, GAMEPAD_BUTTON_B));

    if (specialComboDown) {
      return;
    }

    if (keyboardPressed || gamepadPressed) {
      this.performAttack(currentTime);
    }
  }

  private handleJumpAttackInput(currentTime: number): void {
    if (
      this.isJumpAttacking ||
      this.isHurt ||
      currentTime < this.lastAttackTime + ATTACK_COOLDOWN_MS
    ) {
      this.wasGamepadAttackDown = this.isGamepadAttackDown();
      return;
    }

    const keyboardPressed = Phaser.Input.Keyboard.JustDown(this.keys.J);
    const gamepadDown = this.isGamepadAttackDown();
    const gamepadPressed = gamepadDown && !this.wasGamepadAttackDown;
    this.wasGamepadAttackDown = gamepadDown;

    if (keyboardPressed || gamepadPressed) {
      this.performJumpAttack(currentTime);
    }
  }

  private performJumpAttack(currentTime: number): void {
    this.isJumpAttacking = true;
    this.lastAttackTime = currentTime;
    this.attackAnimationType = 'jump';
    this.jumpAttackHitTargets.clear();
    this.weaponHitThisAttack = false;
    this.setJumpAttackHitboxEnabled(false);
    this.soundFX?.playSlash();
    this.play('joseph-jump-slash', true);
  }

  private isGamepadAttackDown(): boolean {
    const pad: Phaser.Input.Gamepad.Gamepad | null = this.getGamepad();
    return pad !== null && this.isButtonPressed(pad, GAMEPAD_BUTTON_A);
  }

  private handleSpecialAttack(currentTime: number): void {
    const pad: Phaser.Input.Gamepad.Gamepad | null = this.getGamepad();
    const gamepadYDown: boolean =
      pad !== null && this.isButtonPressed(pad, GAMEPAD_BUTTON_Y);
    const gamepadComboDown: boolean =
      pad !== null &&
      this.isButtonPressed(pad, GAMEPAD_BUTTON_A) &&
      this.isButtonPressed(pad, GAMEPAD_BUTTON_B);

    const gamepadYPressed: boolean = gamepadYDown && !this.wasGamepadSpecialDown;
    const gamepadComboPressed: boolean =
      gamepadComboDown && !this.wasGamepadSpecialComboDown;

    this.wasGamepadSpecialDown = gamepadYDown;
    this.wasGamepadSpecialComboDown = gamepadComboDown;

    const keyboardComboDown: boolean = this.keys.J.isDown && this.keys.K.isDown;
    const keyboardComboPressed: boolean =
      keyboardComboDown && !this.wasKeyboardSpecialComboDown;
    this.wasKeyboardSpecialComboDown = keyboardComboDown;

    const keyboardUPressed: boolean = Phaser.Input.Keyboard.JustDown(this.keys.U);

    if (
      this.isSpecialAttacking ||
      this.isJumping ||
      this.isAttacking ||
      this.isHurt ||
      currentTime < this.lastSpecialTime + SPECIAL_COOLDOWN_MS
    ) {
      return;
    }

    if (
      keyboardUPressed ||
      keyboardComboPressed ||
      gamepadYPressed ||
      gamepadComboPressed
    ) {
      this.performSpecialAttack(currentTime);
    }
  }

  private handleJump(delta: number): void {
    if (this.isJumping) {
      const dt = delta / 1000;
      this.vz += this.gravityZ * dt;
      this.z += this.vz * dt;

      if (this.z <= 0) {
        this.land();
      } else {
        this.y = this.groundY - this.z;
        const body: Phaser.Physics.Arcade.Body = this.body as Phaser.Physics.Arcade.Body;
        body.setOffset(36, 80 + this.z);
        this.updateJumpPose();
      }
    }

    const pad: Phaser.Input.Gamepad.Gamepad | null = this.getGamepad();
    const spacePressed = Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    const kPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.K) && !this.keys.J.isDown;
    const bDown = pad !== null && this.isButtonPressed(pad, GAMEPAD_BUTTON_B);
    const aDown = pad !== null && this.isButtonPressed(pad, GAMEPAD_BUTTON_A);
    const bPressed = bDown && !this.wasGamepadJumpDown && !aDown;
    this.wasGamepadJumpDown = bDown;

    if (
      this.isJumping ||
      this.isHurt ||
      this.isSpecialAttacking ||
      this.isAttacking
    ) {
      return;
    }

    if (spacePressed || kPressed || bPressed) {
      this.startJump();
    }
  }

  private startJump(): void {
    this.isLanding = false;
    this.isJumping = true;
    this.isJumpAttacking = false;
    this.z = 0;
    this.vz = this.jumpForce;
    this.jumpAttackHitTargets.clear();
    this.setJumpAttackHitboxEnabled(false);
    if (this.attackAnimationType === 'jump') {
      this.attackAnimationType = null;
    }

    this.updateJumpPose();
  }

  private land(): void {
    this.z = 0;
    this.vz = 0;
    this.isJumping = false;
    this.isJumpAttacking = false;
    this.setJumpAttackHitboxEnabled(false);
    this.jumpAttackHitTargets.clear();

    if (this.attackAnimationType === 'jump') {
      this.attackAnimationType = null;
    }

    this.y = this.groundY;
    const body: Phaser.Physics.Arcade.Body = this.body as Phaser.Physics.Arcade.Body;
    body.setOffset(36, 80);

    const moving = body.velocity.lengthSq() > 25;
    if (moving) {
      this.isLanding = false;
      return;
    }

    this.isLanding = true;
    this.play('joseph-jump-land', true);

    this.scene.time.delayedCall(80, () => {
      this.isLanding = false;
      if (
        this.active &&
        !this.isJumping &&
        !this.isAttacking &&
        !this.isJumpAttacking &&
        !this.isSpecialAttacking &&
        !this.isHurt
      ) {
        this.updateAnimationState();
      }
    });
  }

  private updateJumpPose(): void {
    if (!this.isJumping || this.isJumpAttacking || this.isLanding) {
      return;
    }

    let key = 'joseph-jump-up';
    if (this.vz <= 50 && this.vz >= -50) {
      key = 'joseph-jump-apex';
    } else if (this.vz < -50) {
      key = 'joseph-jump-down';
    }

    if (this.anims.currentAnim?.key !== key) {
      this.play(key, true);
    }
  }

  private performSpecialAttack(currentTime: number): void {
    this.isSpecialAttacking = true;
    this.isInvulnerable = true;
    this.lastSpecialTime = currentTime;
    this.specialHasHit = false;
    this.specialFacingDirection = this.getFacingDirection();
    this.specialHitTargets.clear();
    this.weaponHitThisAttack = false;
    this.attackAnimationType = 'special';
    this.soundFX?.playSpecial();

    this.setVelocity(0, 0);
    this.setHitboxEnabled(false);
    this.specialHitbox.setPosition(this.x, this.y);
    this.setSpecialHitboxEnabled(true);
    this.play('joseph-attack', true);

    this.createSpecialSlashEffect();

    this.specialSpinEvent?.remove(false);
    this.specialSpinEvent = this.scene.time.addEvent({
      delay: SPECIAL_SPIN_INTERVAL_MS,
      repeat: SPECIAL_SPIN_REPEATS,
      callback: () => {
        this.setFlipX(!this.flipX);
      }
    });

    this.scene.time.delayedCall(SPECIAL_HITBOX_DURATION_MS, () => {
      if (this.active) {
        this.setSpecialHitboxEnabled(false);
      }
    });

    this.scene.time.delayedCall(SPECIAL_DURATION_MS, () => {
      if (this.active) {
        this.finishSpecialAttack();
      }
    });
  }

  private finishSpecialAttack(): void {
    this.specialSpinEvent?.remove(false);
    this.specialSpinEvent = undefined;

    this.isSpecialAttacking = false;
    this.isInvulnerable = false;
    this.setSpecialHitboxEnabled(false);
    this.setVelocity(0, 0);
    this.setFlipX(this.specialFacingDirection < 0);

    if (this.specialHasHit) {
      const nextHealth = Math.max(1, this.currentHealth - SPECIAL_HEALTH_COST);
      if (nextHealth !== this.currentHealth) {
        this.currentHealth = nextHealth;
        this.onHealthChanged?.(this.currentHealth, this.maxHealth);
      }
    }

    this.specialHasHit = false;
    this.specialHitTargets.clear();

    if (this.anims.currentAnim?.key === 'joseph-attack') {
      this.play('joseph-idle');
    }
  }

  private createSpecialSlashEffect(): void {
    const effect = this.scene.add.graphics();
    effect.setPosition(this.x, this.y - 18);
    effect.setDepth(this.y + 0.4);

    const state = { radius: 10, alpha: 1 };

    this.scene.tweens.add({
      targets: state,
      radius: 50,
      alpha: 0,
      duration: SPECIAL_SLASH_DURATION_MS,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        effect.clear();

        effect.lineStyle(3, 0xbfefff, state.alpha);
        effect.strokeCircle(0, 0, state.radius);

        effect.lineStyle(1, 0x4fc3ff, state.alpha * 0.9);
        effect.strokeCircle(0, 0, Math.max(1, state.radius - 6));

        effect.lineStyle(2, 0xffffff, state.alpha * 0.85);
        for (let i = 0; i < 4; i++) {
          const start = i * (Math.PI / 2) + 0.25;
          effect.beginPath();
          effect.arc(0, 0, state.radius, start, start + 0.45);
          effect.strokePath();
        }
      },
      onComplete: () => {
        effect.destroy();
      }
    });
  }

  private setSpecialHitboxEnabled(enabled: boolean): void {
    const body: Phaser.Physics.Arcade.Body = this.specialHitbox
      .body as Phaser.Physics.Arcade.Body;
    body.enable = enabled;
    this.specialHitbox.setActive(enabled);
  }

  private performAttack(time: number): void {
    this.isAttacking = true;
    this.lastAttackTime = time;
    this.attackAnimationType = 'normal';
    this.hitTargetsThisAttack.clear();
    this.weaponHitThisAttack = false;
    this.setHitboxEnabled(false);
    this.soundFX?.playSlash();

    const direction: number = this.getFacingDirection();

    // Play the katana animation (5 frames at 15 fps)
    this.play('joseph-attack', true);

    // Forward lunge (~30 px over 100 ms)
    const lungeSpeed: number = LUNGE_DISTANCE / (LUNGE_DURATION_MS / 1000);
    this.setVelocityX(direction * lungeSpeed);
    this.scene.time.delayedCall(LUNGE_DURATION_MS, () => {
      if (this.active && this.isAttacking) {
        this.setVelocityX(0);
      }
    });

    this.createWeaponSwingEffect();
  }

  /**
   * Coloured arc that makes a street-weapon swing readable even though Joseph
   * reuses the katana animation frames.
   */
  private createWeaponSwingEffect(): void {
    if (!this.currentWeapon) {
      return;
    }

    const color = WEAPON_SWING_COLORS[this.currentWeapon.kind];
    const direction = this.getFacingDirection();
    const effect = this.scene.add.graphics();
    effect.setPosition(this.x + direction * 8, this.y - 18);
    effect.setDepth(this.y + 0.6);

    const state = { radius: 12, alpha: 0.9 };

    this.scene.tweens.add({
      targets: state,
      radius: 34,
      alpha: 0,
      duration: 190,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        const start = direction > 0 ? -1.05 : Math.PI - 1.05;
        const end = direction > 0 ? 1.05 : Math.PI + 1.05;

        effect.clear();
        effect.lineStyle(3, color, state.alpha);
        effect.beginPath();
        effect.arc(0, 0, state.radius, start, end);
        effect.strokePath();
        effect.lineStyle(1, 0xffffff, state.alpha * 0.75);
        effect.beginPath();
        effect.arc(0, 0, Math.max(1, state.radius - 5), start, end);
        effect.strokePath();
      },
      onComplete: () => {
        effect.destroy();
      }
    });
  }

  private onAnimationUpdate(
    anim: Phaser.Animations.Animation,
    frame: Phaser.Animations.AnimationFrame
  ): void {
    if (anim.key === 'joseph-jump-slash') {
      if (this.attackAnimationType === 'jump') {
        this.setJumpAttackHitboxEnabled(this.isJumpAttacking);
      }
      return;
    }

    if (anim.key !== 'joseph-attack' || this.isSpecialAttacking) {
      return;
    }

    // The contact frames of the ground slash are 1, 2 and 3.
    const active: boolean = frame.index >= 1 && frame.index <= 3;

    if (this.attackAnimationType === 'normal') {
      this.setHitboxEnabled(active);
    }
  }

  private onAnimationComplete(anim: Phaser.Animations.Animation): void {
    if (anim.key === 'joseph-jump-slash') {
      this.attackAnimationType = null;
      this.isJumpAttacking = false;
      this.setJumpAttackHitboxEnabled(false);
      return;
    }

    if (anim.key === 'joseph-attack') {
      if (this.attackAnimationType === 'special') {
        this.attackAnimationType = null;
        return;
      }

      this.attackAnimationType = null;
      this.isAttacking = false;
      this.setHitboxEnabled(false);
      this.setVelocityX(0);
    } else if (anim.key === 'joseph-hurt') {
      this.isHurt = false;
    }
  }

  private setHitboxEnabled(enabled: boolean): void {
    const body: Phaser.Physics.Arcade.Body = this.hitbox.body as Phaser.Physics.Arcade.Body;
    body.enable = enabled;
    this.hitbox.setActive(enabled);
  }

  private setJumpAttackHitboxEnabled(enabled: boolean): void {
    const body: Phaser.Physics.Arcade.Body = this.jumpAttackHitbox
      .body as Phaser.Physics.Arcade.Body;
    body.enable = enabled;
    this.jumpAttackHitbox.setActive(enabled);
  }

  /**
   * Returns true only the first time a target is hit by the current swing.
   */
  public tryRegisterHit(target: Phaser.GameObjects.GameObject): boolean {
    if (this.hitTargetsThisAttack.has(target)) {
      return false;
    }
    this.hitTargetsThisAttack.add(target);
    return true;
  }

  public getAttackHitbox(): Phaser.GameObjects.Zone {
    return this.hitbox;
  }

  /**
   * Returns true only the first time a target is hit by the current special.
   * Also records that the special connected, so its health cost applies.
   */
  public tryRegisterSpecialHit(target: Phaser.GameObjects.GameObject): boolean {
    if (!this.isSpecialAttacking || this.specialHitTargets.has(target)) {
      return false;
    }

    this.specialHitTargets.add(target);
    this.specialHasHit = true;
    return true;
  }

  public getSpecialHitbox(): Phaser.GameObjects.Zone {
    return this.specialHitbox;
  }

  /**
   * Returns true only the first time an enemy is hit by the current aerial
   * slash. The aerial hitbox is only active while isJumpAttacking is true.
   */
  public tryRegisterJumpAttackHit(
    target: Phaser.GameObjects.GameObject
  ): boolean {
    if (!this.isJumpAttacking || this.jumpAttackHitTargets.has(target)) {
      return false;
    }

    this.jumpAttackHitTargets.add(target);
    return true;
  }

  public getJumpAttackHitbox(): Phaser.GameObjects.Zone {
    return this.jumpAttackHitbox;
  }

  public getFacingDirection(): number {
    return this.flipX ? -1 : 1;
  }

  /**
   * Equips a street weapon. `uses` lets a dropped weapon keep its remaining
   * durability when it is picked back up.
   */
  public equipWeapon(kind: WeaponKind, uses?: number): void {
    const definition = WEAPON_DEFINITIONS[kind];
    this.currentWeapon = {
      kind,
      uses: Math.max(1, Math.min(definition.uses, uses ?? definition.uses)),
      maxUses: definition.uses
    };
    this.weaponHitThisAttack = false;
    this.onWeaponChanged?.({ ...this.currentWeapon });
  }

  public getWeapon(): EquippedWeapon | null {
    return this.currentWeapon ? { ...this.currentWeapon } : null;
  }

  public hasWeapon(): boolean {
    return this.currentWeapon !== null;
  }

  /** Normal swings use the weapon damage; unarmed Joseph falls back to the katana. */
  public getAttackDamage(baseDamage: number): number {
    return this.currentWeapon
      ? WEAPON_DEFINITIONS[this.currentWeapon.kind].damage
      : baseDamage;
  }

  /**
   * Spends one use the first time the current swing connects with anything.
   * When the last use is consumed the weapon breaks and Joseph returns to the
   * katana immediately.
   */
  public registerWeaponImpact(): void {
    if (!this.currentWeapon || this.weaponHitThisAttack) {
      return;
    }

    this.weaponHitThisAttack = true;
    this.currentWeapon.uses -= 1;

    if (this.currentWeapon.uses > 0) {
      this.onWeaponChanged?.({ ...this.currentWeapon });
      return;
    }

    const brokenKind = this.currentWeapon.kind;
    this.currentWeapon = null;
    this.onWeaponChanged?.(null);
    this.onWeaponLost?.(brokenKind, 0, 'broken');
  }

  private dropWeapon(): void {
    if (!this.currentWeapon) {
      return;
    }

    const droppedKind = this.currentWeapon.kind;
    const usesRemaining = this.currentWeapon.uses;
    this.currentWeapon = null;
    this.onWeaponChanged?.(null);
    this.onWeaponLost?.(droppedKind, usesRemaining, 'dropped');
  }

  public getIsAttacking(): boolean {
    return this.isAttacking;
  }

  public getIsHurt(): boolean {
    return this.isHurt;
  }

  public getHealth(): number {
    return this.currentHealth;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public isAtMaxHealth(): boolean {
    return this.currentHealth >= this.maxHealth;
  }

  /**
   * Restores health up to the maximum and returns the amount actually healed.
   */
  public heal(amount: number): number {
    if (amount <= 0 || this.currentHealth >= this.maxHealth) {
      return 0;
    }

    const previousHealth = this.currentHealth;
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);

    const restored = this.currentHealth - previousHealth;
    if (restored > 0) {
      this.onHealthChanged?.(this.currentHealth, this.maxHealth);
    }

    return restored;
  }

  public takeDamage(damageData: DamageData): void {
    if (this.isInvulnerable || this.z > JUMP_DODGE_HEIGHT) {
      return;
    }

    // A solid hit makes Joseph drop his street weapon; the scene turns that
    // into a WeaponItem that can be picked up again.
    this.dropWeapon();

    this.currentHealth = Math.max(0, this.currentHealth - damageData.damage);
    this.onHealthChanged?.(this.currentHealth, this.maxHealth);
    this.soundFX?.playPlayerHurt();

    this.isAttacking = false;
    this.setHitboxEnabled(false);
    this.isHurt = true;
    this.play('joseph-hurt', true);

    // Apply knockback
    this.setVelocity(
      damageData.direction.x * damageData.knockbackForce,
      damageData.direction.y * damageData.knockbackForce * 0.6
    );

    this.scene.time.delayedCall(HURT_KNOCKBACK_MS, () => {
      if (this.active && this.isHurt) {
        this.setVelocity(0, 0);
      }
    });
  }
}
