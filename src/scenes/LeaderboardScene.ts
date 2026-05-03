import Phaser from 'phaser'
import { watchLeaderboard } from '../firebase/api'
import type { LeaderboardEntry, Unsubscribe } from '../firebase/types'

export class LeaderboardScene extends Phaser.Scene {
  private unsubscribe: Unsubscribe | null = null

  constructor() {
    super({ key: 'LeaderboardScene' })
  }

  create(data: { mountain: string }) {
    const mountain = data.mountain ?? 'langtang'
    const cx = this.scale.width / 2

    this.add.text(cx, 30, `${mountain.toUpperCase()} — Top Times`, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5)

    let listText: Phaser.GameObjects.Text | null = null

    this.unsubscribe = watchLeaderboard(mountain, 10, (entries: LeaderboardEntry[]) => {
      const lines = entries.map(e =>
        `#${e.rank ?? '?'}  ${e.displayName.padEnd(12)}  ${e.time}s  ♦${e.karma}`
      ).join('\n')

      if (listText) {
        listText.setText(lines)
      } else {
        listText = this.add.text(cx, 80, lines, {
          fontFamily: 'monospace', fontSize: '13px', color: '#cccccc',
        }).setOrigin(0.5, 0)
      }
    })

    this.add.text(cx, this.scale.height - 30, 'Press ESC to return', {
      fontFamily: 'monospace', fontSize: '12px', color: '#888888',
    }).setOrigin(0.5)

    this.input.keyboard!.once('keydown-ESC', () => {
      this.scene.start('MainMenuScene')
    })
  }

  shutdown() {
    this.unsubscribe?.()
  }
}
