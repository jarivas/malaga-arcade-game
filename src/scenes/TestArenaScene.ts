import Phaser from 'phaser';
import {
  Joseph,
  JOSEPH_JUMP_ATTACK_DAMAGE,
  JOSEPH_SPECIAL_DAMAGE
} from '../entities/player/Joseph';
import { Merdellon } from '../entities/enemies/Merdellon';
import { BreakableObject, type BreakableKind } from '../entities/objects/BreakableObject';
import { PickupItem, type PickupKind } from '../entities/objects/PickupItem';
import {
  createPropTextures,
  DEBRIS_WOOD_TEXTURE,
  PROP_SHEET_KEY
} from '../entities/objects/PropTextures';
import {
  WeaponItem,
  WEAPON_DEFINITIONS,
  type WeaponKind
} from '../entities/objects/WeaponItem';
import {
  PROJECTILE_BOTTLE_ANIM,
  PROJECTILE_KNIFE_ANIM,
  WeaponProjectile
} from '../entities/objects/WeaponProjectile';
import {
  createWeaponTextures,
  GLASS_SHARD_TEXTURE,
  METAL_SPARK_TEXTURE,
  PROJECTILE_BOTTLE_TEXTURE,
  PROJECTILE_KNIFE_TEXTURE,
  WEAPONS_SHEET_KEY
} from '../entities/objects/WeaponTextures';
import { HUD } from '../ui/HUD';
import { SoundFX } from '../audio/SoundFX';

// Level and combat-zone configuration.
const WORLD_WIDTH = 1400;
const WORLD_HEIGHT = 270;
const VIEW_WIDTH = 480;
const FLOOR_TOP = 135;
const FLOOR_BOTTOM = 255;
const LOCK_SCROLL_X = 480;
const WAVE_SIZE = 4;
const ENEMY_SPAWN_OUTSIDE = 48;
const ENEMY_ENTRY_DELAY_MS = 1400;
const SPAWN_Y_MIN = 140;
const SPAWN_Y_MAX = 255;
const KATANA_DAMAGE = 25;
const ENEMY_KILL_SCORE = 100;

// Breakable street props. They sit just outside the locked arena (world
// x 480..960) so the player can stock up before the wave and recover after it.
const BREAKABLE_LAYOUT: ReadonlyArray<{
  x: number;
  y: number;
  kind: BreakableKind;
}> = [
  // Before the arena: a small supply run on the way in.
  { x: 96, y: 210, kind: 'crate' },
  { x: 196, y: 162, kind: 'bin' },
  { x: 300, y: 228, kind: 'crate' },
  { x: 420, y: 174, kind: 'bin' },
  // After the arena: the recovery stretch.
  { x: 1012, y: 214, kind: 'crate' },
  { x: 1096, y: 164, kind: 'bin' },
  { x: 1184, y: 230, kind: 'crate' },
  { x: 1250, y: 172, kind: 'bin' },
  { x: 1330, y: 224, kind: 'crate' }
];

const PICKUP_DROP_CHANCE = 0.8;

// Street weapons available before, during and after the wave. They are
// overlap-only pickups, so they never block Joseph or the enemies.
const WEAPON_LAYOUT: ReadonlyArray<{
  x: number;
  y: number;
  kind: WeaponKind;
}> = [
  { x: 150, y: 214, kind: 'pipe' },
  { x: 352, y: 166, kind: 'bottle' },
  { x: 430, y: 238, kind: 'bat' },
  { x: 520, y: 150, kind: 'knife' },
  { x: 640, y: 210, kind: 'knife' },
  { x: 760, y: 238, kind: 'bottle' },
  { x: 1080, y: 168, kind: 'pipe' },
  { x: 1200, y: 238, kind: 'bat' },
  { x: 1340, y: 164, kind: 'knife' }
];

type CollisionObject =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;

// Rendering / UI.
const BACKGROUND_DEPTH = -1000;
const HUD_DEPTH = 9999;

// Invisible combat-zone barriers.
const BARRIER_WIDTH = 16;
const BARRIER_HEIGHT = (FLOOR_BOTTOM - FLOOR_TOP) + 32;

// GO! signal timing (fade in + fade out cycles).
const GO_BLINK_DURATION_MS = 3000;
const GO_BLINK_STEP_MS = 300;

export class TestArenaScene extends Phaser.Scene {
  private player!: Joseph;
  private enemies: Merdellon[] = [];
  private activeEnemiesCount = 0;
  private waveTriggered = false;
  private combatActive = false;
  private cameraLocked = false;
  private walkableBounds!: Phaser.Geom.Rectangle;

  private barriers?: Phaser.Physics.Arcade.StaticGroup;
  private barrierColliders: Phaser.Physics.Arcade.Collider[] = [];
  private readonly enemyOverlaps = new Map<Merdellon, Phaser.Physics.Arcade.Collider>();
  private readonly enemySpecialOverlaps = new Map<Merdellon, Phaser.Physics.Arcade.Collider>();
  private readonly enemyJumpAttackOverlaps = new Map<Merdellon, Phaser.Physics.Arcade.Collider>();
  private readonly enemyBarrierColliders = new Map<Merdellon, Phaser.Physics.Arcade.Collider>();
  private readonly enemyBreakableColliders = new Map<
    Merdellon,
    Phaser.Physics.Arcade.Collider[]
  >();
  private readonly weaponOverlaps = new Map<
    WeaponItem,
    Phaser.Physics.Arcade.Collider
  >();
  private pendingWeaponPickup: {
    item: WeaponItem;
    kind: WeaponKind;
    uses: number;
  } | null = null;
  private readonly projectiles: WeaponProjectile[] = [];
  private readonly projectileOverlaps = new Map<
    WeaponProjectile,
    Phaser.Physics.Arcade.Collider[]
  >();
  private readonly pickupOverlaps = new Map<
    PickupItem,
    Phaser.Physics.Arcade.Collider
  >();
  private breakableGroup!: Phaser.GameObjects.Group;

  private goText!: Phaser.GameObjects.Text;
  private goTween?: Phaser.Tweens.Tween;

  private soundFX!: SoundFX;
  private hud!: HUD;
  private score = 0;
  private readonly lives = 2;

  constructor() {
    super({ key: 'TestArenaScene' });
  }

  preload(): void {
    this.load.image('bg-malaga', 'assets/backgrounds/stage_malaga.png');
    this.load.image('portrait-joseph', 'assets/ui/portrait_joseph.png');
    this.load.image('portrait-enemy', 'assets/ui/portrait_enemy.png');
    this.load.spritesheet('joseph', 'assets/sprites/joseph.png', {
      frameWidth: 96,
      frameHeight: 96
    });
    this.load.spritesheet('joseph-jump', 'assets/sprites/joseph_jump.png', {
      frameWidth: 96,
      frameHeight: 96
    });
    this.load.spritesheet('joseph-weapons', 'assets/sprites/joseph_weapons.png', {
      frameWidth: 96,
      frameHeight: 96
    });
    this.load.spritesheet('enemy', 'assets/sprites/enemy.png', {
      frameWidth: 96,
      frameHeight: 96
    });
    this.load.image(PROP_SHEET_KEY, 'assets/sprites/props_pickups.png');
    this.load.image(WEAPONS_SHEET_KEY, 'assets/sprites/pickable_weapons.png');
  }

  create(): void {
    createPropTextures(this);
    createWeaponTextures(this);
    this.createAnimations();

    // Streak-level backdrop. The 720x270 street is repeated across the wider
    // level. Offsetting the tile places the texture seam on the camera-lock
    // boundary instead of the middle of the combat view.
    const bg = this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'bg-malaga').setOrigin(0, 0);
    bg.setDepth(BACKGROUND_DEPTH);
    bg.tilePositionX = LOCK_SCROLL_X / 2;

    // Full scrolling level bounds.
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Procedural arcade SFX, injected into the player.
    this.soundFX = new SoundFX(this);

    // Joseph starts centered in the initial view, facing right, on the road.
    this.player = new Joseph(this, 240, 200, this.soundFX);

    // Walkable asphalt strip shared by Joseph and every spawned enemy. The
    // feet body is 14 px tall, so the bounds start one body-height above
    // FLOOR_TOP; the body's bottom edge (the feet) stops exactly at the floor.
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const footBodyHeight: number = playerBody.height;
    this.walkableBounds = new Phaser.Geom.Rectangle(
      0,
      FLOOR_TOP - footBodyHeight,
      WORLD_WIDTH,
      (FLOOR_BOTTOM - FLOOR_TOP) + footBodyHeight
    );
    playerBody.setBoundsRectangle(this.walkableBounds);
    this.player.setCollideWorldBounds(true);

    // Camera follows Joseph until the lock point is reached.
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // Camera-fixed controls hint, moved to the bottom to keep the top-left
    // free for the player HUD panel. Keyboard and gamepad are listed on
    // separate lines so the keyboard's movement "A" is not confused with the
    // gamepad's attack button "A".
    this.add.text(
      8,
      WORLD_HEIGHT - 8,
      'TECLADO: WASD mover / J atacar\nMANDO: stick mover / botón A atacar\nSALTO: Espacio/K / B · AÉREO: J/A en el aire\nESPECIAL: U o J+K / Y o A+B',
      {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#c8c8e0',
        lineSpacing: 2
      }
    )
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setShadow(1, 1, '#000000', 2);

    // Retro "GO! ➔" sign. Hidden until the active wave is cleared.
    this.goText = this.add.text(VIEW_WIDTH - 12, 12, 'GO! ➔', {
      fontFamily: 'monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 4
    })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setShadow(2, 2, '#8b0000', 0)
      .setVisible(false);

    // HUD: player panel, score/lives and active-enemy bar.
    this.hud = new HUD(this);
    this.hud.setPlayerHealth(this.player.getHealth(), this.player.getMaxHealth());
    this.hud.setScore(this.score);
    this.hud.setLives(this.lives);
    this.player.onHealthChanged = (health, max) => {
      this.hud.setPlayerHealth(health, max);
    };
    this.player.onWeaponChanged = (weapon) => {
      if (weapon) {
        this.hud.setWeapon(WEAPON_DEFINITIONS[weapon.kind].iconTexture, weapon.uses);
      } else {
        this.hud.clearWeapon();
      }
    };
    this.player.onWeaponLost = (kind, usesRemaining, reason) => {
      const x = this.player.x;
      const y = this.player.getGroundY();

      if (kind === 'bottle' && reason === 'broken') {
        this.spawnGlassShards(x, y, 12);
      }

      if (kind === 'bat' && reason === 'broken') {
        this.spawnWoodSplinters(x, y, 12);
        this.soundFX.playBreak();
      }

      if (reason === 'dropped' && usesRemaining > 0) {
        this.spawnWeaponItem(x, y, kind, usesRemaining, 700, true);
      }
    };
    this.player.onWeaponThrown = (kind, x, y, direction) => {
      this.spawnProjectile(kind, x, y, direction);
    };
    this.player.onPickupFrame = () => {
      this.completeWeaponPickup();
    };
    this.player.onPickupCancelled = () => {
      this.pendingWeaponPickup = null;
    };

    // Breakable recovery props and their pickups.
    this.createBreakableProps();
    this.createWeaponItems();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.combatActive = false;
      this.player.onHealthChanged = undefined;
      this.player.onWeaponChanged = undefined;
      this.player.onWeaponLost = undefined;
      this.player.onWeaponThrown = undefined;
      this.player.onPickupFrame = undefined;
      this.player.onPickupCancelled = undefined;
      this.pendingWeaponPickup = null;
      for (const overlap of this.pickupOverlaps.values()) {
        overlap.destroy();
      }
      this.pickupOverlaps.clear();
      for (const overlap of this.weaponOverlaps.values()) {
        overlap.destroy();
      }
      this.weaponOverlaps.clear();
      for (const colliders of this.projectileOverlaps.values()) {
        for (const collider of colliders) {
          collider.destroy();
        }
      }
      this.projectileOverlaps.clear();
      for (const projectile of [...this.projectiles]) {
        if (projectile.active) {
          projectile.destroy();
        }
      }
      this.projectiles.length = 0;
      this.hud.destroy();
      this.soundFX.destroy();
    });
  }

  update(): void {
    // Camera lock: hold the view at the arena entrance while the wave lives.
    if (this.cameraLocked) {
      this.cameras.main.scrollX = LOCK_SCROLL_X;
    } else if (!this.waveTriggered && this.cameras.main.scrollX >= LOCK_SCROLL_X) {
      this.startCombat();
    }

    for (const enemy of this.enemies) {
      if (enemy.active && enemy.isAlive()) {
        // Enemies update after the physics step, so their depth is the
        // post-movement feet Y (strict Y-Sort) and their AI faces Joseph.
        enemy.update(this.player);
      }
    }

    // Joseph's preUpdate runs before physics; re-apply his feet depth here so
    // he and the dynamically spawned enemies sort on the same frame.
    this.player.updateDepth();

    // A weapon dropped by damage stays locked until Joseph steps away once.
    for (const item of this.weaponOverlaps.keys()) {
      if (item.active) {
        item.updatePickupAvailability(this.player.x, this.player.y);
      }
    }

    // Projectiles that leave the level are removed before their lifetime ends.
    for (const projectile of [...this.projectiles]) {
      if (
        projectile.active &&
        (projectile.x < -60 || projectile.x > WORLD_WIDTH + 60)
      ) {
        projectile.destroy();
      }
    }
  }

  private createBreakableProps(): void {
    this.breakableGroup = this.add.group();

    for (const layout of BREAKABLE_LAYOUT) {
      const breakable = new BreakableObject(this, layout.x, layout.y, layout.kind, {
        soundFX: this.soundFX,
        onBreak: (object) => this.onBreakableBroken(object)
      });
      this.breakableGroup.add(breakable);
    }

    // props are solid street furniture: Joseph and walking enemies collide.
    this.physics.add.collider(this.player, this.breakableGroup);

    // All three katana hitboxes can destroy props.
    this.physics.add.overlap(
      this.player.getAttackHitbox(),
      this.breakableGroup,
      this.onKatanaHitBreakable,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player.getSpecialHitbox(),
      this.breakableGroup,
      this.onSpecialHitBreakable,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player.getJumpAttackHitbox(),
      this.breakableGroup,
      this.onJumpAttackHitBreakable,
      undefined,
      this
    );
  }

  private createWeaponItems(): void {
    for (const layout of WEAPON_LAYOUT) {
      this.spawnWeaponItem(layout.x, layout.y, layout.kind);
    }
  }

  private spawnWeaponItem(
    x: number,
    y: number,
    kind: WeaponKind,
    uses?: number,
    pickupDelayMs = 300,
    requiresClearDistance = false
  ): void {
    const item = new WeaponItem(this, x, y, kind, uses, {
      pickupDelayMs,
      requiresClearDistance
    });
    const overlap = this.physics.add.overlap(
      this.player,
      item,
      () => this.collectWeaponItem(item),
      undefined,
      this
    );

    this.weaponOverlaps.set(item, overlap);
    item.once(Phaser.GameObjects.Events.DESTROY, () => {
      overlap.destroy();
      this.weaponOverlaps.delete(item);
    });
  }

  private collectWeaponItem(item: WeaponItem): void {
    if (
      !item.active ||
      item.isCollected() ||
      !item.canBeCollected(this.player.x, this.player.y) ||
      this.player.hasWeapon() ||
      this.pendingWeaponPickup
    ) {
      return;
    }

    if (!this.player.playPickup()) {
      return;
    }

    // The weapon is equipped and the pickup removed on frame 1 of the crouch.
    this.pendingWeaponPickup = {
      item,
      kind: item.kind,
      uses: item.uses
    };
  }

  private completeWeaponPickup(): void {
    const pending = this.pendingWeaponPickup;
    this.pendingWeaponPickup = null;

    if (
      !pending ||
      !pending.item.active ||
      pending.item.isCollected() ||
      this.player.hasWeapon()
    ) {
      return;
    }

    this.player.equipWeapon(pending.kind, pending.uses);
    this.soundFX.playPickup();
    pending.item.collect();
  }

  private spawnProjectile(
    kind: 'bottle' | 'knife',
    x: number,
    y: number,
    direction: number
  ): void {
    const projectile = new WeaponProjectile(this, x, y, kind, direction);
    this.projectiles.push(projectile);

    for (const enemy of this.enemies) {
      if (enemy.active && enemy.isAlive()) {
        this.registerProjectileEnemyOverlap(projectile, enemy);
      }
    }

    projectile.once(Phaser.GameObjects.Events.DESTROY, () => {
      const index = this.projectiles.indexOf(projectile);
      if (index !== -1) {
        this.projectiles.splice(index, 1);
      }

      const colliders = this.projectileOverlaps.get(projectile);
      if (colliders) {
        for (const collider of colliders) {
          collider.destroy();
        }
        this.projectileOverlaps.delete(projectile);
      }
    });
  }

  private registerProjectileEnemyOverlap(
    projectile: WeaponProjectile,
    enemy: Merdellon
  ): void {
    const overlap = this.physics.add.overlap(
      projectile,
      enemy,
      () => this.onProjectileHitEnemy(projectile, enemy),
      undefined,
      this
    );

    const colliders = this.projectileOverlaps.get(projectile);
    if (colliders) {
      colliders.push(overlap);
    } else {
      this.projectileOverlaps.set(projectile, [overlap]);
    }
  }

  private onProjectileHitEnemy(
    projectile: WeaponProjectile,
    enemy: Merdellon
  ): void {
    if (
      !projectile.active ||
      projectile.isConsumed() ||
      !enemy.active ||
      !enemy.isAlive()
    ) {
      return;
    }

    const direction =
      (projectile.body as Phaser.Physics.Arcade.Body).velocity.x >= 0 ? 1 : -1;
    const impactX = projectile.x;
    const impactY = projectile.y;

    if (!projectile.consume()) {
      return;
    }

    enemy.takeProjectileDamage(projectile.damage, direction);
    this.soundFX.playHit();
    if (enemy.getHealth() === 0) {
      this.soundFX.playEnemyDeath();
    }
    this.refreshEnemyPanel(enemy);

    if (projectile.kind === 'bottle') {
      this.spawnGlassShards(impactX, impactY, 14);
    } else {
      this.spawnMetalSparks(impactX, impactY, 10);
    }
  }

  /**
   * Spends one melee weapon use when a swing connects. Throwables are spent
   * on their release frame instead.
   */
  private registerWeaponImpact(_x: number, _y: number): void {
    this.player.registerWeaponImpact();
  }

  private spawnMetalSparks(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const startX = x + Phaser.Math.Between(-4, 4);
      const startY = y + Phaser.Math.Between(-6, 6);
      const endX = startX + Phaser.Math.Between(-26, 26);
      const endY = y + Phaser.Math.Between(-18, 14);
      const duration = Phaser.Math.Between(150, 320);
      const startAngle = Phaser.Math.Between(0, 360);
      const spin = Phaser.Math.Between(-720, 720);

      const spark = this.add
        .image(startX, startY, METAL_SPARK_TEXTURE)
        .setDepth(y + 1)
        .setAngle(startAngle)
        .setScale(Phaser.Math.FloatBetween(0.6, 1.15));

      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration,
        ease: 'Quad.easeOut',
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 0;
          const fadeStart = 0.55;
          const alpha =
            t <= fadeStart ? 1 : 1 - (t - fadeStart) / (1 - fadeStart);

          spark.setPosition(
            Phaser.Math.Linear(startX, endX, t),
            Phaser.Math.Linear(startY, endY, t)
          );
          spark.setAngle(startAngle + spin * t);
          spark.setAlpha(alpha);
        },
        onComplete: () => {
          spark.destroy();
        }
      });
    }
  }

  private spawnGlassShards(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const startX = x + Phaser.Math.Between(-8, 8);
      const startY = y - Phaser.Math.Between(4, 24);
      const endX = startX + Phaser.Math.Between(-30, 30);
      const endY = y + Phaser.Math.Between(-2, 3);
      const peak = Phaser.Math.Between(10, 24);
      const duration = Phaser.Math.Between(240, 450);
      const startAngle = Phaser.Math.Between(0, 360);
      const spin = Phaser.Math.Between(-480, 480);

      const shard = this.add
        .image(startX, startY, GLASS_SHARD_TEXTURE)
        .setDepth(y + 0.9)
        .setAngle(startAngle)
        .setScale(Phaser.Math.FloatBetween(0.6, 1.1))
        .setFlipX(Math.random() < 0.5)
        .setFlipY(Math.random() < 0.5);

      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration,
        ease: 'Linear',
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 0;
          const fadeStart = 0.65;
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

  private spawnWoodSplinters(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const startX = x + Phaser.Math.Between(-10, 10);
      const startY = y - Phaser.Math.Between(6, 26);
      const endX = startX + Phaser.Math.Between(-40, 40);
      const endY = y + Phaser.Math.Between(-2, 3);
      const peak = Phaser.Math.Between(14, 30);
      const duration = Phaser.Math.Between(360, 600);
      const startAngle = Phaser.Math.Between(0, 360);
      const spin = Phaser.Math.Between(-560, 560);

      const splinter = this.add
        .image(startX, startY, DEBRIS_WOOD_TEXTURE)
        .setDepth(y + 0.9)
        .setAngle(startAngle)
        .setScale(Phaser.Math.FloatBetween(0.7, 1.3))
        .setFlipX(Math.random() < 0.5)
        .setFlipY(Math.random() < 0.5);

      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration,
        ease: 'Linear',
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 0;
          const fadeStart = 0.68;
          const alpha =
            t <= fadeStart ? 1 : 1 - (t - fadeStart) / (1 - fadeStart);

          splinter.setPosition(
            Phaser.Math.Linear(startX, endX, t),
            Phaser.Math.Linear(startY, endY, t) -
              Math.sin(Math.PI * t) * peak
          );
          splinter.setAngle(startAngle + spin * t);
          splinter.setAlpha(alpha);
        },
        onComplete: () => {
          splinter.destroy();
        }
      });
    }
  }

  private onKatanaHitBreakable(
    _hitbox: CollisionObject,
    breakableObject: CollisionObject
  ): void {
    const breakable = breakableObject as BreakableObject;
    if (!(breakable instanceof BreakableObject) || !breakable.active) {
      return;
    }

    // One hit per prop per swing.
    if (!this.player.tryRegisterHit(breakable)) {
      return;
    }

    this.registerWeaponImpact(breakable.x, breakable.y - 12);
    breakable.hit();
  }

  private onSpecialHitBreakable(
    _hitbox: CollisionObject,
    breakableObject: CollisionObject
  ): void {
    const breakable = breakableObject as BreakableObject;
    if (!(breakable instanceof BreakableObject) || !breakable.active) {
      return;
    }

    // One hit per prop per spin. A special that only connects with a prop still
    // counts as a hit for the 8 HP cost.
    if (!this.player.tryRegisterSpecialHit(breakable)) {
      return;
    }

    this.registerWeaponImpact(breakable.x, breakable.y - 12);
    breakable.hit();
  }

  private onJumpAttackHitBreakable(
    _hitbox: CollisionObject,
    breakableObject: CollisionObject
  ): void {
    const breakable = breakableObject as BreakableObject;
    if (!(breakable instanceof BreakableObject) || !breakable.active) {
      return;
    }

    if (!this.player.tryRegisterJumpAttackHit(breakable)) {
      return;
    }

    this.registerWeaponImpact(breakable.x, breakable.y - 12);
    breakable.hit();
  }

  private onEnemyKnockdownBreakable(
    enemyObject: CollisionObject,
    breakableObject: CollisionObject
  ): void {
    const enemy = enemyObject as Merdellon;
    const breakable = breakableObject as BreakableObject;
    if (
      !(enemy instanceof Merdellon) ||
      !(breakable instanceof BreakableObject) ||
      !enemy.active ||
      !enemy.isAlive() ||
      !enemy.getIsKnockedDown()
    ) {
      return;
    }

    // A body launched by the special or the aerial slash smashes the prop.
    if (!breakable.tryRegisterImpact(enemy)) {
      return;
    }

    breakable.hit();
  }

  private canEnemyCollideWithBreakable(
    enemyObject: CollisionObject,
    _breakableObject: CollisionObject
  ): boolean {
    const enemy = enemyObject as Merdellon;
    return (
      enemy instanceof Merdellon &&
      enemy.active &&
      enemy.isAlive() &&
      !enemy.getIsKnockedDown()
    );
  }

  private onBreakableBroken(breakable: BreakableObject): void {
    if (Math.random() >= PICKUP_DROP_CHANCE) {
      return;
    }

    this.spawnPickup(breakable.x, breakable.y, this.rollPickupKind());
  }

  private spawnPickup(x: number, y: number, kind: PickupKind): void {
    const item = new PickupItem(this, x, y, kind);

    const overlap = this.physics.add.overlap(
      this.player,
      item,
      () => this.collectPickup(item),
      undefined,
      this
    );

    this.pickupOverlaps.set(item, overlap);
    item.once(Phaser.GameObjects.Events.DESTROY, () => {
      overlap.destroy();
      this.pickupOverlaps.delete(item);
    });
  }

  private collectPickup(item: PickupItem): void {
    if (!item.active || item.isCollected()) {
      return;
    }

    const pickupX = item.x;
    const pickupY = item.y;
    const healAmount = item.healAmount;
    const scoreValue = item.scoreValue;

    if (healAmount > 0 && !this.player.isAtMaxHealth()) {
      const restored = this.player.heal(healAmount);
      if (restored > 0) {
        this.showFloatingText(
          pickupX - 10,
          pickupY - 20,
          `+${restored} HP`,
          '#7dff8a'
        );
      }
    }

    if (scoreValue > 0) {
      this.addScore(scoreValue);
      this.showFloatingText(
        pickupX + 12,
        pickupY - 31,
        `+${scoreValue}`,
        '#ffd24a'
      );
    }

    this.soundFX.playPickup();
    item.collect();
  }

  private rollPickupKind(): PickupKind {
    const roll = Math.random();
    if (roll < 0.3) {
      return 'campero';
    }
    if (roll < 0.75) {
      return 'refresco';
    }
    return 'dinero';
  }

  private addScore(points: number): void {
    if (points <= 0) {
      return;
    }

    this.score += points;
    this.hud.setScore(this.score);
  }

  private showFloatingText(
    x: number,
    y: number,
    message: string,
    color: string
  ): void {
    const text = this.add
      .text(x, y, message, {
        fontFamily: 'monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5, 1)
      .setDepth(HUD_DEPTH - 1)
      .setScale(0.7);

    this.tweens.add({
      targets: text,
      scale: 1,
      duration: 120,
      ease: 'Back.easeOut'
    });

    this.tweens.add({
      targets: text,
      y: y - 26,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => {
        text.destroy();
      }
    });
  }

  private startCombat(): void {
    this.waveTriggered = true;
    this.combatActive = true;
    this.cameraLocked = true;
    this.cameras.main.stopFollow();
    this.cameras.main.scrollX = LOCK_SCROLL_X;

    this.goTween?.stop();
    this.goText.setVisible(false);

    this.createBarriers();
    this.spawnWave();

    // The enemies spawn just outside the screen and walk in. Give them a
    // moment to cross the barrier line before trapping them in the arena.
    this.time.delayedCall(ENEMY_ENTRY_DELAY_MS, () => this.addEnemyBarrierColliders());
  }

  private createBarriers(): void {
    const centerY = (FLOOR_TOP + FLOOR_BOTTOM) / 2;
    const leftX = LOCK_SCROLL_X - BARRIER_WIDTH / 2;
    const rightX = LOCK_SCROLL_X + VIEW_WIDTH + BARRIER_WIDTH / 2;

    this.barriers = this.physics.add.staticGroup();

    const left = this.add
      .rectangle(leftX, centerY, BARRIER_WIDTH, BARRIER_HEIGHT, 0xff0000, 0)
      .setVisible(false);
    const right = this.add
      .rectangle(rightX, centerY, BARRIER_WIDTH, BARRIER_HEIGHT, 0xff0000, 0)
      .setVisible(false);

    this.physics.add.existing(left, true);
    this.physics.add.existing(right, true);

    this.barriers.add(left);
    this.barriers.add(right);

    // Joseph is confined immediately. Enemy colliders are added after the
    // walk-in delay, once they have crossed the barrier line.
    this.barrierColliders.push(this.physics.add.collider(this.player, this.barriers));
  }

  private spawnWave(): void {
    this.activeEnemiesCount = WAVE_SIZE;

    // Shuffled lanes guarantee distinct Y positions. Enemies spawn just
    // outside the locked screen so they walk in from both sides.
    const laneOrder = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]);
    const laneHeight = (SPAWN_Y_MAX - SPAWN_Y_MIN) / WAVE_SIZE;
    const leftX = LOCK_SCROLL_X - ENEMY_SPAWN_OUTSIDE;
    const rightX = LOCK_SCROLL_X + VIEW_WIDTH + ENEMY_SPAWN_OUTSIDE;

    for (let i = 0; i < WAVE_SIZE; i++) {
      const fromRight = i < WAVE_SIZE / 2;
      const x = fromRight ? rightX : leftX;
      const y = Phaser.Math.Clamp(
        SPAWN_Y_MIN + laneHeight * (laneOrder[i] + 0.5) + Phaser.Math.Between(-4, 4),
        SPAWN_Y_MIN,
        SPAWN_Y_MAX
      );

      const enemy = new Merdellon(this, x, y);
      enemy.setFlipX(fromRight);
      this.applyWalkableBounds(enemy);
      this.enemies.push(enemy);
      this.registerEnemy(enemy);
    }
  }

  private applyWalkableBounds(enemy: Merdellon): void {
    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.setBoundsRectangle(this.walkableBounds);
    enemy.setCollideWorldBounds(true);
  }

  private registerEnemy(enemy: Merdellon): void {
    const overlap = this.physics.add.overlap(
      this.player.getAttackHitbox(),
      enemy,
      this.onKatanaHit,
      undefined,
      this
    );
    this.enemyOverlaps.set(enemy, overlap);

    const specialOverlap = this.physics.add.overlap(
      this.player.getSpecialHitbox(),
      enemy,
      this.onSpecialHit,
      undefined,
      this
    );
    this.enemySpecialOverlaps.set(enemy, specialOverlap);

    const jumpAttackOverlap = this.physics.add.overlap(
      this.player.getJumpAttackHitbox(),
      enemy,
      this.onJumpAttackHit,
      undefined,
      this
    );
    this.enemyJumpAttackOverlaps.set(enemy, jumpAttackOverlap);

    // Walking enemies bump into props; knocked-down bodies pass through and
    // smash them via the overlap callback above.
    const breakableCollider = this.physics.add.collider(
      enemy,
      this.breakableGroup,
      undefined,
      this.canEnemyCollideWithBreakable,
      this
    );
    const breakableKnockdownOverlap = this.physics.add.overlap(
      enemy,
      this.breakableGroup,
      this.onEnemyKnockdownBreakable,
      undefined,
      this
    );
    this.enemyBreakableColliders.set(enemy, [
      breakableCollider,
      breakableKnockdownOverlap
    ]);

    // Projectiles already in flight can hit enemies that spawn later.
    for (const projectile of this.projectiles) {
      if (projectile.active && !projectile.isConsumed()) {
        this.registerProjectileEnemyOverlap(projectile, enemy);
      }
    }

    enemy.once(Phaser.GameObjects.Events.DESTROY, () => this.onEnemyDestroyed(enemy));
  }

  private addEnemyBarrierColliders(): void {
    if (!this.combatActive || !this.barriers) {
      return;
    }

    for (const enemy of this.enemies) {
      if (!enemy.active || !enemy.isAlive() || this.enemyBarrierColliders.has(enemy)) {
        continue;
      }

      this.enemyBarrierColliders.set(enemy, this.physics.add.collider(enemy, this.barriers));
    }
  }

  private onEnemyDestroyed(enemy: Merdellon): void {
    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }

    this.enemyOverlaps.get(enemy)?.destroy();
    this.enemyOverlaps.delete(enemy);

    this.enemySpecialOverlaps.get(enemy)?.destroy();
    this.enemySpecialOverlaps.delete(enemy);

    this.enemyJumpAttackOverlaps.get(enemy)?.destroy();
    this.enemyJumpAttackOverlaps.delete(enemy);

    this.enemyBarrierColliders.get(enemy)?.destroy();
    this.enemyBarrierColliders.delete(enemy);

    const breakableColliders = this.enemyBreakableColliders.get(enemy);
    if (breakableColliders) {
      for (const collider of breakableColliders) {
        collider.destroy();
      }
      this.enemyBreakableColliders.delete(enemy);
    }

    if (!this.combatActive) {
      return;
    }

    this.addScore(ENEMY_KILL_SCORE);
    this.hud.hideEnemyFor(enemy);

    this.activeEnemiesCount = Math.max(0, this.activeEnemiesCount - 1);
    if (this.activeEnemiesCount === 0) {
      this.finishWave();
    }
  }

  private finishWave(): void {
    this.combatActive = false;
    this.cameraLocked = false;
    this.removeBarriers();
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.showGoSignal();
  }

  private removeBarriers(): void {
    for (const collider of this.barrierColliders) {
      collider.destroy();
    }
    this.barrierColliders = [];

    for (const collider of this.enemyBarrierColliders.values()) {
      collider.destroy();
    }
    this.enemyBarrierColliders.clear();

    this.barriers?.clear(true, true);
    this.barriers?.destroy(true);
    this.barriers = undefined;
  }

  private showGoSignal(): void {
    this.soundFX.playGo();
    this.goTween?.stop();
    this.goText.setVisible(true).setAlpha(0);

    this.goTween = this.tweens.add({
      targets: this.goText,
      alpha: 1,
      duration: GO_BLINK_STEP_MS,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: Math.max(0, Math.round(GO_BLINK_DURATION_MS / (GO_BLINK_STEP_MS * 2)) - 1),
      onComplete: () => {
        this.goText.setVisible(false).setAlpha(1);
        this.goTween = undefined;
      }
    });
  }

  private createAnimations(): void {
    // Animations are global in Phaser. Remove any previous versions so a scene
    // restart or HMR reload always rebuilds them with the current frame ranges.
    const animationKeys = [
      'joseph-idle',
      'joseph-run',
      'joseph-attack',
      'joseph-hurt',
      'joseph-pickup',
      'joseph-idle-pipe',
      'joseph-idle-bat',
      'joseph-idle-bottle',
      'joseph-idle-knife',
      'joseph-attack-pipe',
      'joseph-attack-bat',
      'joseph-throw-bottle',
      'joseph-throw-knife',
      'joseph-jump-up',
      'joseph-jump-apex',
      'joseph-jump-down',
      'joseph-jump-land',
      'joseph-jump-slash',
      'projectile-bottle-spin',
      'projectile-knife-spin',
      'enemy-idle',
      'enemy-walk',
      'enemy-attack',
      'enemy-hurt'
    ];

    for (const key of animationKeys) {
      if (this.anims.exists(key)) {
        this.anims.remove(key);
      }
    }

    // Joseph: idle 0-4, run 5-12, attack 13-17, hurt 18-22
    this.anims.create({
      key: 'joseph-idle',
      frames: this.anims.generateFrameNumbers('joseph', { start: 0, end: 4 }),
      frameRate: 8,
      repeat: -1
    });

    // Frames 11 and 12 are nearly identical. Ending the cycle at 11 avoids
    // holding the tucked-knee pose for two consecutive frames.
    this.anims.create({
      key: 'joseph-run',
      frames: this.anims.generateFrameNumbers('joseph', { start: 5, end: 11 }),
      frameRate: 12,
      repeat: -1
    });

    this.anims.create({
      key: 'joseph-attack',
      frames: this.anims.generateFrameNumbers('joseph', { start: 13, end: 17 }),
      frameRate: 15,
      repeat: 0
    });

    this.anims.create({
      key: 'joseph-hurt',
      frames: this.anims.generateFrameNumbers('joseph', { start: 18, end: 22 }),
      frameRate: 10,
      repeat: 0
    });

    // Weapon sheet v5 (4x5 grid of 96x96 frames). Frames 0-3 pickup, 4-7 pipe
    // swing, 8-11 bat swing, 12-15 bottle throw, 16-19 knife throw.
    this.anims.create({
      key: 'joseph-pickup',
      frames: this.anims.generateFrameNumbers('joseph-weapons', { start: 0, end: 3 }),
      frameRate: 12,
      repeat: 0
    });

    // Holding a street weapon uses that weapon's ready pose as the idle. The
    // base joseph-idle belongs to the katana sheet and would show the wrong
    // stance while Joseph carries a bottle, knife, pipe or bat.
    this.anims.create({
      key: 'joseph-idle-pipe',
      frames: this.anims.generateFrameNumbers('joseph-weapons', { start: 7, end: 7 }),
      frameRate: 1,
      repeat: -1
    });

    this.anims.create({
      key: 'joseph-idle-bat',
      frames: this.anims.generateFrameNumbers('joseph-weapons', { start: 8, end: 8 }),
      frameRate: 1,
      repeat: -1
    });

    this.anims.create({
      key: 'joseph-idle-bottle',
      frames: this.anims.generateFrameNumbers('joseph-weapons', { start: 12, end: 12 }),
      frameRate: 1,
      repeat: -1
    });

    this.anims.create({
      key: 'joseph-idle-knife',
      frames: this.anims.generateFrameNumbers('joseph-weapons', { start: 16, end: 16 }),
      frameRate: 1,
      repeat: -1
    });

    this.anims.create({
      key: 'joseph-attack-pipe',
      frames: this.anims.generateFrameNumbers('joseph-weapons', { start: 4, end: 7 }),
      frameRate: 15,
      repeat: 0
    });

    this.anims.create({
      key: 'joseph-attack-bat',
      frames: this.anims.generateFrameNumbers('joseph-weapons', { start: 8, end: 11 }),
      frameRate: 15,
      repeat: 0
    });

    this.anims.create({
      key: 'joseph-throw-bottle',
      frames: this.anims.generateFrameNumbers('joseph-weapons', { start: 12, end: 15 }),
      frameRate: 18,
      repeat: 0
    });

    this.anims.create({
      key: 'joseph-throw-knife',
      frames: this.anims.generateFrameNumbers('joseph-weapons', { start: 16, end: 19 }),
      frameRate: 18,
      repeat: 0
    });

    // Two alternating rotation frames per thrown object: the bottle spins at
    // 12 fps and the knife at 15 fps. The knife skips the first pose, which is
    // an almost edge-on 3 px sliver and reads as a stick in flight.
    this.anims.create({
      key: PROJECTILE_BOTTLE_ANIM,
      frames: this.anims.generateFrameNumbers(PROJECTILE_BOTTLE_TEXTURE, {
        start: 0,
        end: 1
      }),
      frameRate: 12,
      repeat: -1
    });

    this.anims.create({
      key: PROJECTILE_KNIFE_ANIM,
      frames: this.anims.generateFrameNumbers(PROJECTILE_KNIFE_TEXTURE, {
        start: 1,
        end: 2
      }),
      frameRate: 15,
      repeat: -1
    });

    // Jump cycle: 1 rise, 2 apex, 3 fall, 4 landing.
    // Frame 2 is exposed as its own apex animation so the vz logic can hold
    // the guard pose while Joseph floats at the top of the jump.
    this.anims.create({
      key: 'joseph-jump-up',
      frames: this.anims.generateFrameNumbers('joseph-jump', { start: 1, end: 1 }),
      frameRate: 1,
      repeat: -1
    });

    this.anims.create({
      key: 'joseph-jump-apex',
      frames: this.anims.generateFrameNumbers('joseph-jump', { start: 2, end: 2 }),
      frameRate: 1,
      repeat: -1
    });

    this.anims.create({
      key: 'joseph-jump-down',
      frames: this.anims.generateFrameNumbers('joseph-jump', { start: 3, end: 3 }),
      frameRate: 1,
      repeat: -1
    });

    this.anims.create({
      key: 'joseph-jump-land',
      frames: [{ key: 'joseph-jump', frame: 4, duration: 80 }],
      repeat: 0
    });

    // Row 2 of the jump sheet: 5 overhead, 6 wide slash, 7 kick.
    this.anims.create({
      key: 'joseph-jump-slash',
      frames: this.anims.generateFrameNumbers('joseph-jump', { start: 5, end: 7 }),
      frameRate: 15,
      repeat: 0
    });

    // Enemy: idle 0-4, walk 5-10, attack 11-15, hurt 16-20
    this.anims.create({
      key: 'enemy-idle',
      frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 4 }),
      frameRate: 7,
      repeat: -1
    });

    this.anims.create({
      key: 'enemy-walk',
      frames: this.anims.generateFrameNumbers('enemy', { start: 5, end: 10 }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'enemy-attack',
      frames: this.anims.generateFrameNumbers('enemy', { start: 11, end: 15 }),
      frameRate: 12,
      repeat: 0
    });

    this.anims.create({
      key: 'enemy-hurt',
      frames: this.anims.generateFrameNumbers('enemy', { start: 16, end: 20 }),
      frameRate: 10,
      repeat: 0
    });
  }

  private onKatanaHit(
    _object1:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
    object2:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile
  ): void {
    const target: Merdellon = object2 as Merdellon;
    if (!target.active || !target.isAlive()) {
      return;
    }

    // One hit per target per swing
    if (!this.player.tryRegisterHit(target)) {
      return;
    }

    const damage = this.player.getAttackDamage(KATANA_DAMAGE);
    const direction = this.player.getFacingDirection();

    // The bat trades a little reach for a heavy knockdown.
    if (this.player.isBatSwing()) {
      target.takeBatDamage(damage, direction);
    } else {
      target.takeDamage(damage, direction);
    }

    this.registerWeaponImpact(target.x, target.y - 16);
    this.soundFX.playHit();
    if (target.getHealth() === 0) {
      this.soundFX.playEnemyDeath();
    }
    this.refreshEnemyPanel(target);
  }

  private onSpecialHit(
    _object1:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
    object2:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile
  ): void {
    const target: Merdellon = object2 as Merdellon;
    if (!target.active || !target.isAlive()) {
      return;
    }

    // One special hit per enemy and per spin.
    if (!this.player.tryRegisterSpecialHit(target)) {
      return;
    }

    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const length = Math.hypot(dx, dy);
    const dirX = length > 0 ? dx / length : 1;
    const dirY = length > 0 ? dy / length : 0;

    target.takeSpecialDamage(JOSEPH_SPECIAL_DAMAGE, dirX, dirY);
    this.registerWeaponImpact(target.x, target.y - 16);
    this.soundFX.playHit();
    if (target.getHealth() === 0) {
      this.soundFX.playEnemyDeath();
    }
    this.refreshEnemyPanel(target);
  }

  private onJumpAttackHit(
    _object1:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
    object2:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile
  ): void {
    const target: Merdellon = object2 as Merdellon;
    if (!target.active || !target.isAlive()) {
      return;
    }

    if (!this.player.tryRegisterJumpAttackHit(target)) {
      return;
    }

    const dx = target.x - this.player.x;
    const dy = target.y - this.player.getGroundY();
    const length = Math.hypot(dx, dy);
    const dirX = length > 0 ? dx / length : 1;
    const dirY = length > 0 ? dy / length : 0;

    target.takeAerialDamage(JOSEPH_JUMP_ATTACK_DAMAGE, dirX, dirY);
    this.registerWeaponImpact(target.x, target.y - 16);
    this.soundFX.playHit();
    if (target.getHealth() === 0) {
      this.soundFX.playEnemyDeath();
    }
    this.refreshEnemyPanel(target);
  }

  private refreshEnemyPanel(target: Merdellon): void {
    const remainingHealth = target.getHealth();
    if (remainingHealth > 0) {
      this.hud.showEnemy(
        target,
        'INFECTADO',
        remainingHealth,
        target.getMaxHealth()
      );
    } else {
      this.hud.hideEnemyFor(target);
    }
  }
}
