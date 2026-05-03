import Phaser from 'phaser'

// All actions the game can query — callers never reference raw key codes
export type InputKey = 'left' | 'right' | 'up' | 'down' | 'jump' | 'iceAxe' | 'rope'

export class InputManager {
  // Arrow keys + Space + Shift (createCursorKeys covers the standard layout)
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys
  // WASD + game-specific bindings
  private keys: {
    up:     Phaser.Input.Keyboard.Key
    down:   Phaser.Input.Keyboard.Key
    left:   Phaser.Input.Keyboard.Key
    right:  Phaser.Input.Keyboard.Key
    iceAxe: Phaser.Input.Keyboard.Key
    rope:   Phaser.Input.Keyboard.Key
  }

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!
    this.cursors = kb.createCursorKeys()
    this.keys = {
      up:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      iceAxe: kb.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      rope:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
    }
  }

  // ─── Held-down state ──────────────────────────────────────────────────────

  isDown(key: InputKey): boolean {
    switch (key) {
      case 'left':   return this.keys.left.isDown   || this.cursors.left.isDown
      case 'right':  return this.keys.right.isDown  || this.cursors.right.isDown
      case 'up':     return this.keys.up.isDown     || this.cursors.up.isDown
      case 'down':   return this.keys.down.isDown   || this.cursors.down.isDown
      // GDD: jump = Space OR Up arrow
      case 'jump':   return this.cursors.space.isDown || this.cursors.up.isDown
      case 'iceAxe': return this.keys.iceAxe.isDown
      case 'rope':   return this.keys.rope.isDown
    }
  }

  // ─── Single-frame press (use for actions, not movement) ──────────────────

  isJustDown(key: InputKey): boolean {
    const JD = Phaser.Input.Keyboard.JustDown
    switch (key) {
      case 'left':   return JD(this.keys.left)    || JD(this.cursors.left)
      case 'right':  return JD(this.keys.right)   || JD(this.cursors.right)
      case 'up':     return JD(this.keys.up)      || JD(this.cursors.up)
      case 'down':   return JD(this.keys.down)    || JD(this.cursors.down)
      case 'jump':   return JD(this.cursors.space) || JD(this.cursors.up)
      case 'iceAxe': return JD(this.keys.iceAxe)
      case 'rope':   return JD(this.keys.rope)
    }
  }

  // ─── Derived helpers ──────────────────────────────────────────────────────

  // Horizontal axis: -1 left, 0 still, +1 right
  get moveX(): number {
    return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0)
  }

  // Normalised 2D vector — used for 8-directional sections (base camp, overworld)
  get moveVector(): Phaser.Math.Vector2 {
    const x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0)
    const y = (this.isDown('down')  ? 1 : 0) - (this.isDown('up')   ? 1 : 0)
    return new Phaser.Math.Vector2(x, y).normalize()
  }

  // Crouch slide: hold crouch while moving horizontally
  get isCrouchSliding(): boolean {
    return this.isDown('down') && this.moveX !== 0
  }
}
