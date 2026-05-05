import * as THREE from 'three'
import { Entity } from './Entity'
import type { PlatformDef } from '../types'
import { PhysicsWorld } from '../physics/PhysicsWorld'
import type { RapierType } from '../types'
import RAPIER from '@dimforge/rapier3d-compat'

const PLATFORM_COLORS: Record<string, number> = {
  stone: 0x6B5B4B,
  ice: 0x7DC8E0,
  snow: 0xE8EEFF,
  ice_bridge: 0x9ECCE8,
}

const PLATFORM_ROUGHNESS: Record<string, number> = {
  stone: 0.9,
  ice: 0.05,
  snow: 0.85,
  ice_bridge: 0.05,
}

const PLATFORM_METALNESS: Record<string, number> = {
  stone: 0,
  ice: 0.3,
  snow: 0,
  ice_bridge: 0.3,
}

const PLATFORM_FRICTION: Record<string, number> = {
  stone: 0.75,
  ice: 0.05,
  snow: 0.75,
  ice_bridge: 0.05,
}

export class Platform extends Entity {
  mesh: THREE.Mesh
  private body: RAPIER.RigidBody
  private physics: PhysicsWorld

  isBreaking = false
  isBroken = false
  private breakTimer = 0
  private readonly BREAK_DURATION = 2.5
  private flickerTimer = 0

  constructor(
    def: PlatformDef,
    scene: THREE.Scene,
    physics: PhysicsWorld,
    _RAPIER: RapierType
  ) {
    super()
    this.physics = physics

    const [w, h, d] = def.size
    const [cx, cy, cz] = def.pos

    const geo = new THREE.BoxGeometry(w, h, d)
    const mat = new THREE.MeshStandardMaterial({
      color: PLATFORM_COLORS[def.type] ?? 0x888888,
      roughness: PLATFORM_ROUGHNESS[def.type] ?? 0.8,
      metalness: PLATFORM_METALNESS[def.type] ?? 0,
    })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.position.set(cx, cy, cz)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    scene.add(this.mesh)

    const friction = PLATFORM_FRICTION[def.type] ?? 0.75
    this.body = physics.createStaticCuboid(cx, cy, cz, w / 2, h / 2, d / 2, friction)
  }

  startBreaking(): void {
    if (!this.isBroken && !this.isBreaking) {
      this.isBreaking = true
      this.breakTimer = this.BREAK_DURATION
    }
  }

  update(dt: number): void {
    if (this.isBroken) return

    if (this.isBreaking) {
      this.breakTimer -= dt
      this.flickerTimer += dt

      // Shake the mesh
      const shake = Math.sin(this.flickerTimer * 30) * 0.05 * (1 - this.breakTimer / this.BREAK_DURATION)
      this.mesh.position.x += shake * 0.1
      this.mesh.rotation.z = shake * 0.05

      // Flicker at the end
      if (this.breakTimer < 0.8) {
        this.mesh.visible = Math.floor(this.flickerTimer * 10) % 2 === 0
      }

      if (this.breakTimer <= 0) {
        this.break()
      }
    }
  }

  private break(): void {
    this.isBroken = true
    this.mesh.visible = false
    try {
      this.physics.removeBody(this.body)
    } catch {
      // body may already be removed
    }
  }

  destroy(): void {
    this.mesh.removeFromParent()
    if (!this.isBroken) {
      try {
        this.physics.removeBody(this.body)
      } catch {
        // ignore
      }
    }
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
  }
}
