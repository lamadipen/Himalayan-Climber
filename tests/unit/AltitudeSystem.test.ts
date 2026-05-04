// tests/unit/AltitudeSystem.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('phaser')
vi.mock('../../src/firebase/api')

import { AltitudeSystem } from '../../src/engine/AltitudeSystem'
import {
  OXYGEN_DRAIN_HIGH,
  OXYGEN_DRAIN_VERY_HIGH,
  OXYGEN_DRAIN_DEATH_ZONE,
  OXYGEN_LOW_THRESHOLD,
  HP_DRAIN_NO_OXYGEN,
  SPEED_MULT_HIGH,
  SPEED_MULT_VERY_HIGH,
  SPEED_MULT_DEATH_ZONE,
  INPUT_DELAY_DEATH_ZONE,
} from '../../src/config/balance'
import type Phaser from 'phaser'
import type { Player } from '../../src/entities/Player'

// ─── Helpers ─────────────────────────────────────────────────────────────────

type EmittedEvent = [string, ...unknown[]]

const makeScene = () => {
  const emitted: EmittedEvent[] = []
  return {
    events: {
      on:   vi.fn(),
      off:  vi.fn(),
      once: vi.fn(),
      emit: (e: string, ...a: unknown[]) => { emitted.push([e, ...a]) },
    },
    _emitted: emitted,
  } as unknown as Phaser.Scene & { _emitted: EmittedEvent[] }
}

const makePlayer = () => ({
  oxygen:          100,
  speedMultiplier: 1.0,
  inputDelayMs:    0,
})

// Level 5 — Kanchenjunga: { yMin:0, yMax:5000, altMin:8586, altMax:5000 }
// alt(y) = 8586 − 3586·(y/5000)
//
// Zone thresholds (y values that fall in each zone):
//   deathZone (alt ≥ 8500) : y = 50   → alt ≈ 8550
//   veryHigh  (alt ≥ 7500) : y = 800  → alt ≈ 8012
//   high      (alt ≥ 6000) : y = 2500 → alt ≈ 6793
//   foothills (alt < 6000) : y = 4500 → alt ≈ 5359
const LEVEL = 5
const Y = { deathZone: 50, veryHigh: 800, high: 2500, foothills: 4500 }

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AltitudeSystem', () => {
  let scene:  ReturnType<typeof makeScene>
  let player: ReturnType<typeof makePlayer>
  let sys:    AltitudeSystem

  beforeEach(() => {
    scene  = makeScene()
    player = makePlayer()
    sys    = new AltitudeSystem(
      scene as unknown as Phaser.Scene,
      LEVEL,
      player as unknown as Player,
    )
  })

  // ── Oxygen drain rates ────────────────────────────────────────────────────

  describe('oxygen drain per altitude zone', () => {
    it('no drain in foothills (alt < 6000m)', () => {
      sys.update(Y.foothills, 1000)
      expect(player.oxygen).toBeCloseTo(100, 5)
    })

    it(`drains at ${OXYGEN_DRAIN_HIGH}/s in high zone (6000–7500m)`, () => {
      sys.update(Y.high, 1000)
      expect(player.oxygen).toBeCloseTo(100 - OXYGEN_DRAIN_HIGH, 5)
    })

    it(`drains at ${OXYGEN_DRAIN_VERY_HIGH}/s in veryHigh zone (7500–8500m)`, () => {
      sys.update(Y.veryHigh, 1000)
      expect(player.oxygen).toBeCloseTo(100 - OXYGEN_DRAIN_VERY_HIGH, 5)
    })

    it(`drains at ${OXYGEN_DRAIN_DEATH_ZONE}/s in deathZone (≥8500m)`, () => {
      sys.update(Y.deathZone, 1000)
      expect(player.oxygen).toBeCloseTo(100 - OXYGEN_DRAIN_DEATH_ZONE, 5)
    })

    it('drain is proportional to delta (half second = half drain)', () => {
      sys.update(Y.high, 500)
      expect(player.oxygen).toBeCloseTo(100 - OXYGEN_DRAIN_HIGH / 2, 5)
    })

    it('oxygen never drops below 0', () => {
      ;(sys as any).oxygen = 1
      sys.update(Y.deathZone, 10_000) // drain 50 in 10s — far past zero
      expect(player.oxygen).toBe(0)
    })
  })

  // ── Speed multipliers ─────────────────────────────────────────────────────

  describe('speed multiplier per altitude zone', () => {
    it('1.0x in foothills', () => {
      sys.update(Y.foothills, 0)
      expect(player.speedMultiplier).toBe(1.0)
    })

    it(`${SPEED_MULT_HIGH}x in high zone`, () => {
      sys.update(Y.high, 0)
      expect(player.speedMultiplier).toBe(SPEED_MULT_HIGH)
    })

    it(`${SPEED_MULT_VERY_HIGH}x in veryHigh zone`, () => {
      sys.update(Y.veryHigh, 0)
      expect(player.speedMultiplier).toBe(SPEED_MULT_VERY_HIGH)
    })

    it(`${SPEED_MULT_DEATH_ZONE}x in deathZone`, () => {
      sys.update(Y.deathZone, 0)
      expect(player.speedMultiplier).toBe(SPEED_MULT_DEATH_ZONE)
    })
  })

  // ── Input delay ───────────────────────────────────────────────────────────

  describe('input delay', () => {
    it('no input delay below deathZone', () => {
      sys.update(Y.high, 0)
      expect(player.inputDelayMs).toBe(0)
    })

    it(`${INPUT_DELAY_DEATH_ZONE}ms input delay in deathZone`, () => {
      sys.update(Y.deathZone, 0)
      expect(player.inputDelayMs).toBe(INPUT_DELAY_DEATH_ZONE)
    })
  })

  // ── HP drain at 0% oxygen ─────────────────────────────────────────────────

  describe('HP drain event at 0% oxygen', () => {
    it('emits altitude-hp-drain when oxygen reaches 0', () => {
      ;(sys as any).oxygen = 0
      sys.update(Y.deathZone, 1000)
      const event = scene._emitted.find(([e]) => e === 'altitude-hp-drain')
      expect(event).toBeDefined()
      expect(event![1]).toBeCloseTo(HP_DRAIN_NO_OXYGEN * 1, 5)
    })

    it('drain amount scales with delta', () => {
      ;(sys as any).oxygen = 0
      sys.update(Y.deathZone, 500)
      const event = scene._emitted.find(([e]) => e === 'altitude-hp-drain')
      expect(event![1]).toBeCloseTo(HP_DRAIN_NO_OXYGEN * 0.5, 5)
    })

    it('does not emit altitude-hp-drain when oxygen > 0', () => {
      sys.update(Y.foothills, 1000)
      const event = scene._emitted.find(([e]) => e === 'altitude-hp-drain')
      expect(event).toBeUndefined()
    })
  })

  // ── restoreOxygen ─────────────────────────────────────────────────────────

  describe('restoreOxygen()', () => {
    it('adds the given amount', () => {
      ;(sys as any).oxygen = 50
      sys.restoreOxygen(35)
      expect(sys.getOxygen()).toBe(85)
    })

    it('caps at 100 when restore would exceed maximum', () => {
      ;(sys as any).oxygen = 70
      sys.restoreOxygen(35) // 70+35=105 → clamp to 100
      expect(sys.getOxygen()).toBe(100)
    })

    it('restoreOxygenFull() always sets to 100', () => {
      ;(sys as any).oxygen = 12
      sys.restoreOxygenFull()
      expect(sys.getOxygen()).toBe(100)
    })

    it('restoreOxygenFull() resets oxygen-low edge trigger', () => {
      ;(sys as any).oxygen      = 10
      ;(sys as any).wasOxygenLow = true
      sys.restoreOxygenFull()
      // After restore, next descent below threshold should fire oxygen-low again
      ;(sys as any).oxygen = 24
      sys.update(Y.foothills, 0) // no drain, but check fires
      const event = scene._emitted.find(([e]) => e === 'oxygen-low')
      expect(event).toBeDefined()
    })
  })

  // ── Altitude zone getters ─────────────────────────────────────────────────

  describe('getCurrentZone() and getCurrentAltitude()', () => {
    it('returns deathZone near the summit (y=50)', () => {
      sys.update(Y.deathZone, 0)
      expect(sys.getCurrentZone()).toBe('deathZone')
    })

    it('returns veryHigh in the upper section (y=800)', () => {
      sys.update(Y.veryHigh, 0)
      expect(sys.getCurrentZone()).toBe('veryHigh')
    })

    it('returns high in the mid section (y=2500)', () => {
      sys.update(Y.high, 0)
      expect(sys.getCurrentZone()).toBe('high')
    })

    it('returns foothills near the base (y=4500)', () => {
      sys.update(Y.foothills, 0)
      expect(sys.getCurrentZone()).toBe('foothills')
    })

    it('getCurrentAltitude() returns a rounded integer', () => {
      sys.update(Y.high, 0)
      const alt = sys.getCurrentAltitude()
      expect(Number.isInteger(alt)).toBe(true)
    })

    it('altitude increases as Y decreases (climbing up)', () => {
      sys.update(Y.foothills, 0)
      const lowAlt = sys.getCurrentAltitude()
      sys.update(Y.deathZone, 0)
      const highAlt = sys.getCurrentAltitude()
      expect(highAlt).toBeGreaterThan(lowAlt)
    })
  })

  // ── oxygen-low edge-trigger event ─────────────────────────────────────────

  describe('oxygen-low event (edge-triggered)', () => {
    it('fires once when crossing below the 25% threshold', () => {
      // 26% oxygen, deathZone drains 5/s → after 1s = 21% (below 25%)
      ;(sys as any).oxygen = 26
      sys.update(Y.deathZone, 1000)
      const events = scene._emitted.filter(([e]) => e === 'oxygen-low')
      expect(events).toHaveLength(1)
    })

    it('does not re-fire while already below threshold', () => {
      ;(sys as any).oxygen       = 20
      ;(sys as any).wasOxygenLow = true
      sys.update(Y.deathZone, 1000) // stays below
      const events = scene._emitted.filter(([e]) => e === 'oxygen-low')
      expect(events).toHaveLength(0)
    })

    it(`threshold is ${OXYGEN_LOW_THRESHOLD}%`, () => {
      // At exactly the threshold, is not yet "low"
      ;(sys as any).oxygen = OXYGEN_LOW_THRESHOLD
      sys.update(Y.foothills, 0) // no drain
      const events = scene._emitted.filter(([e]) => e === 'oxygen-low')
      expect(events).toHaveLength(0)
    })
  })
})
