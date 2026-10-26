/**
 * Combat type definitions following project conventions
 */

export type Team = 'player' | 'enemy';

export interface DamageData {
  damage: number;
  knockbackForce: number;
  direction: Phaser.Math.Vector2;
  sourceTeam: Team;
}

export interface CharacterStats {
  maxHealth: number;
  currentHealth: number;
  moveSpeed: number;
  attackDamage: number;
  attackCooldown: number;
  invincibilityTime: number;
}
