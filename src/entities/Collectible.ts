import * as THREE from 'three'
import { Entity } from './Entity'
import type { CollectibleDef, CollectibleType } from '../types'

export class Collectible extends Entity {
  private mesh: THREE.Mesh
  private scene: THREE.Scene
  private baseY: number

  collected = false
  readonly type: CollectibleType

  constructor(def: CollectibleDef, scene: THREE.Scene) {
    super()
    this.scene = scene
    this.type = def.type
    this.baseY = def.pos[1]

    let geo: THREE.BufferGeometry
    let mat: THREE.MeshStandardMaterial

    if (def.type === 'oxygen') {
      geo = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 12)
      mat = new THREE.MeshStandardMaterial({
        color: 0x22CC44,
        emissive: 0x004400,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.5,
      })
    } else {
      geo = new THREE.SphereGeometry(0.25, 12, 12)
      mat = new THREE.MeshStandardMaterial({
        color: 0xFF8822,
        emissive: 0x441100,
        emissiveIntensity: 0.6,
        roughness: 0.4,
        metalness: 0.2,
      })
    }

    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.position.set(def.pos[0], def.pos[1], def.pos[2])
    this.mesh.castShadow = true
    scene.add(this.mesh)
  }

  update(dt: number): void {
    if (this.collected) return
    // Float animation
    this.mesh.position.y = this.baseY + Math.sin(Date.now() * 0.002) * 0.3
    // Rotate
    this.mesh.rotation.y += dt * 1.5
  }

  checkCollection(playerPos: THREE.Vector3): boolean {
    if (this.collected) return false
    const dx = this.mesh.position.x - playerPos.x
    const dy = this.mesh.position.y - playerPos.y
    const dz = this.mesh.position.z - playerPos.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (dist < 1.2) {
      this.collected = true
      this.scene.remove(this.mesh)
      return true
    }
    return false
  }

  destroy(): void {
    this.scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
  }
}
