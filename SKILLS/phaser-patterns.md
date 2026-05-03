# SKILL — Phaser 3 Patterns

> Read this before writing any Phaser 3 code in this project.
> These are the canonical patterns for this codebase. Follow them exactly.

---

## Scene structure

Every scene follows this template:

```typescript
// src/scenes/GameScene.ts
import Phaser from 'phaser'
import { loadGame, submitScore } from '../firebase/api'
import { PLAYER_SPEED, ENEMY_HP } from '../config/balance'

export class GameScene extends Phaser.Scene {
  private player!: Player
  private enemies!: Phaser.GameObjects.Group
  private bullets!: Phaser.GameObjects.Group  // object pool

  constructor() {
    super({ key: 'GameScene' })
  }

  preload() {
    // ALL asset loading here — never in create() or update()
    this.load.tilemapTiledJSON('level1', 'assets/tilemaps/level1.json')
    this.load.image('tiles', 'assets/sprites/tileset.png')
    this.load.spritesheet('player', 'assets/sprites/player.png', { frameWidth: 32, frameHeight: 32 })
  }

  async create() {
    // 1. Load Firebase save state
    const uid = this.registry.get('uid')
    const save = await loadGame(uid, 0)

    // 2. Build tilemap
    const map = this.make.tilemap({ key: 'level1' })
    const tileset = map.addTilesetImage('tileset', 'tiles')!
    map.createLayer('Ground', tileset, 0, 0)
    const wallLayer = map.createLayer('Walls', tileset, 0, 0)!
    wallLayer.setCollisionByProperty({ collides: true })

    // 3. Spawn entities
    this.player = new Player(this, 100, 100)
    this.enemies = this.add.group()
    this.bullets = this.add.group({ maxSize: 30, runChildUpdate: true })

    // 4. Physics
    this.physics.add.collider(this.player, wallLayer)
    this.physics.add.collider(this.enemies, wallLayer)
    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, undefined, this)

    // 5. Camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

    // 6. Events
    this.events.on('player-died', this.onPlayerDied, this)
  }

  update(time: number, delta: number) {
    this.player.update(time, delta)
    this.enemies.getChildren().forEach(e => (e as Enemy).update(time, delta))
  }

  private onBulletHit(bullet: any, enemy: any) {
    bullet.setActive(false).setVisible(false)
    enemy.takeDamage(10)
  }

  private onPlayerDied() {
    this.scene.start('GameOverScene', { score: this.registry.get('score') })
  }
}
```

---

## Object pooling — bullets and particles

Always pool entities spawned frequently. Never use `new` inside `update()`.

```typescript
// Correct — get from pool
fireBullet(x: number, y: number, angle: number) {
  const bullet = this.bullets.get(x, y) as Bullet
  if (!bullet) return  // pool exhausted — silent fail, never throw
  bullet.setActive(true).setVisible(true)
  bullet.fire(angle)
}

// Wrong — creates garbage every frame
fireBullet(x: number, y: number, angle: number) {
  new Bullet(this, x, y, angle)  // ← never do this in hot paths
}
```

---

## Entity base class

```typescript
// src/entities/Entity.ts
export abstract class Entity extends Phaser.Physics.Arcade.Sprite {
  protected hp: number = 100
  protected maxHp: number = 100

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture)
    scene.add.existing(this)
    scene.physics.add.existing(this)
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount)
    this.scene.events.emit('entity-damaged', this, amount)
    if (this.hp === 0) this.onDeath()
  }

  get healthPercent(): number {
    return this.hp / this.maxHp
  }

  protected abstract onDeath(): void
  abstract update(time: number, delta: number): void
}
```

---

## Input manager pattern

```typescript
// src/engine/InputManager.ts
export class InputManager {
  private keys: Record<string, Phaser.Input.Keyboard.Key>
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    const kb = scene.input.keyboard!
    this.keys = {
      up:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      dash:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      pause:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    }
  }

  get moveVector(): Phaser.Math.Vector2 {
    const x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0)
    const y = (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0)
    return new Phaser.Math.Vector2(x, y).normalize()
  }

  isDown(key: string): boolean { return this.keys[key]?.isDown ?? false }
  isJustDown(key: string): boolean { return Phaser.Input.Keyboard.JustDown(this.keys[key]) }
}
```

---

## Tilemap loading from designer JSON

```typescript
// Standard tilemap loading — matches designer output format
loadLevel(key: string) {
  const map = this.make.tilemap({ key })
  const tileset = map.addTilesetImage(map.tilesets[0].name, map.tilesets[0].name)!

  map.createLayer('Background', tileset)
  const ground = map.createLayer('Ground', tileset)!
  ground.setCollisionByProperty({ collides: true })

  // Read designer spawn points
  const spawns = map.getObjectLayer('SpawnPoints')?.objects ?? []
  const playerSpawn = spawns.find(o => o.name === 'player')
  const enemySpawns = spawns.filter(o => o.name === 'enemy')

  return { map, ground, playerSpawn, enemySpawns }
}
```

---

## UI components

### Health bar (Phaser Graphics)
```typescript
export class HealthBar {
  private bar: Phaser.GameObjects.Graphics
  private x: number; private y: number; private w: number

  constructor(scene: Phaser.Scene, x: number, y: number, width = 200) {
    this.x = x; this.y = y; this.w = width
    this.bar = scene.add.graphics().setScrollFactor(0).setDepth(100)
  }

  update(percent: number) {
    this.bar.clear()
    this.bar.fillStyle(0x333333).fillRect(this.x, this.y, this.w, 16)
    const color = percent > 0.5 ? 0x44dd44 : percent > 0.25 ? 0xddaa00 : 0xdd2222
    this.bar.fillStyle(color).fillRect(this.x + 1, this.y + 1, (this.w - 2) * percent, 14)
  }
}
```

### Score display
```typescript
export class ScoreDisplay {
  private text: Phaser.GameObjects.Text
  private _score = 0

  constructor(scene: Phaser.Scene) {
    this.text = scene.add.text(16, 16, 'Score: 0', {
      fontFamily: '"Press Start 2P"',
      fontSize: '16px',
      color: '#ffffff',
    }).setScrollFactor(0).setDepth(100)
  }

  addPoints(n: number) {
    this._score += n
    this.text.setText(`Score: ${this._score.toLocaleString()}`)
    // pop tween
    this.text.scene.tweens.add({
      targets: this.text,
      scaleX: 1.2, scaleY: 1.2,
      duration: 80, yoyo: true, ease: 'Power2'
    })
  }

  get score() { return this._score }
}
```

---

## Screen shake
```typescript
// On player damage
this.cameras.main.shake(150, 0.008)

// On big explosion
this.cameras.main.shake(300, 0.015)
```

---

## Scene transition
```typescript
// Fade out then switch
this.cameras.main.fadeOut(500, 0, 0, 0)
this.cameras.main.once('camerafadeoutcomplete', () => {
  this.scene.start('GameOverScene', { score: this.score })
})
```
