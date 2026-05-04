import Phaser from 'phaser'
import { BootScene }        from '../scenes/BootScene'
import { PreloadScene }     from '../scenes/PreloadScene'
import { MainMenuScene }    from '../scenes/MainMenuScene'
import { GameScene }        from '../scenes/GameScene'
import { GameOverScene }    from '../scenes/GameOverScene'
import { LeaderboardScene } from '../scenes/LeaderboardScene'
import { SummitScene }      from '../scenes/SummitScene'
import { PauseScene }       from '../scenes/PauseScene'

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type:            Phaser.AUTO,
  width:           960,
  height:          540,
  pixelArt:        true,
  backgroundColor: '#0d0d1a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 800 },
      // Physics debug overlay — visible only during local development
      debug: import.meta.env.DEV,
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    GameScene,
    GameOverScene,
    LeaderboardScene,
    SummitScene,
    PauseScene,
  ],
}

export function createGame(parent?: string | HTMLElement): Phaser.Game {
  return new Phaser.Game(
    parent !== undefined ? { ...gameConfig, parent } : gameConfig,
  )
}
