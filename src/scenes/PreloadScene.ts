import Phaser from 'phaser'

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload() {
    // Assets loaded here in future milestones
  }

  create() {
    this.scene.start('MainMenuScene')
  }
}
