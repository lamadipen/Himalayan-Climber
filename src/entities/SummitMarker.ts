import * as THREE from 'three'
import { Entity } from './Entity'

export class SummitMarker extends Entity {
  private group: THREE.Group
  private flags: THREE.Mesh[] = []
  private light: THREE.PointLight
  private scene: THREE.Scene

  constructor(pos: [number, number, number], scene: THREE.Scene) {
    super()
    this.scene = scene
    this.group = new THREE.Group()
    this.group.position.set(pos[0], pos[1], pos[2])

    // Vertical pole
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 5, 8)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 })
    const pole = new THREE.Mesh(poleGeo, poleMat)
    pole.position.y = 2.5
    pole.castShadow = true
    this.group.add(pole)

    // Three colored flags
    const flagColors = [0xCC2200, 0xFFFFFF, 0x003399]
    const flagNames = ['red', 'white', 'blue']
    flagColors.forEach((color, i) => {
      const flagGeo = new THREE.PlaneGeometry(0.8, 0.5)
      const flagMat = new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        roughness: 0.9,
      })
      const flag = new THREE.Mesh(flagGeo, flagMat)
      flag.position.set(0.4, 5 - i * 0.7, 0)
      flag.castShadow = true
      this.group.add(flag)
      this.flags.push(flag)
    })

    // Golden point light at top
    this.light = new THREE.PointLight(0xFFD700, 2, 8)
    this.light.position.set(0, 5.5, 0)
    this.group.add(this.light)

    scene.add(this.group)
  }

  update(_dt: number): void {
    const t = Date.now() * 0.002
    this.flags.forEach((flag, i) => {
      flag.rotation.z = Math.sin(t + i * 0.5) * 0.15
    })
  }

  checkReached(playerPos: THREE.Vector3): boolean {
    const dx = playerPos.x - this.group.position.x
    const dz = playerPos.z - this.group.position.z
    return Math.sqrt(dx * dx + dz * dz) < 2.0
  }

  destroy(): void {
    this.scene.remove(this.group)
  }
}
