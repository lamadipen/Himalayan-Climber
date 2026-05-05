import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { Entity } from './Entity'
import type { RapierType } from '../types'
import { EventBus } from '../core/EventBus'
import { InputManager } from '../core/InputManager'
import { PhysicsWorld } from '../physics/PhysicsWorld'
import { GRAVITY, JUMP_SPEED, MOVE_SPEED, PLAYER_HALF_HEIGHT, PLAYER_RADIUS } from '../types'

export class Player extends Entity {
  mesh: THREE.Group
  private body: RAPIER.RigidBody
  private collider: RAPIER.Collider
  private controller: RAPIER.KinematicCharacterController
  private physics: PhysicsWorld
  private scene: THREE.Scene
  private events: EventBus

  private vel = { x: 0, y: 0 }
  isGrounded = false

  private speedMultiplier = 1.0
  private jumpMultiplier = 1.0
  private facingRight = true

  // Game-feel: coyote time + jump buffer
  private coyoteFrames = 0        // frames since last grounded
  private jumpBufferFrames = 0    // frames since jump was pressed

  constructor(
    startPos: [number, number, number],
    scene: THREE.Scene,
    physics: PhysicsWorld,
    _RAPIER: RapierType,
    _events: EventBus,
    private input: InputManager
  ) {
    super()
    this.scene = scene
    this.physics = physics
    this.events = _events

    // Create physics body
    const { body, collider } = physics.createCharacterBody(startPos[0], startPos[1], startPos[2])
    this.body = body
    this.collider = collider

    // Create character controller
    this.controller = physics.createKinematicController(0.01)
    this.controller.setUp({ x: 0, y: 1, z: 0 })
    this.controller.setMaxSlopeClimbAngle(Math.PI / 2.5)
    this.controller.setMinSlopeSlideAngle(Math.PI / 3.0)
    this.controller.enableSnapToGround(0.5)

    // Build mesh
    this.mesh = this.buildMesh()
    this.mesh.position.set(startPos[0], startPos[1], startPos[2])
    scene.add(this.mesh)
  }

  private buildMesh(): THREE.Group {
    const group = new THREE.Group()

    // Body (capsule approximation with cylinder)
    const bodyGeo = new THREE.CapsuleGeometry(PLAYER_RADIUS, 1.0, 4, 8)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xCC2200, roughness: 0.8 })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 0
    body.castShadow = true
    group.add(body)

    // Head
    const headGeo = new THREE.SphereGeometry(0.22, 12, 12)
    const headMat = new THREE.MeshStandardMaterial({ color: 0xD4975A, roughness: 0.9 })
    const head = new THREE.Mesh(headGeo, headMat)
    head.position.y = 0.75
    head.castShadow = true
    group.add(head)

    // Backpack
    const packGeo = new THREE.BoxGeometry(0.3, 0.4, 0.15)
    const packMat = new THREE.MeshStandardMaterial({ color: 0x2244AA, roughness: 0.8 })
    const pack = new THREE.Mesh(packGeo, packMat)
    pack.position.set(-0.18, 0.1, -0.2)
    pack.castShadow = true
    group.add(pack)

    // Ice axe
    const axeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6)
    const axeMat = new THREE.MeshStandardMaterial({ color: 0xAAAAAA, roughness: 0.4, metalness: 0.7 })
    const axe = new THREE.Mesh(axeGeo, axeMat)
    axe.position.set(0.25, 0.1, -0.1)
    axe.rotation.z = Math.PI / 6
    axe.castShadow = true
    group.add(axe)

    return group
  }

  get position(): THREE.Vector3 {
    const t = this.body.translation()
    return new THREE.Vector3(t.x, t.y, t.z)
  }

  applyAltitudeMultiplier(speedMult: number, jumpMult: number): void {
    this.speedMultiplier = speedMult
    this.jumpMultiplier = jumpMult
  }

  applyWind(dx: number): void {
    this.vel.x += dx
  }

  reset(pos: [number, number, number]): void {
    this.body.setNextKinematicTranslation({ x: pos[0], y: pos[1], z: pos[2] })
    this.vel.x = 0
    this.vel.y = 0
  }

  update(dt: number): void {
    const effectiveSpeed = MOVE_SPEED * this.speedMultiplier
    const effectiveJump = 15 * this.jumpMultiplier  // snappier than the imported constant

    // Horizontal input
    let moveX = 0
    if (this.input.isDown('ArrowLeft') || this.input.isDown('a')) {
      moveX = -effectiveSpeed
    }
    if (this.input.isDown('ArrowRight') || this.input.isDown('d')) {
      moveX = effectiveSpeed
    }
    this.vel.x = moveX

    // Face direction
    if (moveX > 0) this.facingRight = true
    else if (moveX < 0) this.facingRight = false
    this.mesh.scale.x = this.facingRight ? 1 : -1

    // Coyote time: allow jump a few frames after walking off a ledge
    if (this.isGrounded) {
      this.coyoteFrames = 6
    } else if (this.coyoteFrames > 0) {
      this.coyoteFrames--
    }

    // Jump buffer: accept jump input a few frames before landing
    const jumpPressed = this.input.wasPressed('Space') ||
      this.input.wasPressed('ArrowUp') ||
      this.input.wasPressed('w')
    if (jumpPressed) {
      this.jumpBufferFrames = 8
    } else if (this.jumpBufferFrames > 0) {
      this.jumpBufferFrames--
    }

    // Fire jump if buffered input + coyote window both valid
    if (this.jumpBufferFrames > 0 && this.coyoteFrames > 0) {
      this.vel.y = effectiveJump
      this.coyoteFrames = 0
      this.jumpBufferFrames = 0
    }

    // Gravity — stronger on the way down for snappier arc
    if (!this.isGrounded) {
      const gravityScale = this.vel.y < 0 ? 1.6 : 1.0  // fall faster than rise
      this.vel.y += GRAVITY * gravityScale * dt
    } else if (this.vel.y < 0) {
      this.vel.y = 0
    }

    // Disable snap-to-ground while jumping so upward velocity isn't cancelled
    if (this.vel.y > 0.1) {
      this.controller.disableSnapToGround()
    } else {
      this.controller.enableSnapToGround(0.1)
    }

    // Compute movement
    const movement = { x: this.vel.x * dt, y: this.vel.y * dt, z: 0 }
    this.controller.computeColliderMovement(this.collider, movement)
    const mv = this.controller.computedMovement()
    this.isGrounded = this.controller.computedGrounded()

    const pos = this.body.translation()
    const newX = pos.x + mv.x
    const newY = pos.y + mv.y

    this.body.setNextKinematicTranslation({ x: newX, y: newY, z: pos.z })

    // Sync mesh with body
    const bobY = Math.sin(Date.now() * 0.003) * 0.02
    this.mesh.position.set(newX, newY + bobY, 0)
  }

  destroy(): void {
    this.scene.remove(this.mesh)
    try {
      this.physics.removeBody(this.body)
    } catch {
      // ignore
    }
    this.physics.world.removeCharacterController(this.controller)
  }
}
