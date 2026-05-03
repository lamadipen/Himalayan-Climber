import Phaser from 'phaser'

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
  }

  create(data: { score: number }) {
    const cx = this.scale.width / 2
    const cy = this.scale.height / 2

    this.add.text(cx, cy - 40, 'Game Over', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ff4444',
    }).setOrigin(0.5)

    this.add.text(cx, cy + 10, `Score: ${data.score}`, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5)

    this.add.text(cx, cy + 60, 'Press SPACE to retry', {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(0.5)

    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.start('GameScene')
    })
  }
}
