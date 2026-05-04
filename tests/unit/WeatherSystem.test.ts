// tests/unit/WeatherSystem.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('phaser')
vi.mock('../../src/firebase/api')

import { WeatherSystem } from '../../src/engine/WeatherSystem'
import { getDailyWeatherSeed } from '../../src/firebase/api'
import { BLIZZARD_WIND_FORCE } from '../../src/config/balance'
import type Phaser from 'phaser'
import type { Player } from '../../src/entities/Player'

// ─── Helpers ─────────────────────────────────────────────────────────────────

type EmittedEvent = [string, ...unknown[]]

const makeScene = () => {
  const emitted: EmittedEvent[] = []
  return {
    events: {
      emit: (e: string, ...a: unknown[]) => { emitted.push([e, ...a]) },
      on:   vi.fn(),
      off:  vi.fn(),
    },
    time: {
      delayedCall: vi.fn(),
    },
    _emitted: emitted,
  } as unknown as Phaser.Scene & { _emitted: EmittedEvent[] }
}

const makePlayer = () => {
  const body = {
    velocity: { x: 0 },
    setVelocityX: vi.fn((v: number) => { body.velocity.x = v }),
  }
  return { body } as unknown as Player
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WeatherSystem', () => {
  let scene:  ReturnType<typeof makeScene>
  let player: ReturnType<typeof makePlayer>
  let sys:    WeatherSystem

  beforeEach(() => {
    scene  = makeScene()
    player = makePlayer()
    sys    = new WeatherSystem(
      scene  as unknown as Phaser.Scene,
      player as unknown as Player,
    )
  })

  // ── init() — deterministic schedule generation ────────────────────────────

  describe('init() — deterministic schedule generation', () => {
    it('same seed produces an identical weather schedule', async () => {
      const scene2  = makeScene()
      const player2 = makePlayer()
      const sys2    = new WeatherSystem(
        scene2  as unknown as Phaser.Scene,
        player2 as unknown as Player,
      )
      await sys.init()
      await sys2.init()
      expect((sys as any).schedule).toEqual((sys2 as any).schedule)
    })

    it('different seeds produce different schedules', async () => {
      // Queue an alternate seed for the first init() call only
      vi.mocked(getDailyWeatherSeed).mockResolvedValueOnce({
        seed: 99999,
        date: '2026-01-01',
      })
      const scene2  = makeScene()
      const player2 = makePlayer()
      const sys2    = new WeatherSystem(
        scene2  as unknown as Phaser.Scene,
        player2 as unknown as Player,
      )
      await sys.init()   // consumes mockResolvedValueOnce → seed 99999
      await sys2.init()  // falls back to default mockResolvedValue → seed 12345
      expect((sys as any).schedule).not.toEqual((sys2 as any).schedule)
    })

    it('schedule has the expected number of entries', async () => {
      await sys.init()
      expect((sys as any).schedule).toHaveLength(100)
    })

    it('schedule entries have ascending "at" values', async () => {
      await sys.init()
      const schedule: Array<{ at: number; state: string }> = (sys as any).schedule
      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i].at).toBeGreaterThan(schedule[i - 1].at)
      }
    })

    it('emits weather-changed with initial state on init', async () => {
      await sys.init()
      const events = scene._emitted.filter(([e]) => e === 'weather-changed')
      expect(events).toHaveLength(1)
      expect(events[0][1]).toBe('clear')
    })

    it('initial state is clear before init', () => {
      expect(sys.getCurrentWeather()).toBe('clear')
    })
  })

  // ── update() — schedule transitions ──────────────────────────────────────

  describe('update() — schedule transitions', () => {
    it('transitions to the scheduled state when elapsed reaches entry time', () => {
      ;(sys as any).schedule = [{ at: 1000, state: 'cloud' }]
      ;(sys as any).nextIdx  = 0
      sys.update(1000)
      expect(sys.getCurrentWeather()).toBe('cloud')
    })

    it('does not transition when elapsed has not yet reached entry time', () => {
      ;(sys as any).schedule = [{ at: 1000, state: 'cloud' }]
      ;(sys as any).nextIdx  = 0
      sys.update(500)
      expect(sys.getCurrentWeather()).toBe('clear')
    })

    it('processes multiple schedule entries in a single update', () => {
      ;(sys as any).schedule = [
        { at:  500, state: 'cloud'    },
        { at: 1000, state: 'blizzard' },
      ]
      ;(sys as any).nextIdx = 0
      sys.update(1500)
      expect(sys.getCurrentWeather()).toBe('blizzard')
    })

    it('emits weather-changed when transitioning to a new state', () => {
      ;(sys as any).schedule = [{ at: 0, state: 'cloud' }]
      ;(sys as any).nextIdx  = 0
      sys.update(0)
      const event = scene._emitted.find(([e]) => e === 'weather-changed')
      expect(event).toBeDefined()
      expect(event![1]).toBe('cloud')
    })

    it('does not emit weather-changed if state does not change', () => {
      // Schedule entry pointing to the same state — transition() is a no-op
      ;(sys as any).schedule = [{ at: 0, state: 'clear' }]
      ;(sys as any).nextIdx  = 0
      sys.update(0)
      const events = scene._emitted.filter(([e]) => e === 'weather-changed')
      expect(events).toHaveLength(0)
    })

    it('accumulated elapsed advances across multiple update calls', () => {
      ;(sys as any).schedule = [{ at: 1000, state: 'cloud' }]
      ;(sys as any).nextIdx  = 0
      sys.update(400)
      sys.update(400)
      expect(sys.getCurrentWeather()).toBe('clear') // 800ms < 1000ms
      sys.update(200)
      expect(sys.getCurrentWeather()).toBe('cloud') // 1000ms reached
    })
  })

  // ── Blizzard wind force ───────────────────────────────────────────────────

  describe('blizzard wind force', () => {
    it('applies BLIZZARD_WIND_FORCE to player X velocity during blizzard', () => {
      ;(sys as any).state   = 'blizzard'
      ;(sys as any).windDir = 1
      sys.update(1000) // 1 second
      const expected = 0 + 1 * BLIZZARD_WIND_FORCE * (1000 / 1000)
      expect((player as any).body.setVelocityX).toHaveBeenCalledWith(expected)
    })

    it('wind force is proportional to delta (half second = half force)', () => {
      ;(sys as any).state   = 'blizzard'
      ;(sys as any).windDir = 1
      sys.update(500)
      const expected = 0 + 1 * BLIZZARD_WIND_FORCE * (500 / 1000)
      expect((player as any).body.setVelocityX).toHaveBeenCalledWith(expected)
    })

    it('negative windDir pushes player leftward', () => {
      ;(sys as any).state   = 'blizzard'
      ;(sys as any).windDir = -1
      sys.update(1000)
      const expected = 0 + (-1) * BLIZZARD_WIND_FORCE * 1
      expect((player as any).body.setVelocityX).toHaveBeenCalledWith(expected)
    })

    it('wind adds on top of existing velocity.x', () => {
      ;(sys as any).state          = 'blizzard'
      ;(sys as any).windDir        = 1
      ;(player as any).body.velocity.x = 80  // player already moving right
      sys.update(1000)
      const expected = 80 + 1 * BLIZZARD_WIND_FORCE * 1
      expect((player as any).body.setVelocityX).toHaveBeenCalledWith(expected)
    })

    it('does not call setVelocityX in clear weather', () => {
      ;(sys as any).state = 'clear'
      sys.update(1000)
      expect((player as any).body.setVelocityX).not.toHaveBeenCalled()
    })

    it('does not call setVelocityX in cloud weather', () => {
      ;(sys as any).state = 'cloud'
      sys.update(1000)
      expect((player as any).body.setVelocityX).not.toHaveBeenCalled()
    })

    it('does not call setVelocityX in storm weather', () => {
      // Storm freezes the player via a separate mechanism — no wind nudge
      ;(sys as any).state = 'storm'
      sys.update(1000)
      expect((player as any).body.setVelocityX).not.toHaveBeenCalled()
    })
  })

  // ── Storm events ──────────────────────────────────────────────────────────

  describe('storm lifecycle events', () => {
    it('emits weather-storm-start when entering storm state', () => {
      ;(sys as any).schedule = [{ at: 0, state: 'storm' }]
      ;(sys as any).nextIdx  = 0
      sys.update(0)
      const event = scene._emitted.find(([e]) => e === 'weather-storm-start')
      expect(event).toBeDefined()
    })

    it('schedules a delayedCall to end the storm', () => {
      ;(sys as any).schedule = [{ at: 0, state: 'storm' }]
      ;(sys as any).nextIdx  = 0
      sys.update(0)
      expect((scene as any).time.delayedCall).toHaveBeenCalledOnce()
    })
  })
})
