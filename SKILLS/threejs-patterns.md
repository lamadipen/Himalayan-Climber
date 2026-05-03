# SKILL — Three.js + Rapier Patterns (3D Games)

> Read this before writing any Three.js or 3D game code.
> Covers scene setup, physics, first-person and third-person controllers.

---

## Core scene setup

```typescript
// src/engine/GameEngine3D.ts
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'

export class GameEngine3D {
  scene:    THREE.Scene
  camera:   THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  world!:   RAPIER.World
  private rafId = 0
  private clock = new THREE.Clock()

  constructor(canvas: HTMLCanvasElement) {
    this.scene    = new THREE.Scene()
    this.scene.background = new THREE.Color(0x111122)
    this.scene.fog = new THREE.Fog(0x111122, 20, 100)

    this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 200)
    this.camera.position.set(0, 1.7, 5)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }

  async initPhysics() {
    await RAPIER.init()
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  }

  start(onUpdate: (delta: number) => void) {
    const loop = () => {
      this.rafId = requestAnimationFrame(loop)
      const delta = this.clock.getDelta()
      this.world.step()
      onUpdate(delta)
      this.renderer.render(this.scene, this.camera)
    }
    loop()
  }

  stop() { cancelAnimationFrame(this.rafId) }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }
}
```

---

## First-person controller (FPS / exploration)

```typescript
// src/entities/FirstPersonController.ts
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'

export class FirstPersonController {
  private body:    RAPIER.RigidBody
  private yaw  = 0
  private pitch = 0
  private moveDir = new THREE.Vector3()
  private isGrounded = false
  private keys: Record<string, boolean> = {}

  constructor(
    private camera: THREE.Camera,
    world: RAPIER.World,
    startPos: THREE.Vector3
  ) {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(startPos.x, startPos.y, startPos.z)
      .lockRotations()
    this.body = world.createRigidBody(bodyDesc)
    world.createCollider(RAPIER.ColliderDesc.capsule(0.8, 0.4), this.body)

    document.addEventListener('keydown', e => this.keys[e.code] = true)
    document.addEventListener('keyup',   e => this.keys[e.code] = false)
    document.addEventListener('mousemove', e => this.onMouseMove(e))
  }

  private onMouseMove(e: MouseEvent) {
    if (!document.pointerLockElement) return
    this.yaw   -= e.movementX * 0.002
    this.pitch  = Math.max(-1.4, Math.min(1.4, this.pitch - e.movementY * 0.002))
  }

  update(delta: number) {
    // Rotate camera
    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.y = this.yaw
    this.camera.rotation.x = this.pitch

    // Movement relative to look direction
    const fwd  = +((this.keys['KeyW'] || this.keys['ArrowUp'])    ? 1 : 0)
    const back = +((this.keys['KeyS'] || this.keys['ArrowDown'])  ? 1 : 0)
    const left = +((this.keys['KeyA'] || this.keys['ArrowLeft'])  ? 1 : 0)
    const rgt  = +((this.keys['KeyD'] || this.keys['ArrowRight']) ? 1 : 0)

    const speed = 6
    this.moveDir.set(rgt - left, 0, back - fwd).normalize().multiplyScalar(speed)
    this.moveDir.applyEuler(new THREE.Euler(0, this.yaw, 0))

    const vel = this.body.linvel()
    this.body.setLinvel({ x: this.moveDir.x, y: vel.y, z: this.moveDir.z }, true)

    // Jump
    if (this.keys['Space'] && this.isGrounded) {
      this.body.setLinvel({ x: vel.x, y: 6, z: vel.z }, true)
      this.isGrounded = false
    }

    // Sync camera to physics body
    const pos = this.body.translation()
    this.camera.position.set(pos.x, pos.y + 0.8, pos.z)
  }

  setGrounded(v: boolean) { this.isGrounded = v }
}
```

---

## Low-poly level creation

```typescript
// Fast low-poly level from simple geometry — good for puzzle games
export function buildLowPolyLevel(scene: THREE.Scene, world: RAPIER.World) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true })

  // Floor
  addBox(scene, world, { w: 20, h: 0.5, d: 20 }, { x: 0, y: -0.25, z: 0 }, 0x88aa66, true)

  // Platforms
  addBox(scene, world, { w: 4, h: 0.4, d: 4 }, { x: 5, y: 2, z: -3 }, 0xaa8866, true)
  addBox(scene, world, { w: 3, h: 0.4, d: 3 }, { x: -4, y: 4, z: -6 }, 0x6688aa, true)
}

function addBox(
  scene: THREE.Scene,
  world: RAPIER.World,
  size: { w: number; h: number; d: number },
  pos: { x: number; y: number; z: number },
  color: number,
  isStatic: boolean
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size.w, size.h, size.d),
    new THREE.MeshLambertMaterial({ color })
  )
  mesh.position.set(pos.x, pos.y, pos.z)
  mesh.castShadow = mesh.receiveShadow = true
  scene.add(mesh)

  const desc = isStatic
    ? RAPIER.RigidBodyDesc.fixed()
    : RAPIER.RigidBodyDesc.dynamic()
  desc.setTranslation(pos.x, pos.y, pos.z)
  const body = world.createRigidBody(desc)
  world.createCollider(RAPIER.ColliderDesc.cuboid(size.w/2, size.h/2, size.d/2), body)

  return { mesh, body }
}
```

---

## Lighting setup (low-poly style)

```typescript
export function setupLowPolyLighting(scene: THREE.Scene) {
  // Ambient — flat base light
  scene.add(new THREE.AmbientLight(0xffeedd, 0.4))

  // Sun directional
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2)
  sun.position.set(10, 20, 10)
  sun.castShadow = true
  sun.shadow.mapSize.width  = 2048
  sun.shadow.mapSize.height = 2048
  sun.shadow.camera.near = 0.5
  sun.shadow.camera.far  = 100
  sun.shadow.camera.left = sun.shadow.camera.bottom = -30
  sun.shadow.camera.right = sun.shadow.camera.top  =  30
  scene.add(sun)

  // Fill light from opposite side
  scene.add(new THREE.DirectionalLight(0x8899ff, 0.3).position.set(-10, 5, -10) as any)
}
```

---

## Responsive resize handler

```typescript
window.addEventListener('resize', () => {
  engine.onResize()
})
```

---

## Asset loading (GLB models)

```typescript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

const draco  = new DRACOLoader()
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')

const loader = new GLTFLoader()
loader.setDRACOLoader(draco)

export async function loadModel(path: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    loader.load(path, gltf => {
      gltf.scene.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      resolve(gltf.scene)
    }, undefined, reject)
  })
}
```
