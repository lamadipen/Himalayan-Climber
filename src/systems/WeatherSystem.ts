import * as THREE from 'three'
import type { EnvironmentConfig } from '../types'

export class WeatherSystem {
  windForce = 0
  private windDir = new THREE.Vector3(-1, 0, 0)
  private windTimer = 0

  constructor(private scene: THREE.Scene) {}

  setEnvironment(env: EnvironmentConfig): void {
    this.windForce = env.windForce
  }

  getWindVector(): THREE.Vector3 {
    return this.windDir.clone().multiplyScalar(this.windForce * 4)
  }

  update(dt: number): void {
    this.windTimer += dt
    // Subtle wind direction wobble
    const wobble = Math.sin(this.windTimer * 0.3) * 0.1
    this.windDir.x = -1 + wobble
    this.windDir.normalize()
  }
}
