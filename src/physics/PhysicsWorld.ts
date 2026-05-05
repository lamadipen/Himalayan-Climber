import RAPIER from '@dimforge/rapier3d-compat'
import type { RapierType } from '../types'
import { PLAYER_HALF_HEIGHT, PLAYER_RADIUS } from '../types'

export class PhysicsWorld {
  world: RAPIER.World
  private R: RapierType

  constructor(R: RapierType) {
    this.R = R
    this.world = new R.World({ x: 0, y: -18, z: 0 })
  }

  step(): void {
    this.world.step()
  }

  createStaticCuboid(
    cx: number, cy: number, cz: number,
    hw: number, hh: number, hd: number,
    friction = 0.8
  ): RAPIER.RigidBody {
    const bodyDesc = this.R.RigidBodyDesc.fixed().setTranslation(cx, cy, cz)
    const body = this.world.createRigidBody(bodyDesc)
    const colDesc = this.R.ColliderDesc.cuboid(hw, hh, hd)
      .setFriction(friction)
      .setRestitution(0)
    this.world.createCollider(colDesc, body)
    return body
  }

  createDynamicSphere(
    cx: number, cy: number, cz: number,
    radius: number
  ): RAPIER.RigidBody {
    const bodyDesc = this.R.RigidBodyDesc.dynamic().setTranslation(cx, cy, cz)
    const body = this.world.createRigidBody(bodyDesc)
    const colDesc = this.R.ColliderDesc.ball(radius)
      .setFriction(0.3)
      .setRestitution(0.2)
      .setDensity(2.0)
    this.world.createCollider(colDesc, body)
    return body
  }

  createCharacterBody(
    cx: number, cy: number, cz: number
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const bodyDesc = this.R.RigidBodyDesc
      .kinematicPositionBased()
      .setTranslation(cx, cy, cz)
      .lockRotations()
    const body = this.world.createRigidBody(bodyDesc)
    const colDesc = this.R.ColliderDesc
      .capsule(PLAYER_HALF_HEIGHT, PLAYER_RADIUS)
      .setFriction(0)
      .setRestitution(0)
    const collider = this.world.createCollider(colDesc, body)
    return { body, collider }
  }

  createKinematicController(offset = 0.01): RAPIER.KinematicCharacterController {
    return this.world.createCharacterController(offset)
  }

  removeBody(body: RAPIER.RigidBody): void {
    this.world.removeRigidBody(body)
  }

  destroy(): void {
    this.world.free()
    this.world = new this.R.World({ x: 0, y: -18, z: 0 })
  }
}
