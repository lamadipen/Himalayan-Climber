import * as THREE from 'three'

function buildMountainPlane(
  width: number,
  height: number,
  color: number,
  z: number,
  seed: number
): THREE.Mesh {
  const segments = 80
  const geo = new THREE.PlaneGeometry(width, height, segments, 1)
  const pos = geo.getAttribute('position') as THREE.BufferAttribute

  // Displace top vertices upward to create mountain peaks
  // PlaneGeometry (segments+1)*(heightSegs+1) total verts
  // Bottom row: indices 0..segments, Top row: (segments+1)..2*(segments+1)-1
  for (let i = 0; i <= segments; i++) {
    const xFrac = i / segments
    const peaks =
      Math.sin(xFrac * Math.PI * (3 + seed)) * 0.4 +
      Math.sin(xFrac * Math.PI * (7 + seed * 0.5)) * 0.25 +
      Math.sin(xFrac * Math.PI * (13 + seed)) * 0.15

    // Top row vertices have index (segments+1) + i
    const topVertIdx = (segments + 1) + i
    const yOrig = pos.getY(topVertIdx)
    pos.setY(topVertIdx, yOrig + peaks * height * 0.7)
  }

  geo.computeVertexNormals()

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 1.0,
    metalness: 0,
    side: THREE.FrontSide,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(80, 15, z)
  mesh.receiveShadow = false
  mesh.castShadow = false
  return mesh
}

export class MountainBackground {
  private farLayer: THREE.Mesh
  private midLayer: THREE.Mesh
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.farLayer = buildMountainPlane(400, 120, 0x8090A8, -80, 1.3)
    this.midLayer = buildMountainPlane(400, 120, 0xA0B0C0, -50, 2.7)

    scene.add(this.farLayer)
    scene.add(this.midLayer)
  }

  setColors(skyColor: number, snowColor: number): void {
    ;(this.farLayer.material as THREE.MeshStandardMaterial).color.setHex(
      blendColors(skyColor, snowColor, 0.6)
    )
    ;(this.midLayer.material as THREE.MeshStandardMaterial).color.setHex(
      blendColors(skyColor, snowColor, 0.4)
    )
  }

  destroy(): void {
    this.scene.remove(this.farLayer)
    this.scene.remove(this.midLayer)
    this.farLayer.geometry.dispose()
    this.midLayer.geometry.dispose()
    ;(this.farLayer.material as THREE.Material).dispose()
    ;(this.midLayer.material as THREE.Material).dispose()
  }
}

function blendColors(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bv = Math.round(ab + (bb - ab) * t)
  return (r << 16) | (g << 8) | bv
}
