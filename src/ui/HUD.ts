import Phaser from 'phaser';

const HUD_DEPTH = 9999;
const HEALTH_BAR_WIDTH = 100;
const HEALTH_BAR_HEIGHT = 8;
const PLAYER_HEALTH_COLOR = 0xffd24a;
const PLAYER_HEALTH_HIGHLIGHT = 0xfff0a0;
const PLAYER_HEALTH_SHADOW = 0xc28a16;
const ENEMY_HEALTH_COLOR = 0xff5a2a;
const ENEMY_HEALTH_HIGHLIGHT = 0xffb08a;
const ENEMY_HEALTH_SHADOW = 0xa62a0a;
const BAR_BACKGROUND = 0x2a0505;
const PANEL_BACKGROUND = 0x05050c;
const PANEL_BACKGROUND_ALPHA = 0.9;
const PANEL_BORDER = 0x8b1a1a;
const PANEL_BORDER_DARK = 0x14141f;
const LIVES_HEART_COLOR = 0xff5a5a;
const ENEMY_PANEL_TIMEOUT_MS = 3000;
const ENEMY_PANEL_FADE_MS = 250;
const ENEMY_PANEL_FADE_IN_MS = 120;
const ENEMY_PORTRAIT_FLASH_MS = 90;
const INITIAL_LIVES = 2;

// Player layout: 32 px portrait + 6 px gap, then the text/bar block at x=54
// in screen coordinates (the panel itself starts at x=16). The background is
// drawn 4 px around the portrait/content for balanced outer padding.
const PORTRAIT_SIZE = 32;
const PORTRAIT_TEXT_X = 38;
const PLAYER_PANEL_WIDTH = 146;
const PLAYER_PANEL_HEIGHT = 40;
const PLAYER_BAR_Y = 12;
const PLAYER_SCORE_Y = 24;
const PLAYER_LIVES_X = 117;
const PLAYER_LIVES_TEXT_X = 128;

// Weapon badge: 12x12 icon inside a 14x14 recessed slot, then the remaining
// uses to its right. The block sits after the "1P JOSEPH" title.
const PLAYER_WEAPON_SLOT_X = 103;
const PLAYER_WEAPON_SLOT_Y = -1;
const PLAYER_WEAPON_ICON_X = 104;
const PLAYER_WEAPON_ICON_Y = 0;
const PLAYER_WEAPON_ICON_SIZE = 12;
const PLAYER_WEAPON_USES_X = 118;
const PLAYER_WEAPON_USES_Y = 3;

// Enemy panel: 146 x 40 with a 32 px portrait on the right. The portrait's
// top-left lands at screen (440, 12) while the panel starts at (330, 8).
const ENEMY_PANEL_WIDTH = 146;
const ENEMY_PANEL_HEIGHT = 40;
const ENEMY_PORTRAIT_X = 106;

// A hit that removes at least this much health flashes the portrait red.
const STRONG_HIT_DAMAGE = 20;
const PORTRAIT_FLASH_MS = 100;

const BASE_TEXT: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '8px',
  color: '#ffffff'
};

export class HUD {
  private readonly scene: Phaser.Scene;

  private readonly playerPanel: Phaser.GameObjects.Container;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly playerHealthFill: Phaser.GameObjects.Graphics;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly livesText: Phaser.GameObjects.Text;
  private readonly weaponSlot: Phaser.GameObjects.Rectangle;
  private readonly weaponIcon: Phaser.GameObjects.Image;
  private readonly weaponUsesText: Phaser.GameObjects.Text;

  private readonly enemyPanel: Phaser.GameObjects.Container;
  private readonly enemyNameText: Phaser.GameObjects.Text;
  private readonly enemyHealthFill: Phaser.GameObjects.Graphics;
  private readonly enemyPortrait: Phaser.GameObjects.Image;

  private activeEnemy: Phaser.GameObjects.GameObject | null = null;
  private enemyHideTimer?: Phaser.Time.TimerEvent;
  private enemyFadeTween?: Phaser.Tweens.Tween;
  private enemyPortraitFlashTimer?: Phaser.Time.TimerEvent;

  private lastPlayerHealth = 100;
  private portraitFlashTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // ---- Player 1 panel (top-left) -------------------------------------
    this.playerPanel = scene.add.container(16, 12);
    this.playerPanel.setScrollFactor(0).setDepth(HUD_DEPTH);

    const playerBg = scene.add
      .rectangle(
        -4,
        -4,
        PLAYER_PANEL_WIDTH,
        PLAYER_PANEL_HEIGHT,
        PANEL_BACKGROUND,
        PANEL_BACKGROUND_ALPHA
      )
      .setOrigin(0, 0);
    playerBg.setStrokeStyle(1, PANEL_BORDER, 1);

    // Single red outer outline + dark inner bevel (no second red line).
    const playerInner = scene.add
      .rectangle(
        -3,
        -3,
        PLAYER_PANEL_WIDTH - 2,
        PLAYER_PANEL_HEIGHT - 2
      )
      .setOrigin(0, 0)
      .setStrokeStyle(1, PANEL_BORDER_DARK, 1);

    // Portrait badge: a 32x32 portrait with a thin gold frame.
    const portraitFrame = scene.add.graphics();
    portraitFrame.fillStyle(0x000000, 1);
    portraitFrame.fillRect(-1, -1, PORTRAIT_SIZE + 2, PORTRAIT_SIZE + 2);
    portraitFrame.lineStyle(1, 0xd4a82a, 1);
    portraitFrame.strokeRect(-0.5, -0.5, PORTRAIT_SIZE + 1, PORTRAIT_SIZE + 1);
    portraitFrame.lineStyle(1, 0xffe08a, 0.9);
    portraitFrame.lineBetween(-1, -1, PORTRAIT_SIZE, -1);
    portraitFrame.lineBetween(-1, -1, -1, PORTRAIT_SIZE);
    portraitFrame.lineStyle(1, 0x8a6a1a, 0.9);
    portraitFrame.lineBetween(-1, PORTRAIT_SIZE + 1, PORTRAIT_SIZE + 1, PORTRAIT_SIZE + 1);
    portraitFrame.lineBetween(PORTRAIT_SIZE + 1, -1, PORTRAIT_SIZE + 1, PORTRAIT_SIZE + 1);

    this.portrait = scene.add
      .image(0, 0, 'portrait-joseph')
      .setOrigin(0, 0)
      .setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE);

    const title = scene.add
      .text(PORTRAIT_TEXT_X, 0, '1P JOSEPH', {
        ...BASE_TEXT,
        color: '#ffd24a',
        fontStyle: 'bold'
      })
      .setShadow(1, 1, '#000000', 0);

    this.weaponSlot = scene.add
      .rectangle(
        PLAYER_WEAPON_SLOT_X,
        PLAYER_WEAPON_SLOT_Y,
        PLAYER_WEAPON_ICON_SIZE + 2,
        PLAYER_WEAPON_ICON_SIZE + 2,
        0x000000,
        0.6
      )
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xd4a82a, 0.9)
      .setVisible(false);

    this.weaponIcon = scene.add
      .image(PLAYER_WEAPON_ICON_X, PLAYER_WEAPON_ICON_Y, 'icon-pipe')
      .setOrigin(0, 0)
      .setDisplaySize(PLAYER_WEAPON_ICON_SIZE, PLAYER_WEAPON_ICON_SIZE)
      .setVisible(false);

    this.weaponUsesText = scene.add
      .text(PLAYER_WEAPON_USES_X, PLAYER_WEAPON_USES_Y, 'x0', {
        ...BASE_TEXT,
        color: '#ffd24a',
        fontStyle: 'bold'
      })
      .setShadow(1, 1, '#000000', 0)
      .setVisible(false);

    this.scoreText = scene.add
      .text(PORTRAIT_TEXT_X, PLAYER_SCORE_Y, 'SCORE 000000', {
        ...BASE_TEXT,
        color: '#d6d6e6'
      })
      .setShadow(1, 1, '#000000', 0);

    // Recessed black frame + dark red track + beveled yellow fill.
    const playerBarFrame = scene.add
      .rectangle(
        PORTRAIT_TEXT_X - 1,
        PLAYER_BAR_Y - 1,
        HEALTH_BAR_WIDTH + 2,
        HEALTH_BAR_HEIGHT + 2,
        0x000000,
        1
      )
      .setOrigin(0, 0);
    const playerBarTrack = scene.add
      .rectangle(
        PORTRAIT_TEXT_X,
        PLAYER_BAR_Y,
        HEALTH_BAR_WIDTH,
        HEALTH_BAR_HEIGHT,
        BAR_BACKGROUND,
        1
      )
      .setOrigin(0, 0);

    this.playerHealthFill = scene.add.graphics();
    this.playerHealthFill.setPosition(PORTRAIT_TEXT_X, PLAYER_BAR_Y);

    const heart = scene.add.graphics();
    heart.setPosition(PLAYER_LIVES_X, 25);
    heart.fillStyle(LIVES_HEART_COLOR, 1);
    heart.fillRect(1, 0, 2, 1);
    heart.fillRect(4, 0, 2, 1);
    heart.fillRect(0, 1, 7, 2);
    heart.fillRect(1, 3, 5, 1);
    heart.fillRect(2, 4, 3, 1);
    heart.fillRect(3, 5, 1, 1);

    this.livesText = scene.add
      .text(PLAYER_LIVES_TEXT_X, 24, `x${INITIAL_LIVES}`, {
        ...BASE_TEXT,
        color: '#ffd24a',
        fontStyle: 'bold'
      })
      .setShadow(1, 1, '#000000', 0);

    this.playerPanel.add([
      playerBg,
      playerInner,
      portraitFrame,
      this.portrait,
      title,
      this.weaponSlot,
      this.weaponIcon,
      this.weaponUsesText,
      this.scoreText,
      playerBarFrame,
      playerBarTrack,
      this.playerHealthFill,
      heart,
      this.livesText
    ]);

    // ---- Active enemy panel (top-right) --------------------------------
    this.enemyPanel = scene.add.container(334, 12);
    this.enemyPanel.setScrollFactor(0).setDepth(HUD_DEPTH).setVisible(false);

    const enemyBg = scene.add
      .rectangle(
        -4,
        -4,
        ENEMY_PANEL_WIDTH,
        ENEMY_PANEL_HEIGHT,
        PANEL_BACKGROUND,
        PANEL_BACKGROUND_ALPHA
      )
      .setOrigin(0, 0);
    enemyBg.setStrokeStyle(1, PANEL_BORDER, 1);

    const enemyInner = scene.add
      .rectangle(
        -3,
        -3,
        ENEMY_PANEL_WIDTH - 2,
        ENEMY_PANEL_HEIGHT - 2
      )
      .setOrigin(0, 0)
      .setStrokeStyle(1, PANEL_BORDER_DARK, 1);

    const warning = scene.add.graphics();
    warning.setPosition(0, 0);
    warning.fillStyle(ENEMY_HEALTH_COLOR, 1);
    warning.fillRect(2, 0, 1, 1);
    warning.fillRect(1, 1, 3, 1);
    warning.fillRect(0, 2, 5, 1);
    warning.fillRect(1, 3, 3, 1);
    warning.fillRect(2, 4, 1, 1);

    this.enemyNameText = scene.add
      .text(10, 0, '', {
        ...BASE_TEXT,
        color: '#ffb199',
        fontStyle: 'bold'
      })
      .setShadow(1, 1, '#000000', 0);

    const enemyBarFrame = scene.add
      .rectangle(-1, 11, HEALTH_BAR_WIDTH + 2, HEALTH_BAR_HEIGHT + 2, 0x000000, 1)
      .setOrigin(0, 0);
    const enemyBarTrack = scene.add
      .rectangle(0, 12, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, BAR_BACKGROUND, 1)
      .setOrigin(0, 0);

    this.enemyHealthFill = scene.add.graphics();
    this.enemyHealthFill.setPosition(0, 12);

    // Enemy portrait: 32x32, mirrored so it looks towards the player.
    const enemyPortraitFrame = scene.add.graphics();
    enemyPortraitFrame.fillStyle(0x000000, 1);
    enemyPortraitFrame.fillRect(ENEMY_PORTRAIT_X - 1, -1, PORTRAIT_SIZE + 2, PORTRAIT_SIZE + 2);
    enemyPortraitFrame.lineStyle(1, 0xb04a4a, 1);
    enemyPortraitFrame.strokeRect(
      ENEMY_PORTRAIT_X - 0.5,
      -0.5,
      PORTRAIT_SIZE + 1,
      PORTRAIT_SIZE + 1
    );
    enemyPortraitFrame.lineStyle(1, 0xe09080, 0.8);
    enemyPortraitFrame.lineBetween(ENEMY_PORTRAIT_X - 1, -1, ENEMY_PORTRAIT_X + PORTRAIT_SIZE, -1);
    enemyPortraitFrame.lineBetween(ENEMY_PORTRAIT_X - 1, -1, ENEMY_PORTRAIT_X - 1, PORTRAIT_SIZE);
    enemyPortraitFrame.lineStyle(1, 0x6a1a1a, 0.8);
    enemyPortraitFrame.lineBetween(
      ENEMY_PORTRAIT_X - 1,
      PORTRAIT_SIZE + 1,
      ENEMY_PORTRAIT_X + PORTRAIT_SIZE + 1,
      PORTRAIT_SIZE + 1
    );
    enemyPortraitFrame.lineBetween(
      ENEMY_PORTRAIT_X + PORTRAIT_SIZE + 1,
      -1,
      ENEMY_PORTRAIT_X + PORTRAIT_SIZE + 1,
      PORTRAIT_SIZE + 1
    );

    this.enemyPortrait = scene.add
      .image(ENEMY_PORTRAIT_X, 0, 'portrait-enemy')
      .setOrigin(0, 0)
      .setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE)
      .setFlipX(true);

    this.enemyPanel.add([
      enemyBg,
      enemyInner,
      warning,
      this.enemyNameText,
      enemyBarFrame,
      enemyBarTrack,
      this.enemyHealthFill,
      enemyPortraitFrame,
      this.enemyPortrait
    ]);

    // Initial state.
    this.setPlayerHealth(100, 100);
    this.setScore(0);
    this.setLives(INITIAL_LIVES);
    this.clearWeapon();
  }

  public setPlayerHealth(currentHealth: number, maxHealth: number): void {
    const previousHealth = this.lastPlayerHealth;
    this.lastPlayerHealth = currentHealth;

    this.drawHealthBar(
      this.playerHealthFill,
      currentHealth,
      maxHealth,
      PLAYER_HEALTH_COLOR,
      PLAYER_HEALTH_HIGHLIGHT,
      PLAYER_HEALTH_SHADOW
    );

    if (
      currentHealth < previousHealth &&
      previousHealth - currentHealth >= STRONG_HIT_DAMAGE
    ) {
      this.flashPortrait();
    }
  }

  public setScore(score: number): void {
    const safeScore = Math.max(0, Math.floor(score));
    this.scoreText.setText(`SCORE ${safeScore.toString().padStart(6, '0')}`);
  }

  public setLives(lives: number): void {
    this.livesText.setText(`x${Math.max(0, Math.floor(lives))}`);
  }

  /**
   * Shows the equipped weapon's icon and remaining uses next to the player
   * name. Passing null or zero uses clears the badge.
   */
  public setWeapon(iconTexture: string | null, uses: number): void {
    if (!iconTexture || uses <= 0) {
      this.clearWeapon();
      return;
    }

    this.weaponSlot.setVisible(true);
    this.weaponIcon.setTexture(iconTexture).setVisible(true);
    this.weaponUsesText.setText(`x${uses}`).setVisible(true);
  }

  public clearWeapon(): void {
    this.weaponSlot.setVisible(false);
    this.weaponIcon.setVisible(false);
    this.weaponUsesText.setText('').setVisible(false);
  }

  /**
   * Shows/refreshes the active enemy panel and resets its 3 s auto-hide timer.
   */
  public showEnemy(
    enemy: Phaser.GameObjects.GameObject,
    name: string,
    currentHealth: number,
    maxHealth: number
  ): void {
    const wasHidden = !this.enemyPanel.visible || this.enemyPanel.alpha <= 0;

    this.activeEnemy = enemy;

    this.enemyHideTimer?.remove(false);
    this.enemyHideTimer = undefined;

    this.enemyFadeTween?.stop();
    this.enemyFadeTween = undefined;

    this.enemyNameText.setText(name);
    this.drawHealthBar(
      this.enemyHealthFill,
      currentHealth,
      maxHealth,
      ENEMY_HEALTH_COLOR,
      ENEMY_HEALTH_HIGHLIGHT,
      ENEMY_HEALTH_SHADOW
    );

    this.enemyPanel.setVisible(true);
    if (wasHidden) {
      this.enemyPanel.setAlpha(0);
      this.enemyFadeTween = this.scene.tweens.add({
        targets: this.enemyPanel,
        alpha: 1,
        duration: ENEMY_PANEL_FADE_IN_MS,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.enemyFadeTween = undefined;
        }
      });
    } else {
      this.enemyPanel.setAlpha(1);
    }

    this.flashEnemyPortrait();

    this.enemyHideTimer = this.scene.time.delayedCall(
      ENEMY_PANEL_TIMEOUT_MS,
      () => {
        this.enemyHideTimer = undefined;
        this.hideEnemy();
      }
    );
  }

  /**
   * Hides the panel only if the enemy currently displayed is the one dying.
   */
  public hideEnemyFor(enemy: Phaser.GameObjects.GameObject): void {
    if (this.activeEnemy !== enemy) {
      return;
    }

    this.hideEnemy();
  }

  public hideEnemy(): void {
    this.enemyHideTimer?.remove(false);
    this.enemyHideTimer = undefined;
    this.activeEnemy = null;

    if (!this.enemyPanel.visible) {
      return;
    }

    this.enemyFadeTween?.stop();
    this.enemyFadeTween = this.scene.tweens.add({
      targets: this.enemyPanel,
      alpha: 0,
      duration: ENEMY_PANEL_FADE_MS,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.enemyPanel.setVisible(false).setAlpha(1);
        this.enemyFadeTween = undefined;
      }
    });
  }

  public destroy(): void {
    this.enemyHideTimer?.remove(false);
    this.enemyHideTimer = undefined;

    this.enemyFadeTween?.stop();
    this.enemyFadeTween = undefined;

    this.portraitFlashTimer?.remove(false);
    this.portraitFlashTimer = undefined;

    this.enemyPortraitFlashTimer?.remove(false);
    this.enemyPortraitFlashTimer = undefined;

    this.playerPanel.destroy(true);
    this.enemyPanel.destroy(true);
  }

  private flashPortrait(): void {
    this.portraitFlashTimer?.remove(false);
    this.portrait.setTint(0xff0000).setTintMode(Phaser.TintModes.FILL);

    this.portraitFlashTimer = this.scene.time.delayedCall(
      PORTRAIT_FLASH_MS,
      () => {
        this.portraitFlashTimer = undefined;
        if (this.portrait.active) {
          this.portrait.clearTint();
        }
      }
    );
  }

  private flashEnemyPortrait(): void {
    this.enemyPortraitFlashTimer?.remove(false);
    this.enemyPortrait.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);

    this.enemyPortraitFlashTimer = this.scene.time.delayedCall(
      ENEMY_PORTRAIT_FLASH_MS,
      () => {
        this.enemyPortraitFlashTimer = undefined;
        if (this.enemyPortrait.active) {
          this.enemyPortrait.clearTint();
        }
      }
    );
  }

  private drawHealthBar(
    graphics: Phaser.GameObjects.Graphics,
    currentHealth: number,
    maxHealth: number,
    color: number,
    highlightColor: number,
    shadowColor: number
  ): void {
    const ratio =
      maxHealth > 0 ? Phaser.Math.Clamp(currentHealth / maxHealth, 0, 1) : 0;
    const width = Math.round(HEALTH_BAR_WIDTH * ratio);

    graphics.clear();

    if (width <= 0) {
      return;
    }

    graphics.fillStyle(color, 1);
    graphics.fillRect(0, 0, width, HEALTH_BAR_HEIGHT);
    graphics.fillStyle(highlightColor, 1);
    graphics.fillRect(0, 0, width, 1);
    graphics.fillStyle(shadowColor, 1);
    graphics.fillRect(0, HEALTH_BAR_HEIGHT - 1, width, 1);
  }
}
