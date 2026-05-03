import Phaser from 'phaser'
import { Player } from '../entities/Player'
import { loadGame } from '../firebase/api'
import {
  PLAYER_SPRITE_W,
  PLAYER_SPRITE_H,
  ROCKFALL_DAMAGE,
} from '../config/balance'

export class GameScene extends Phaser.Scene {
  // ─── Fields ───────────────────────────────────────────────────────────────
  private player!:        Player
  private map!:           Phaser.Tilemaps.Tilemap
  private groundLayer!:   Phaser.Tilemaps.TilemapLayer
  private hazardLayer:    Phaser.Tilemaps.TilemapLayer | null = null
  private iceWallLayer:   Phaser.Tilemaps.TilemapLayer | null = null

  // Set by ice-wall overlap callback; read + reset each update tick.
  // Physics callbacks fire in preUpdate, before scene update(), so the value
  // is always current when player.update() reads it.
  private iceWallNear  = false
  private currentLevel = 1

  constructor() {
    super({ key: 'GameScene' })
  }

  // ─── preload ──────────────────────────────────────────────────────────────
  // ALL asset loading here — never in create() or update().
  // Week 1 loads Level 1 (Langtang) only.
  // PreloadScene will take over multi-level asset management in a later milestone.

  preload(): void {
    // Tiled JSON produced by Game Designer — key must match levelMapKey() return value
    this.load.tilemapTiledJSON('level1-langtang', 'assets/tilemaps/level1-langtang.json')
    this.load.tilemapTiledJSON('level2-annapurna',    'assets/tilemaps/level2-annapurna.json')
    this.load.tilemapTiledJSON('level3-manaslu',      'assets/tilemaps/level3-manaslu.json')
    this.load.tilemapTiledJSON('level4-everest',      'assets/tilemaps/level4-everest.json')
    this.load.tilemapTiledJSON('level5-kanchenjunga', 'assets/tilemaps/level5-kanchenjunga.json')

    // Tileset PNG key must match the tileset name used in addTilesetImage()
    this.load.image('tiles-langtang', 'assets/sprites/tiles-langtang.png')

    // Player spritesheet — frame dimensions from balance.ts keep this in sync
    // with the body size set in Player constructor
    this.load.spritesheet('player', 'assets/sprites/player.png', {
      frameWidth:  PLAYER_SPRITE_W,
      frameHeight: PLAYER_SPRITE_H,
    })
  }

  // ─── create ───────────────────────────────────────────────────────────────

  async create(): Promise<void> {
    const uid = this.registry.get('uid') as string

    // 1. Load Firebase save — restores currentLevel before we pick a tilemap
    const save = await loadGame(uid, 0)
    this.currentLevel = save?.currentLevel ?? 1

    // 2. Build tilemap
    this.map = this.make.tilemap({ key: this.levelMapKey(this.currentLevel) })

    // Tiled tileset name drives the first arg; Phaser asset key drives the second.
    // Convention: name your tileset 'tiles-langtang' in Tiled to match the key.
    const tilesetName = this.map.tilesets[0]?.name ?? 'tiles-langtang'
    const tileset = this.map.addTilesetImage(tilesetName, 'tiles-langtang')!

    // Background — decorative sky / rock face; no physics
    this.map.createLayer('Background', tileset, 0, 0)?.setDepth(0)

    // Ground — solid platformer surfaces; collision enabled per-tile via
    // Tiled custom property 'collides: true'
    this.groundLayer = this.map.createLayer('Ground', tileset, 0, 0)!
    this.groundLayer
      .setCollisionByProperty({ collides: true })
      .setDepth(1)

    // Hazards — crevasses, ice spikes, rockfall zones.
    // setCollisionByExclusion([-1]) enables physics on every placed tile so
    // overlap callbacks fire. Using overlap (not collider) lets the player
    // fall through a crevasse rather than landing on it.
    const hz = this.map.createLayer('Hazards', tileset, 0, 0)
    if (hz) {
      this.hazardLayer = hz.setDepth(2)
      this.hazardLayer.setCollisionByExclusion([-1])
    }

    // IceWalls — optional layer; tiles here drive the ice-axe grab proximity
    // flag. Player body overlaps this layer; the Game Designer places ice wall
    // tiles so they match the visual ice wall on the Ground layer.
    const iw = this.map.createLayer('IceWalls', tileset, 0, 0)
    if (iw) {
      this.iceWallLayer = iw.setDepth(1)
      this.iceWallLayer.setCollisionByExclusion([-1])
    }

    // 3. Spawn player at designer-placed SpawnPoints object
    const spawns   = this.map.getObjectLayer('SpawnPoints')?.objects ?? []
    const spawnObj = spawns.find(o => o.name === 'player')
    // Fallback coords: top-left of map with a bit of padding
    const spawnX   = spawnObj?.x ?? 100
    const spawnY   = spawnObj?.y ?? this.map.heightInPixels - 200

    // 4. Spawn player
    this.player = new Player(this, spawnX, spawnY, uid)
    this.player.setDepth(5)

    // 5. Physics colliders + overlaps
    this.physics.add.collider(this.player, this.groundLayer)

    if (this.hazardLayer) {
      this.physics.add.overlap(
        this.player,
        this.hazardLayer,
        // Tile arrives as Phaser.Tilemaps.Tile but typed as GameObject here —
        // a known Phaser API limitation when mixing tiles with arcade physics.
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

    // 6. Camera — roundPixels:true keeps pixel-art crisp at sub-pixel positions
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
    this.cameras.main.fadeIn(400, 0, 0, 0)

    // 7. Events
    // 'once' prevents double-trigger if two hazards kill the player same frame
    this.events.once('player-died', this.onPlayerDied, this)
  }

  // ─── update ───────────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    // Guard covers the async gap between scene start and create() completing
    if (!this.player?.active) return

    // ice-wall proximity flag was set by physics overlap callback (preUpdate).
    // Pass to player before update(), then reset so next frame starts clean.
    this.player.setNearIceTile(this.iceWallNear)
    this.player.update(_time, delta)
    this.iceWallNear = false
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

  // Overlap callback — Phaser passes a Tile as the second arg when colliding
  // with a TilemapLayer, even though the signature declares GameObject.
  private onHazardTile(
    _player: Phaser.GameObjects.GameObject,
    tile:    Phaser.GameObjects.GameObject,
  ): void {
    const t = tile as unknown as Phaser.Tilemaps.Tile

    if (t.properties?.instant_death === true) {
      // Crevasse fall — takeDamage clamps to 0 and calls onDeath()
      this.player.takeDamage(9999)
    } else {
      // Rockfall, ice spike, etc. — partial damage from balance.ts
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
}
