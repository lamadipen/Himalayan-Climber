import * as THREE from 'three'
import type { RapierType, GameState, GameScreen, LevelConfig, EnvironmentConfig } from '../types'
import { MAX_LIVES, DEATH_PLANE_Y } from '../types'
import { EventBus } from './EventBus'
import { InputManager } from './InputManager'
import { PhysicsWorld } from '../physics/PhysicsWorld'
import { Player } from '../entities/Player'
import { AltitudeSystem } from '../systems/AltitudeSystem'
import { WeatherSystem } from '../systems/WeatherSystem'
import { OxygenSystem } from '../systems/OxygenSystem'
import { TimerSystem } from '../systems/TimerSystem'
import { SnowParticles } from '../effects/SnowParticles'
import { MountainBackground } from '../effects/MountainBackground'
import type { LevelBase } from '../levels/LevelBase'
import { getLevel } from '../levels/LevelRegistry'
import { HUD } from '../ui/HUD'
import { MainMenu } from '../ui/MainMenu'
import { Leaderboard } from '../ui/Leaderboard'
import { SummitScreen } from '../ui/SummitScreen'
import { PauseMenu } from '../ui/PauseMenu'

export class Game {
  // Three.js core
  private renderer!: THREE.WebGLRenderer
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private ambientLight!: THREE.AmbientLight
  private sunLight!: THREE.DirectionalLight

  // Physics
  physics!: PhysicsWorld

  // Systems
  private events: EventBus
  private input!: InputManager
  private altitudeSystem!: AltitudeSystem
  private weatherSystem!: WeatherSystem
  private oxygenSystem!: OxygenSystem
  private timerSystem!: TimerSystem

  // Effects
  private snowParticles!: SnowParticles
  private mountainBg!: MountainBackground

  // Entities
  private player: Player | null = null
  private currentLevel: LevelBase | null = null

  // UI
  private hud!: HUD
  private mainMenu!: MainMenu
  leaderboard!: Leaderboard
  private summitScreen!: SummitScreen
  private pauseMenu!: PauseMenu

  // Game state
  state: GameState = {
    screen: 'loading',
    currentLevel: 1,
    oxygen: 1.0,
    lives: MAX_LIVES,
    altitudeSickness: 0,
    checkpointPos: null,
    playerName: localStorage.getItem('himalayan_name') || '',
  }

  private rafId = 0
  private lastTime = 0
  private storyOverlay: HTMLDivElement | null = null
  private checkpointHit = new Set<string>()

  constructor(private RAPIER: RapierType) {
    this.events = new EventBus()
  }

  async init(): Promise<void> {
    this.setupRenderer()
    this.setupScene()
    this.setupSystems()
    this.setupUI()
    this.setupEventHandlers()
    window.addEventListener('resize', this.onResize)
  }

  private setupRenderer(): void {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
  }

  private setupScene(): void {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0d0525)
    this.scene.fog = new THREE.Fog(0x0d0525, 20, 80)

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300)
    this.camera.position.set(5, 8, 20)

    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(this.ambientLight)

    // Sun (directional)
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0)
    this.sunLight.position.set(10, 20, 10)
    this.sunLight.castShadow = true
    this.sunLight.shadow.camera.left   = -50
    this.sunLight.shadow.camera.right  =  50
    this.sunLight.shadow.camera.top    =  30
    this.sunLight.shadow.camera.bottom = -10
    this.sunLight.shadow.camera.near   = 0.5
    this.sunLight.shadow.camera.far    = 200
    this.sunLight.shadow.mapSize.set(2048, 2048)
    this.scene.add(this.sunLight)
    this.scene.add(this.sunLight.target)
  }

  private setupSystems(): void {
    this.physics = new PhysicsWorld(this.RAPIER)
    this.input = new InputManager()
    this.altitudeSystem = new AltitudeSystem(this.events)
    this.weatherSystem = new WeatherSystem(this.scene)
    this.oxygenSystem = new OxygenSystem(this.events)
    this.timerSystem = new TimerSystem()
    this.snowParticles = new SnowParticles(this.scene)
    this.mountainBg = new MountainBackground(this.scene)
  }

  private setupUI(): void {
    this.hud = new HUD()
    this.leaderboard = new Leaderboard()
    this.mainMenu = new MainMenu(this as any)
    this.summitScreen = new SummitScreen(this as any)
    this.pauseMenu = new PauseMenu(this as any)
  }

  private setupEventHandlers(): void {
    this.events.on('player:died', () => this.handlePlayerDeath())
    this.events.on('oxygen:depleted', () => this.handlePlayerDeath())
    this.events.on('altitude:sickness', (level: unknown) => {
      this.state.altitudeSickness = level as number
      this.updateAltitudeSicknessVisuals(level as number)
    })
  }

  start(): void {
    this.setState('menu')
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop)
    const rawDt = (now - this.lastTime) / 1000
    this.lastTime = now
    const dt = Math.min(rawDt, 0.05)
    this.tick(dt)
  }

  private tick(dt: number): void {
    if (this.state.screen === 'playing') {
      this.physics.step()
      this.tickPlaying(dt)
    }

    // Render
    this.renderer.render(this.scene, this.camera)

    // Clear pressed-this-frame AFTER all systems have read it
    this.input.update()
  }

  private tickPlaying(dt: number): void {
    if (!this.player || !this.currentLevel) return

    const cfg = this.currentLevel.config

    // Altitude system
    const playerY = this.player.position.y
    const maxY = this.currentLevel.getMaxY()
    this.altitudeSystem.setAltitude(cfg.altitudeMeters, playerY, maxY)
    this.altitudeSystem.update(dt)

    // Apply to player
    this.player.applyAltitudeMultiplier(
      this.altitudeSystem.speedMultiplier,
      this.altitudeSystem.jumpMultiplier
    )

    // Weather
    this.weatherSystem.update(dt)
    const wind = this.weatherSystem.getWindVector()
    this.player.applyWind(wind.x * dt)

    // Player
    this.player.update(dt)

    // Oxygen
    this.oxygenSystem.update(dt)
    this.state.oxygen = this.oxygenSystem.oxygen

    // Timer
    this.timerSystem.update(dt)

    // Level
    this.currentLevel.update(dt, this.player.position)

    // Death plane
    if (this.player.position.y < DEATH_PLANE_Y) {
      this.handlePlayerDeath()
      return
    }

    // Check summit
    if (this.currentLevel.checkSummit(this.player.position)) {
      this.handleSummit()
      return
    }

    // Check collectibles
    const collected = this.currentLevel.checkCollectibles(this.player.position)
    if (collected === 'oxygen') {
      this.oxygenSystem.refill(0.4)
      this.hud.flash('OXYGEN +40%')
    } else if (collected === 'warmth') {
      this.oxygenSystem.refill(0.15)
      this.hud.flash('WARMTH COLLECTED')
      this.altitudeSystem.sicknessLevel = Math.max(0, this.altitudeSystem.sicknessLevel - 0.2)
    }

    // Check checkpoints
    const cpPos = this.currentLevel.checkCheckpoint(this.player.position)
    if (cpPos) {
      const key = cpPos.join(',')
      if (!this.checkpointHit.has(key)) {
        this.checkpointHit.add(key)
        this.handleCheckpoint(cpPos)
      }
    }

    // Camera follow
    this.updateCamera(dt)

    // Snow particles
    this.snowParticles.update(dt, this.camera.position)

    // Update HUD
    this.hud.update(this.state, this.timerSystem.format(), cfg)

    // Pause check
    if (this.input.wasPressed('Escape')) {
      this.setState('paused')
    }
  }

  private updateCamera(dt: number): void {
    if (!this.player) return
    const pos = this.player.position
    const targetX = pos.x + 4
    const targetY = pos.y + 6
    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, dt * 4)
    this.camera.position.y += (targetY - this.camera.position.y) * Math.min(1, dt * 3)
    this.camera.position.z = 20
    this.camera.lookAt(pos.x, pos.y + 1, 0)

    // Move shadow camera with player
    this.sunLight.shadow.camera.position.copy(this.sunLight.position).add(
      new THREE.Vector3(pos.x, 0, 0)
    )
    this.sunLight.target.position.set(pos.x, pos.y, 0)
    this.sunLight.target.updateMatrixWorld()
  }

  private handlePlayerDeath(): void {
    if (this.state.screen !== 'playing') return

    this.state.lives -= 1
    if (this.state.lives <= 0) {
      this.setState('gameover')
      return
    }

    // Respawn
    const respawnPos: [number, number, number] = this.state.checkpointPos ?? this.currentLevel!.config.startPos
    this.player?.reset(respawnPos)
    this.oxygenSystem.reset()
    this.altitudeSystem.reset()
    this.hud.flash(`LIVES: ${this.state.lives}`)
  }

  private handleSummit(): void {
    if (this.state.screen !== 'playing') return
    this.timerSystem.stop()
    this.setState('summit')
    this.summitScreen.show(this.timerSystem.elapsed, this.state.currentLevel)
  }

  private handleCheckpoint(pos: [number, number, number]): void {
    this.state.checkpointPos = pos
    this.hud.flash('CHECKPOINT')
    this.events.emit('checkpoint', pos)
  }

  private applyEnvironment(env: EnvironmentConfig): void {
    const sky = new THREE.Color(env.skyColor)
    this.scene.background = sky
    this.scene.fog = new THREE.Fog(env.fogColor, env.fogNear, env.fogFar)
    this.ambientLight.color.setHex(env.ambientColor)
    this.ambientLight.intensity = env.ambientIntensity
    this.sunLight.color.setHex(env.sunColor)
    this.sunLight.intensity = env.sunIntensity
    this.sunLight.position.set(...env.sunPosition)
    this.weatherSystem.setEnvironment(env)
    this.oxygenSystem.setDrainRate(env.oxygenDrainRate)
    this.snowParticles.setIntensity(env.snowIntensity)
    const wind = this.weatherSystem.getWindVector()
    this.snowParticles.setWind(wind.x, wind.z)
    this.mountainBg.setColors(env.skyColor, 0xFFFFFF)
  }

  loadLevel(id: number): void {
    // Destroy previous level
    if (this.currentLevel) {
      this.currentLevel.destroy()
      this.currentLevel = null
    }
    if (this.player) {
      this.player.destroy()
      this.player = null
    }

    // Reinit physics
    this.physics.destroy()
    this.physics = new PhysicsWorld(this.RAPIER)

    // Reset state
    this.state.currentLevel = id
    this.state.lives = MAX_LIVES
    this.state.checkpointPos = null
    this.state.oxygen = 1.0
    this.state.altitudeSickness = 0
    this.checkpointHit.clear()
    this.altitudeSystem.reset()
    this.oxygenSystem.reset()
    this.timerSystem.reset()

    // Build level
    const LevelClass = getLevel(id)
    this.currentLevel = new LevelClass(this.scene, this.physics, this.RAPIER, this.events)
    this.currentLevel.build()

    const cfg = this.currentLevel.config
    this.applyEnvironment(cfg.env)

    // Create player
    this.player = new Player(
      cfg.startPos,
      this.scene,
      this.physics,
      this.RAPIER,
      this.events,
      this.input
    )

    // Position camera near start
    this.camera.position.set(cfg.startPos[0] + 4, cfg.startPos[1] + 8, 20)
  }

  startLevel(id: number): void {
    this.loadLevel(id)
    this.showStory(this.currentLevel!.config)
  }

  showStory(config: LevelConfig): void {
    this.setState('story')
    if (this.storyOverlay) {
      this.storyOverlay.remove()
      this.storyOverlay = null
    }

    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      z-index: 50;
      padding: 2rem;
    `
    overlay.innerHTML = `
      <div style="text-align:center;max-width:520px">
        <div style="color:#CC2200;font-family:monospace;font-size:12px;letter-spacing:0.4em;margin-bottom:0.5rem">
          LEVEL ${config.id} OF 5
        </div>
        <h2 style="color:#FFD700;letter-spacing:0.3em;margin-bottom:0.5rem;font-family:monospace;font-size:1.4rem">
          ${config.name.toUpperCase()}
        </h2>
        <h3 style="color:#CC2200;margin-bottom:1.5rem;font-family:monospace;font-size:0.95rem;letter-spacing:0.2em">
          ${config.mountain.toUpperCase()} — ${config.altitudeMeters.toLocaleString()}m
        </h3>
        <div style="max-width:480px;text-align:center;line-height:2;color:#ccc;font-style:italic;font-size:1rem;margin-bottom:2rem">
          ${config.story.lines.map(l => `<span>${l}</span>`).join('<br>')}
        </div>
        <div style="color:#444;font-size:12px;font-family:monospace;letter-spacing:0.15em;margin-bottom:1.5rem">
          ${config.env.blizzard ? '&#10052; BLIZZARD CONDITIONS' : ''}
          ${config.env.windForce > 0.3 ? ' | STRONG WINDS' : ''}
        </div>
        <button onclick="window.himalayaGame._dismissStory()"
          style="background:rgba(204,34,0,0.5);border:1px solid #CC2200;color:#FFD700;
          font-family:monospace;font-size:14px;padding:12px 36px;cursor:pointer;
          border-radius:4px;letter-spacing:0.25em;transition:background 0.2s">
          ${config.story.continueLabel || 'BEGIN CLIMB'}
        </button>
      </div>
    `
    document.body.appendChild(overlay)
    this.storyOverlay = overlay
  }

  _dismissStory(): void {
    if (this.storyOverlay) {
      this.storyOverlay.remove()
      this.storyOverlay = null
    }
    this.setState('playing')
    this.timerSystem.start()
    this.hud.show()
  }

  setState(screen: GameScreen): void {
    const prev = this.state.screen
    this.state.screen = screen

    // Hide all UI
    this.hud.hide()
    this.mainMenu.hide()
    this.leaderboard.hide()
    this.summitScreen.hide()
    this.pauseMenu.hide()

    switch (screen) {
      case 'menu':
        if (this.currentLevel) {
          this.currentLevel.destroy()
          this.currentLevel = null
        }
        if (this.player) {
          this.player.destroy()
          this.player = null
        }
        this.physics.destroy()
        this.physics = new PhysicsWorld(this.RAPIER)
        this.snowParticles.setIntensity(0)
        this.scene.background = new THREE.Color(0x050510)
        this.mainMenu.show()
        break

      case 'playing':
        this.hud.show()
        if (prev === 'paused') {
          // Resume timer
          this.timerSystem.start()
        }
        break

      case 'paused':
        this.timerSystem.stop()
        this.hud.show()
        this.pauseMenu.show()
        break

      case 'summit':
        // summitScreen.show() called externally with elapsed time
        break

      case 'gameover':
        this.showGameOver()
        break

      case 'leaderboard':
        // leaderboard.show() called externally with level id
        break

      case 'story':
        // storyOverlay managed separately
        break
    }
  }

  showLeaderboard(levelId: number): void {
    this.state.screen = 'leaderboard'
    this.hud.hide()
    this.mainMenu.hide()
    this.summitScreen.hide()
    this.pauseMenu.hide()
    this.leaderboard.show(levelId)
  }

  private showGameOver(): void {
    const overlay = document.getElementById('ui')!
    const div = document.createElement('div')
    div.id = 'gameover-screen'
    div.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.88);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 45;
    `
    div.innerHTML = `
      <div style="text-align:center">
        <div style="color:#CC2200;font-family:monospace;font-size:2.5rem;letter-spacing:0.4em;margin-bottom:1rem">
          GAME OVER
        </div>
        <div style="color:#888;font-family:monospace;font-size:14px;letter-spacing:0.2em;margin-bottom:2rem">
          THE MOUNTAIN WINS THIS TIME
        </div>
        <button onclick="window.himalayaGame.startLevel(window.himalayaGame.state.currentLevel)"
          style="background:rgba(204,34,0,0.4);border:1px solid #CC2200;color:#FFD700;
          font-family:monospace;font-size:14px;padding:12px 36px;cursor:pointer;
          border-radius:4px;letter-spacing:0.2em;margin:6px;display:block;min-width:200px">
          TRY AGAIN
        </button>
        <button onclick="window.himalayaGame.setState('menu')"
          style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);
          color:#aaa;font-family:monospace;font-size:13px;padding:10px 28px;cursor:pointer;
          border-radius:4px;letter-spacing:0.15em;margin:6px;display:block;min-width:200px">
          MAIN MENU
        </button>
        <button onclick="this.parentElement.parentElement.remove();window.himalayaGame.showLeaderboard(window.himalayaGame.state.currentLevel)"
          style="background:transparent;border:none;color:#555;font-family:monospace;font-size:12px;
          padding:8px;cursor:pointer;letter-spacing:0.1em;margin-top:6px;display:block">
          VIEW LEADERBOARD
        </button>
      </div>
    `
    // Remove any previous gameover screen
    document.getElementById('gameover-screen')?.remove()
    overlay.appendChild(div)
  }

  private updateAltitudeSicknessVisuals(level: number): void {
    const altOverlay = document.getElementById('altitude-overlay')
    const blur = document.getElementById('screen-blur')
    if (altOverlay) {
      const alpha = level * 0.25
      altOverlay.style.background = `rgba(80,120,220,${alpha})`
    }
    if (blur) {
      const blurPx = level * 2.5
      blur.style.backdropFilter = `blur(${blurPx}px)`
    }
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId)
    window.removeEventListener('resize', this.onResize)
    this.input.destroy()
    this.currentLevel?.destroy()
    this.player?.destroy()
    this.snowParticles.destroy()
    this.mountainBg.destroy()
    this.renderer.dispose()
    this.events.clear()
  }
}
