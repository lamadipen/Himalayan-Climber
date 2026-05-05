import * as THREE from 'three'
import type { LevelConfig, CollectibleType } from '../types'
import { Platform } from '../entities/Platform'
import { Avalanche } from '../entities/Avalanche'
import { Collectible } from '../entities/Collectible'
import { SummitMarker } from '../entities/SummitMarker'
import { PhysicsWorld } from '../physics/PhysicsWorld'
import type { RapierType } from '../types'
import { EventBus } from '../core/EventBus'

export abstract class LevelBase {
  abstract readonly config: LevelConfig

  protected platforms: Platform[] = []
  protected avalanches: Avalanche[] = []
  protected collectibles: Collectible[] = []
  protected summitMarker!: SummitMarker
  protected checkpointMeshes: THREE.Mesh[] = []
  protected groundMesh!: THREE.Mesh

  // Hazard spawn timers: map from hazard index -> elapsed ms since last spawn
  private hazardTimers: number[] = []

  constructor(
    protected scene: THREE.Scene,
    protected physics: PhysicsWorld,
    protected RAPIER: RapierType,
    protected events: EventBus
  ) {}

  build(): void {
    this.buildGround()
    this.buildPlatforms()
    this.buildCollectibles()
    this.buildSummitMarker()
    this.buildCheckpoints()
    this.initHazardTimers()
  }

  private buildGround(): void {
    const geo = new THREE.BoxGeometry(300, 1, 8)
    const mat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 1 })
    this.groundMesh = new THREE.Mesh(geo, mat)
    this.groundMesh.position.set(80, -0.75, 0)
    this.groundMesh.receiveShadow = true
    this.scene.add(this.groundMesh)
    this.physics.createStaticCuboid(80, -0.75, 0, 150, 0.5, 4, 0.8)
  }

  private buildPlatforms(): void {
    for (const def of this.config.platforms) {
      const p = new Platform(def, this.scene, this.physics, this.RAPIER)
      this.platforms.push(p)
    }
  }

  private buildCollectibles(): void {
    for (const def of this.config.collectibles) {
      this.collectibles.push(new Collectible(def, this.scene))
    }
  }

  private buildSummitMarker(): void {
    this.summitMarker = new SummitMarker(this.config.summitPos, this.scene)
  }

  private buildCheckpoints(): void {
    for (const cp of this.config.checkpoints) {
      const geo = new THREE.SphereGeometry(0.3, 8, 8)
      const mat = new THREE.MeshStandardMaterial({ color: 0xFFAA00, emissive: 0x552200 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(cp[0], cp[1] + 1, cp[2])
      this.scene.add(mesh)
      this.checkpointMeshes.push(mesh)
    }
  }

  private initHazardTimers(): void {
    this.hazardTimers = this.config.hazards.map(() => 0)
  }

  update(dt: number, playerPos?: THREE.Vector3): void {
    this.platforms.forEach(p => p.update(dt))

    // Update and cull dead avalanches
    const pPos = playerPos ?? new THREE.Vector3()
    this.avalanches = this.avalanches.filter(a => {
      a.setPlayerPos(pPos)
      a.update(dt)
      if (!a.isAlive) {
        a.destroy()
        return false
      }
      return true
    })

    this.collectibles.forEach(c => c.update(dt))
    this.summitMarker.update(dt)

    // Animate checkpoint beacons
    this.checkpointMeshes.forEach(m => {
      m.rotation.y += dt * 2
      m.position.y += Math.sin(Date.now() * 0.003) * 0.001
    })

    // Spawn hazards based on timers
    this.config.hazards.forEach((hazard, idx) => {
      if (hazard.type === 'avalanche' || hazard.type === 'serac') {
        const interval = (hazard.interval ?? 5000) / 1000 // convert ms to s
        this.hazardTimers[idx] += dt
        if (this.hazardTimers[idx] >= interval) {
          this.hazardTimers[idx] = 0
          const av = new Avalanche(
            [hazard.pos[0], hazard.pos[1], hazard.pos[2]],
            this.scene,
            this.physics,
            this.events
          )
          this.avalanches.push(av)
        }
      }
      // wind_zone: applied by WeatherSystem, nothing to spawn
    })
  }

  checkSummit(playerPos: THREE.Vector3): boolean {
    return this.summitMarker.checkReached(playerPos)
  }

  checkCollectibles(playerPos: THREE.Vector3): CollectibleType | null {
    for (const c of this.collectibles) {
      if (!c.collected && c.checkCollection(playerPos)) return c.type
    }
    return null
  }

  checkCheckpoint(playerPos: THREE.Vector3): [number, number, number] | null {
    for (const cp of this.config.checkpoints) {
      const dx = playerPos.x - cp[0]
      const dy = playerPos.y - cp[1]
      if (Math.sqrt(dx * dx + dy * dy) < 3) return cp
    }
    return null
  }

  getMaxY(): number {
    return this.config.summitPos[1]
  }

  destroy(): void {
    this.platforms.forEach(p => p.destroy())
    this.avalanches.forEach(a => a.destroy())
    this.collectibles.forEach(c => c.destroy())
    this.summitMarker.destroy()
    this.checkpointMeshes.forEach(m => this.scene.remove(m))
    if (this.groundMesh) this.scene.remove(this.groundMesh)
  }
}
