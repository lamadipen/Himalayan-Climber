import Phaser from 'phaser'

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    // Core game loop implemented in future milestones
    this.add.text(16, 16, 'GameScene — stub', {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaaaaa',
    })

    this.events.on('player-died', this.onPlayerDied, this)
  }

  update(_time: number, _delta: number) {
    // Player + system updates wired up as entities are created
  }

  private onPlayerDied() {
    this.cameras.main.fadeOut(500, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameOverScene', { score: this.registry.get('score') ?? 0 })
    })
  }
}
