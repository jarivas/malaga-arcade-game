import Phaser from 'phaser';
import './style.css';
import { TestArenaScene } from './scenes/TestArenaScene';

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 480,
  height: 270,

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  pixelArt: true,
  antialias: false,
  roundPixels: true,

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    }
  },

  input: {
    gamepad: true
  },

  scene: [
    TestArenaScene
  ],

  backgroundColor: '#1a1a24'
};

new Phaser.Game(gameConfig);
