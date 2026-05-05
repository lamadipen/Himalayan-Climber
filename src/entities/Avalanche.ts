import * as THREE from 'three'
import { Entity } from './Entity'
import { PhysicsWorld } from '../physics/PhysicsWorld'
import { EventBus } from '../core/EventBus'
import RAPIER from '@dimforge/rapier3d-compat'

export class Avalanche extends Entity {
  private mesh: THREE.Mesh
  private body: RAPIER.RigidBody
  private physics: PhysicsWorld
  private events: EventBus
  private spawnPos: THREE.Vector3
  private scene: THREE.Scene

  isAlive = true
  private playerPos = new THREE.Vector3()

  setPlayerPos(pos: THREE.Vector3): void {
    this.playerPos.copy(pos)
  }

  constructor(
    spawnPos: [number, number, number],
    scene: THREE.Scene,
    physics: PhysicsWorld,
    events: EventBus
  ) {
    super()
    this.scene = scene
    this.physics = physics
    this.events = events
    this.spawnPos = new THREE.Vector3(...spawnPos)

    const geo = new THREE.SphereGeometry(0.6, 8, 8)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xB0C0D0,
      roughness: 0.6,
      metalness: 0.1,
    })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.castShadow = true
    scene.add(this.mesh)

    this.body = physics.createDynamicSphere(
      spawnPos[0], spawnPos[1], spawnPos[2], 0.6
    )
    // Give it an initial leftward push
    this.body.applyImpulse({ x: -8, y: -2, z: 0 }, true)
  }

  update(_dt: number): void {
    if (!this.isAlive) return

    const t = this.body.translation()
    this.mesh.position.set(t.x, t.y, t.z)

    // Check proximity to player
    const dx = t.x - this.playerPos.x
    const dy = t.y - this.playerPos.y
    const dz = t.z - this.playerPos.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist < 0.9) {
      this.events.emit('player:died')
      this.isAlive = false
      return
    }

    // Remove if traveled too far or fell below
    const travelX = Math.abs(t.x - this.spawnPos.x)
    if (travelX > 40 || t.y < -10) {
      this.isAlive = false
    }
  }

  destroy(): void {
    this.scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
    try {
      this.physics.removeBody(this.body)
    } catch {
      // ignore
    }
  }
}
