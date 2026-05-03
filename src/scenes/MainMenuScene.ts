import Phaser from 'phaser'

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' })
  }

  create() {
    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      'Himalayan Climber\n\nPress SPACE to start',
      { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', align: 'center' },
    ).setOrigin(0.5)

    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.start('GameScene')
    })
  }
}
