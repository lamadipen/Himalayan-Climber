import Phaser from 'phaser'

export abstract class Entity extends Phaser.Physics.Arcade.Sprite {
  protected hp:    number = 100
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
