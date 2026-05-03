import Phaser from 'phaser'
import { Entity } from './Entity'
import { InputManager } from '../engine/InputManager'
import { loadGame } from '../firebase/api'
import {
  PLAYER_SPEED_BASE,
  PLAYER_JUMP_FORCE,
  PLAYER_GRAVITY,
  PLAYER_MAX_HP,
  PLAYER_SPRITE_W,
  PLAYER_SPRITE_H,
  ROPE_THROW_USES,
  ICE_AXE_USES,
  ICE_WALL_SLIDE_SPEED,
  CHECKPOINT_HP_RESTORE,
} from '../config/balance'

// Max milliseconds the player can hold jump to extend height.
// Held jump counteracts 60% of gravity while rising — produces a noticeably
// taller arc compared to a tap without a separate "super-jump" button.
const JUMP_HOLD_MAX_MS = 300

// Crouching shrinks the physics body vertically but keeps feet planted.
const CROUCH_HEIGHT_PX = 24

export class Player extends Entity {
  // ─── Exposed state (read by HUD, AltitudeSystem, CheckpointSystem) ────────
  oxygen      = 100   // 0–100 %
  karma       = 0
  ropeUses    = ROPE_THROW_USES
  iceAxeUses  = ICE_AXE_USES

  // Written each tick by AltitudeSystem based on current altitude
  speedMultiplier = 1.0
  inputDelayMs    = 0   // ms; 0 = no lag, 80 = death-zone confusion

  // ─── Internal ─────────────────────────────────────────────────────────────
  private controls!:           InputManager
  private isCrouching       = false
  private isGrabbingIce     = false
  private isNearIceTile_    = false   // set by GameScene via physics overlap
  private jumpHeld          = false
  private jumpHoldMs        = 0
  private inputDelayAccum   = 0
  private pendingMoveX      = 0      // lags behind real input at altitude

  constructor(scene: Phaser.Scene, x: number, y: number, uid: string) {
    super(scene, x, y, 'player')

    this.maxHp = PLAYER_MAX_HP
    this.hp    = PLAYER_MAX_HP

    this.controls = new InputManager(scene)

    // Anchor sprite at bottom-centre so this.y === foot position.
    // Physics body offset is adjusted accordingly in crouch/stand handlers.
    this.setOrigin(0.5, 1)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setSize(PLAYER_SPRITE_W, PLAYER_SPRITE_H)
    body.setOffset(0, 0)
    body.setMaxVelocityX(PLAYER_SPEED_BASE * 2)

    // Load Firebase save state; emits 'player-state-restored' when ready.
    this.restoreState(uid)
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  // Called by GameScene each frame based on ice-wall tile overlap result
  setNearIceTile(near: boolean): void {
    this.isNearIceTile_ = near
  }

  // Called by CheckpointSystem on checkpoint touch
  replenishAtCheckpoint(): void {
    this.hp        = Math.min(this.maxHp, this.hp + CHECKPOINT_HP_RESTORE)
    this.oxygen    = 100
    this.ropeUses  = ROPE_THROW_USES
    this.iceAxeUses = ICE_AXE_USES
  }

  // Called by KarmaSystem or any scene that awards/deducts karma
  addKarma(delta: number): void {
    this.karma = Math.max(0, this.karma + delta)
  }

  // ─── Entity contract ──────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    this.handleInputDelay(delta)
    this.handleCrouch()
    this.handleMovement()
    this.handleJump(delta)
    this.handleIceAxe()
    this.handleRopeThrow()
    this.updateFacing()
  }

  protected onDeath(): void {
    this.scene.events.emit('player-died')
    this.setActive(false).setVisible(false)
  }

  // ─── Movement ─────────────────────────────────────────────────────────────

  private handleMovement(): void {
    if (this.isGrabbingIce) {
      // Anchored — zero horizontal drift, slow controlled slide down ice wall
      const body = this.body as Phaser.Physics.Arcade.Body
      body.setVelocityX(0)
      body.setVelocityY(ICE_WALL_SLIDE_SPEED)
      return
    }

    const speed = PLAYER_SPEED_BASE
      * this.speedMultiplier
      * (this.isCrouching ? 0.5 : 1)

    ;(this.body as Phaser.Physics.Arcade.Body).setVelocityX(
      this.pendingMoveX * speed,
    )
  }

  private handleJump(delta: number): void {
    const body     = this.body as Phaser.Physics.Arcade.Body
    const onGround = body.blocked.down

    // Initiate jump — not allowed while crouching or wall-grabbing
    if (this.controls.isJustDown('jump') && onGround && !this.isCrouching && !this.isGrabbingIce) {
      body.setVelocityY(PLAYER_JUMP_FORCE)
      this.jumpHeld  = true
      this.jumpHoldMs = 0
    }

    // Variable height — holding jump while still rising extends the arc.
    // We apply -60% of world gravity as a per-body counter-force, so the
    // player decelerates more slowly and reaches a higher peak.
    if (this.jumpHeld) {
      const stillRising    = body.velocity.y < 0
      const withinWindow   = this.jumpHoldMs < JUMP_HOLD_MAX_MS
      const jumpStillHeld  = this.controls.isDown('jump')

      if (jumpStillHeld && stillRising && withinWindow) {
        this.jumpHoldMs += delta
        body.setGravityY(-(PLAYER_GRAVITY * 0.6))
      } else {
        this.jumpHeld = false
        body.setGravityY(0)   // restore to world gravity only
      }
    }
  }

  // ─── Crouch ───────────────────────────────────────────────────────────────

  private handleCrouch(): void {
    const body      = this.body as Phaser.Physics.Arcade.Body
    const onGround  = body.blocked.down
    const wantsCrouch = this.controls.isDown('down') && onGround

    if (wantsCrouch && !this.isCrouching) {
      this.isCrouching = true
      body.setSize(PLAYER_SPRITE_W, CROUCH_HEIGHT_PX)
      // With origin(0.5, 1) the body top-left is at (x-16, y-48).
      // Shift body down by the removed height so feet stay planted at y.
      body.setOffset(0, PLAYER_SPRITE_H - CROUCH_HEIGHT_PX)
    } else if (!wantsCrouch && this.isCrouching) {
      this.isCrouching = false
      body.setSize(PLAYER_SPRITE_W, PLAYER_SPRITE_H)
      body.setOffset(0, 0)
    }
  }

  // ─── Ice axe ──────────────────────────────────────────────────────────────

  private handleIceAxe(): void {
    const body       = this.body as Phaser.Physics.Arcade.Body
    const wantsGrab  = this.controls.isDown('iceAxe') && this.isNearIceTile_

    if (wantsGrab && !this.isGrabbingIce) {
      this.isGrabbingIce = true
      // Cancel world gravity entirely so the player sticks to the wall.
      // ICE_WALL_SLIDE_SPEED (60 px/s down) is applied in handleMovement
      // as a slow controlled slide rather than freefall.
      body.setGravityY(-PLAYER_GRAVITY)
    } else if (!wantsGrab && this.isGrabbingIce) {
      this.isGrabbingIce = false
      body.setGravityY(0)
    }
  }

  // ─── Rope throw ───────────────────────────────────────────────────────────

  private handleRopeThrow(): void {
    if (!this.controls.isJustDown('rope')) return
    if (this.ropeUses <= 0) return

    this.ropeUses--
    // RopeSystem (wired up by GameScene) listens for this and handles
    // grapple physics, attach point detection, and Bezier rendering.
    this.scene.events.emit('rope-throw', {
      x:        this.x,
      y:        this.y,
      direction: this.flipX ? -1 : 1,
      ropeUses:  this.ropeUses,
    })
  }

  // ─── Input delay (death zone altitude confusion) ──────────────────────────

  private handleInputDelay(delta: number): void {
    if (this.inputDelayMs === 0) {
      // No delay — sample every frame
      this.pendingMoveX = this.controls.moveX
      return
    }
    // Accumulate time; only read input when the delay window has elapsed.
    // Between reads pendingMoveX holds its last value, creating the sluggish
    // 80ms lag the GDD specifies for the death zone.
    this.inputDelayAccum += delta
    if (this.inputDelayAccum >= this.inputDelayMs) {
      this.inputDelayAccum -= this.inputDelayMs
      this.pendingMoveX = this.controls.moveX
    }
  }

  private updateFacing(): void {
    if (this.pendingMoveX < 0) this.setFlipX(true)
    if (this.pendingMoveX > 0) this.setFlipX(false)
  }

  // ─── Firebase save restore ────────────────────────────────────────────────

  private async restoreState(uid: string): Promise<void> {
    try {
      const save = await loadGame(uid, 0)
      if (save) {
        this.karma = save.karma
        // hp and oxygen always start full; altitude systems and checkpoints
        // control them during the run. currentLevel / summitedMountains are
        // owned by GameScene, not the player entity.
      }
    } catch (err) {
      console.warn('[Player] Could not restore save:', err)
    } finally {
      // Always emit so GameScene can proceed even on a fresh account
      this.scene.events.emit('player-state-restored', this)
    }
  }
}
