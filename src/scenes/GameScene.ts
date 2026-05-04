import Phaser from 'phaser'
import { Player }         from '../entities/Player'
import { Avalanche }      from '../entities/Avalanche'
import { AltitudeSystem } from '../engine/AltitudeSystem'
import { KarmaSystem }    from '../engine/KarmaSystem'
import { WeatherSystem }  from '../engine/WeatherSystem'
import { GameHUD }        from '../ui/GameHUD'
import { loadGame }       from '../firebase/api'
import {
  PLAYER_SPRITE_W,
  PLAYER_SPRITE_H,
  ROCKFALL_DAMAGE,
} from '../config/balance'

const MOUNTAIN_KEYS: Record<number, string> = {
  1: 'langtang',
  2: 'annapurna',
  3: 'manaslu',
  4: 'everest',
  5: 'kanchenjunga',
}

export class GameScene extends Phaser.Scene {
  // ─── Fields ───────────────────────────────────────────────────────────────
  private player!:          Player
  private map!:             Phaser.Tilemaps.Tilemap
  private groundLayer!:     Phaser.Tilemaps.TilemapLayer
  private hazardLayer:      Phaser.Tilemaps.TilemapLayer | null = null
  private iceWallLayer:     Phaser.Tilemaps.TilemapLayer | null = null
  private safeZoneLayer:    Phaser.Tilemaps.TilemapLayer | null = null

  private altitudeSystem!:  AltitudeSystem
  private karmaSystem!:     KarmaSystem
  private weatherSystem!:   WeatherSystem
  private hud!:             GameHUD
  private avalanche!:       Avalanche

  // Set by ice-wall overlap callback; read + reset each update tick.
  private iceWallNear    = false
  private currentLevel   = 1
  private elapsedMs      = 0
  private npcsSaved      = 0
  private summitTriggered = false

  constructor() {
    super({ key: 'GameScene' })
  }

  // ─── preload ──────────────────────────────────────────────────────────────

  preload(): void {
    this.load.tilemapTiledJSON('level1-langtang',     'assets/tilemaps/level1-langtang.json')
    this.load.tilemapTiledJSON('level2-annapurna',    'assets/tilemaps/level2-annapurna.json')
    this.load.tilemapTiledJSON('level3-manaslu',      'assets/tilemaps/level3-manaslu.json')
    this.load.tilemapTiledJSON('level4-everest',      'assets/tilemaps/level4-everest.json')
    this.load.tilemapTiledJSON('level5-kanchenjunga', 'assets/tilemaps/level5-kanchenjunga.json')

    this.load.image('tiles-langtang', 'assets/sprites/tiles-langtang.png')

    this.load.spritesheet('player', 'assets/sprites/player.png', {
      frameWidth:  PLAYER_SPRITE_W,
      frameHeight: PLAYER_SPRITE_H,
    })
  }

  // ─── create ───────────────────────────────────────────────────────────────

  async create(): Promise<void> {
    const uid = this.registry.get('uid') as string

    // 1. Load Firebase save
    const save = await loadGame(uid, 0)
    this.currentLevel   = save?.currentLevel ?? 1
    this.npcsSaved      = 0
    this.elapsedMs      = 0
    this.summitTriggered = false

    // 2. Build tilemap
    this.map = this.make.tilemap({ key: this.levelMapKey(this.currentLevel) })

    const tilesetName = this.map.tilesets[0]?.name ?? 'tiles-langtang'
    const tileset     = this.map.addTilesetImage(tilesetName, 'tiles-langtang')!

    this.map.createLayer('Background', tileset, 0, 0)?.setDepth(0)

    this.groundLayer = this.map.createLayer('Ground', tileset, 0, 0)!
    this.groundLayer
      .setCollisionByProperty({ collides: true })
      .setDepth(1)

    const hz = this.map.createLayer('Hazards', tileset, 0, 0)
    if (hz) {
      this.hazardLayer = hz.setDepth(2)
      this.hazardLayer.setCollisionByExclusion([-1])
    }

    const iw = this.map.createLayer('IceWalls', tileset, 0, 0)
    if (iw) {
      this.iceWallLayer = iw.setDepth(1)
      this.iceWallLayer.setCollisionByExclusion([-1])
    }

    // SafeZones layer — used by Avalanche to check if player reached shelter
    const sz = this.map.createLayer('SafeZones', tileset, 0, 0)
    if (sz) {
      this.safeZoneLayer = sz.setDepth(0).setAlpha(0)
    }

    // 3. Spawn player
    const spawns   = this.map.getObjectLayer('SpawnPoints')?.objects ?? []
    const spawnObj = spawns.find(o => o.name === 'player')
    const spawnX   = spawnObj?.x ?? 100
    const spawnY   = spawnObj?.y ?? this.map.heightInPixels - 200

    this.player = new Player(this, spawnX, spawnY, uid)
    this.player.setDepth(5)

    // 4. Engine systems
    this.karmaSystem   = KarmaSystem.create(this)
    this.altitudeSystem = new AltitudeSystem(this, this.currentLevel, this.player)
    this.weatherSystem  = new WeatherSystem(this, this.player)
    await this.weatherSystem.init()

    // 5. HUD (created after systems so it can reference them)
    this.hud = new GameHUD(this, this.player)

    // 6. Avalanche (listens to weather-changed event internally)
    this.avalanche = new Avalanche(
      this,
      this.player,
      this.safeZoneLayer,
      this.map.widthInPixels,
      this.map.heightInPixels,
    )

    // 7. Physics colliders + overlaps
    this.physics.add.collider(this.player, this.groundLayer)

    if (this.hazardLayer) {
      this.physics.add.overlap(
        this.player,
        this.hazardLayer,
        this.onHazardTile as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this,
      )
    }

    if (this.iceWallLayer) {
      this.physics.add.overlap(
        this.player,
        this.iceWallLayer,
        () => { this.iceWallNear = true },
        undefined,
        this,
      )
    }

    // 8. Summit trigger zone — object named 'summit' in SpawnPoints layer
    this.buildSummitZone(spawns)

    // 9. Scene events
    this.events.once('player-died', this.onPlayerDied, this)

    // Altitude HP drain — routes through Player so Entity death logic fires
    this.events.on('altitude-hp-drain', (amount: number) => {
      this.player?.takeDamage(amount)
    }, this)

    // NPC saved counter — incremented whenever a climber is helped
    this.events.on('karma-help-climber', () => { this.npcsSaved++ }, this)

    // 10. Camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
    this.cameras.main.fadeIn(400, 0, 0, 0)

    // 11. Cleanup on shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this)
  }

  // ─── update ───────────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    if (!this.player?.active || this.summitTriggered) return

    this.elapsedMs += delta

    // Ice-wall proximity set in preUpdate by physics overlap; reset after player reads it
    this.player.setNearIceTile(this.iceWallNear)
    this.player.update(_time, delta)
    this.iceWallNear = false

    // Systems tick — weather AFTER player so blizzard force isn't overwritten
    this.altitudeSystem.update(this.player.y, delta)
    this.weatherSystem.update(delta)
    this.avalanche.update(delta)

    // HUD reads live values from all three systems
    this.hud.update(this.altitudeSystem, this.karmaSystem, this.weatherSystem)
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private levelMapKey(level: number): string {
    const keys: Record<number, string> = {
      1: 'level1-langtang',
      2: 'level2-annapurna',
      3: 'level3-manaslu',
      4: 'level4-everest',
      5: 'level5-kanchenjunga',
    }
    return keys[level] ?? 'level1-langtang'
  }

  // Looks for an object named 'summit' in the SpawnPoints layer.
  // If found, creates an invisible physics zone; overlap fires onSummitReached().
  // Falls back to a thin strip at the top of the map (y < 64) if no object exists.
  private buildSummitZone(spawns: Phaser.Types.Tilemaps.TiledObject[]): void {
    const summitObj = spawns.find(o => o.name === 'summit')

    if (summitObj && summitObj.x !== undefined && summitObj.y !== undefined) {
      const w = summitObj.width  ?? 128
      const h = summitObj.height ?? 64
      const zone = this.add.zone(summitObj.x + w / 2, summitObj.y + h / 2, w, h)
      this.physics.world.enable(zone, Phaser.Physics.Arcade.STATIC_BODY)
      this.physics.add.overlap(this.player, zone, this.onSummitReached, undefined, this)
    } else {
      // Fallback: any tile row within the top 64px triggers the summit
      this.events.on(Phaser.Scenes.Events.UPDATE, () => {
        if (!this.summitTriggered && this.player?.y < 64) {
          this.onSummitReached()
        }
      }, this)
    }
  }

  private onSummitReached(): void {
    if (this.summitTriggered) return
    this.summitTriggered = true

    // Fire karma-summit so KarmaSystem can apply the all-NPCs-saved multiplier
    this.events.emit('karma-summit')

    const mountain = MOUNTAIN_KEYS[this.currentLevel] ?? 'langtang'
    const uid      = this.registry.get('uid') as string

    this.cameras.main.fadeOut(600, 255, 255, 255)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('SummitScene', {
        mountain,
        timeSeconds: Math.floor(this.elapsedMs / 1000),
        karma:       this.karmaSystem.getKarma(),
        npcsSaved:   this.npcsSaved,
        uid,
      })
    })
  }

  private onHazardTile(
    _player: Phaser.GameObjects.GameObject,
    tile:    Phaser.GameObjects.GameObject,
  ): void {
    const t = tile as unknown as Phaser.Tilemaps.Tile

    if (t.properties?.instant_death === true) {
      this.player.takeDamage(9999)
    } else {
      this.player.takeDamage(ROCKFALL_DAMAGE)
    }
  }

  private onPlayerDied(): void {
    this.cameras.main.fadeOut(500, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameOverScene', {
        score: this.registry.get('score') ?? 0,
        karma: this.player.karma,
      })
    })
  }

  private onShutdown(): void {
    this.hud?.destroy()
    this.avalanche?.destroy()
    this.events.off('altitude-hp-drain')
    this.events.off('karma-help-climber')
  }
}
