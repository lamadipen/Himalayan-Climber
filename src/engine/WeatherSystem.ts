import Phaser from 'phaser'
import type { Player } from '../entities/Player'
import { getDailyWeatherSeed } from '../firebase/api'
import { BLIZZARD_WIND_FORCE, STORM_WAIT_TIME } from '../config/balance'

export type WeatherState = 'clear' | 'cloud' | 'blizzard' | 'storm'

// mulberry32 — fast deterministic PRNG, seeded from Firestore daily seed
function mulberry32(initialSeed: number): () => number {
  let seed = initialSeed
  return (): number => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

const STATES:  WeatherState[] = ['clear', 'cloud', 'blizzard', 'storm']
const WEIGHTS: number[]       = [0.40,    0.30,    0.20,       0.10  ]
const SCHEDULE_COUNT = 100
const TRANSITION_MIN = 45_000   // ms
const TRANSITION_MAX = 90_000   // ms

function weightedPick(rng: () => number): WeatherState {
  const roll = rng()
  let acc = 0
  for (let i = 0; i < STATES.length; i++) {
    acc += WEIGHTS[i]
    if (roll < acc) return STATES[i]
  }
  return 'clear'
}

interface ScheduleEntry {
  at:    number        // ms from session start when this state activates
  state: WeatherState
}

export class WeatherSystem {
  private readonly scene:  Phaser.Scene
  private readonly player: Player

  private state       : WeatherState    = 'clear'
  private schedule    : ScheduleEntry[] = []
  private nextIdx     = 0
  private elapsed     = 0       // ms since init()
  private windDir     = 1       // +1 = rightward push, -1 = leftward
  private stormActive = false

  // update() must be called AFTER player.update() in GameScene so blizzard
  // wind is added on top of the velocity set by the player's movement handler.
  constructor(scene: Phaser.Scene, player: Player) {
    this.scene  = scene
    this.player = player
  }

  // Call once in GameScene.create(), after awaiting Firebase.
  // Falls back to a Date.now() seed if Firestore is unavailable.
  async init(): Promise<void> {
    let seed: number
    try {
      const ws = await getDailyWeatherSeed()
      seed = ws.seed
    } catch {
      seed = Date.now()
    }

    const rng    = mulberry32(seed)
    this.windDir = rng() < 0.5 ? -1 : 1

    // Pre-generate full session transition schedule from seed so weather is
    // reproducible: two players on the same day see the same weather pattern.
    let cursor = 0
    for (let i = 0; i < SCHEDULE_COUNT; i++) {
      cursor += TRANSITION_MIN + rng() * (TRANSITION_MAX - TRANSITION_MIN)
      this.schedule.push({ at: cursor, state: weightedPick(rng) })
    }

    this.scene.events.emit('weather-changed', this.state)
  }

  getCurrentWeather(): WeatherState { return this.state }

  // Call from GameScene.update() each frame, AFTER player.update().
  update(delta: number): void {
    this.elapsed += delta

    while (
      this.nextIdx < this.schedule.length &&
      this.elapsed >= this.schedule[this.nextIdx].at
    ) {
      this.transition(this.schedule[this.nextIdx].state)
      this.nextIdx++
    }

    // Blizzard wind — nudge player velocity X each frame.
    // Must run after player.update() so the addition is not overwritten by
    // the movement handler's setVelocityX(). The player body's maxVelocityX
    // caps the total so wind cannot exceed twice base speed.
    if (this.state === 'blizzard') {
      const body = this.player.body as Phaser.Physics.Arcade.Body
      body.setVelocityX(body.velocity.x + this.windDir * BLIZZARD_WIND_FORCE * (delta / 1000))
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private transition(next: WeatherState): void {
    if (next === this.state) return

    const prev = this.state
    this.state = next
    this.scene.events.emit('weather-changed', next)

    // If the schedule moves us out of storm before the timer fires, end it
    // immediately so the scene unfreezes the player without waiting 15s.
    if (prev === 'storm' && this.stormActive) {
      this.stormActive = false
      this.scene.events.emit('weather-storm-end')
    }

    if (next === 'storm' && !this.stormActive) {
      this.startStorm()
    }
  }

  private startStorm(): void {
    this.stormActive = true
    this.scene.events.emit('weather-storm-start')

    this.scene.time.delayedCall(STORM_WAIT_TIME, () => {
      // Guard: if a schedule transition already ended the storm early,
      // stormActive is already false and the end event was already fired.
      if (!this.stormActive) return
      this.stormActive = false
      this.scene.events.emit('weather-storm-end')
    })
  }
}
