import * as THREE from 'three'

const PARTICLE_COUNT = 1500

export class SnowParticles {
  private points: THREE.Points
  private positions: Float32Array
  private velocities: Float32Array
  private scene: THREE.Scene
  private intensity = 0
  private windX = 0
  private windZ = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.positions = new Float32Array(PARTICLE_COUNT * 3)
    this.velocities = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.resetParticle(i, true)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))

    const mat = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.12,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      sizeAttenuation: true,
    })

    this.points = new THREE.Points(geo, mat)
    this.points.visible = false
    scene.add(this.points)
  }

  private resetParticle(i: number, randomY = false): void {
    const base = i * 3
    this.positions[base]     = (Math.random() - 0.5) * 60
    this.positions[base + 1] = randomY ? (Math.random() - 0.5) * 35 : 28
    this.positions[base + 2] = (Math.random() - 0.5) * 10

    this.velocities[base]     = (Math.random() - 0.5) * 0.5
    this.velocities[base + 1] = -(0.8 + Math.random() * 1.2)
    this.velocities[base + 2] = (Math.random() - 0.5) * 0.2
  }

  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v))
    this.points.visible = this.intensity > 0
    const mat = this.points.material as THREE.PointsMaterial
    mat.opacity = 0.4 + this.intensity * 0.6
  }

  setWind(wx: number, wz: number): void {
    this.windX = wx
    this.windZ = wz
  }

  update(dt: number, cameraPos: THREE.Vector3): void {
    if (!this.points.visible) return

    const fallSpeed = 1.5 + this.intensity * 2.0
    const attr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const base = i * 3

      this.positions[base]     += (this.velocities[base] + this.windX * 0.5) * dt * fallSpeed
      this.positions[base + 1] += this.velocities[base + 1] * dt * fallSpeed
      this.positions[base + 2] += (this.velocities[base + 2] + this.windZ * 0.2) * dt * fallSpeed

      // Wrap vertically
      if (this.positions[base + 1] < -3) {
        this.resetParticle(i, false)
      }

      // Follow camera horizontally
      const localX = this.positions[base] - cameraPos.x
      if (Math.abs(localX) > 35) {
        this.positions[base] = cameraPos.x + (Math.random() - 0.5) * 60
        this.positions[base + 1] = cameraPos.y + 20 + Math.random() * 8
      }
    }

    attr.needsUpdate = true
  }

  destroy(): void {
    this.scene.remove(this.points)
    this.points.geometry.dispose()
    ;(this.points.material as THREE.Material).dispose()
  }
}
