// tests/unit/KarmaSystem.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('phaser')
vi.mock('../../src/firebase/api')

import { KarmaSystem } from '../../src/engine/KarmaSystem'
import {
  KARMA_HELP_CLIMBER,
  KARMA_PRAYER_FLAG,
  KARMA_YETI_FOOTPRINT,
  KARMA_ABANDON_NPC,
  KARMA_SKIP_SHRINE,
  KARMA_SUMMIT_ALL_SAFE,
  KARMA_GOOD_ENDING,
  KARMA_TRUE_ENDING,
} from '../../src/config/balance'
import type Phaser from 'phaser'

// ─── Helpers ─────────────────────────────────────────────────────────────────

type EmittedEvent = [string, ...unknown[]]

// Full context-aware event emitter — KarmaSystem binds listeners with (fn, ctx)
// pairs that must be matched exactly in off() to unregister correctly.
class MockEvents {
  private readonly handlers: Array<{ event: string; fn: Function; ctx: unknown }> = []
  readonly emitted: EmittedEvent[] = []

  on(event: string, fn: Function, ctx?: unknown): void {
    this.handlers.push({ event, fn, ctx })
  }

  off(event: string, fn: Function, ctx?: unknown): void {
    const i = this.handlers.findIndex(
      h => h.event === event && h.fn === fn && h.ctx === ctx,
    )
    if (i >= 0) this.handlers.splice(i, 1)
  }

  emit(event: string, ...args: unknown[]): void {
    this.emitted.push([event, ...args])
    this.handlers
      .filter(h => h.event === event)
      .forEach(h => (h.fn as Function).call(h.ctx, ...args))
  }
}

const makeScene = () => {
  const events = new MockEvents()
  return {
    events,
    _events: events,
  } as unknown as Phaser.Scene & { _events: MockEvents }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('KarmaSystem', () => {
  let scene: ReturnType<typeof makeScene>
  let sys:   KarmaSystem

  beforeEach(() => {
    scene = makeScene()
    sys   = KarmaSystem.create(scene as unknown as Phaser.Scene)
  })

  // ── Event amounts ─────────────────────────────────────────────────────────

  describe('event karma amounts', () => {
    it(`karma-help-climber awards ${KARMA_HELP_CLIMBER}`, () => {
      scene.events.emit('karma-help-climber')
      expect(sys.getKarma()).toBe(KARMA_HELP_CLIMBER)
    })

    it(`karma-prayer-flag awards ${KARMA_PRAYER_FLAG}`, () => {
      scene.events.emit('karma-prayer-flag')
      expect(sys.getKarma()).toBe(KARMA_PRAYER_FLAG)
    })

    it(`karma-yeti-footprint awards ${KARMA_YETI_FOOTPRINT}`, () => {
      scene.events.emit('karma-yeti-footprint')
      expect(sys.getKarma()).toBe(KARMA_YETI_FOOTPRINT)
    })

    it(`karma-abandon-npc deducts ${Math.abs(KARMA_ABANDON_NPC)} from current karma`, () => {
      // Start with enough karma so the deduction doesn't hit the floor
      scene.events.emit('karma-help-climber') // +15
      scene.events.emit('karma-help-climber') // +15 → total 30
      scene.events.emit('karma-abandon-npc')  // -20 → total 10
      expect(sys.getKarma()).toBe(30 + KARMA_ABANDON_NPC)
    })

    it(`karma-skip-shrine deducts ${Math.abs(KARMA_SKIP_SHRINE)} from current karma`, () => {
      scene.events.emit('karma-prayer-flag')  // +5
      scene.events.emit('karma-prayer-flag')  // +5 → total 10
      scene.events.emit('karma-skip-shrine')  // -5 → total 5
      expect(sys.getKarma()).toBe(10 + KARMA_SKIP_SHRINE)
    })

    it('multiple events accumulate correctly', () => {
      scene.events.emit('karma-help-climber')   // +15
      scene.events.emit('karma-prayer-flag')    // +5  → 20
      scene.events.emit('karma-yeti-footprint') // +3  → 23
      expect(sys.getKarma()).toBe(
        KARMA_HELP_CLIMBER + KARMA_PRAYER_FLAG + KARMA_YETI_FOOTPRINT,
      )
    })
  })

  // ── Karma floor ───────────────────────────────────────────────────────────

  describe('karma floor', () => {
    it('never drops below 0 (deduction at 0 karma)', () => {
      // karma starts at 0; abandon NPC (-20) would give -20 without clamp
      scene.events.emit('karma-abandon-npc')
      expect(sys.getKarma()).toBe(0)
    })

    it('never drops below 0 even with repeated deductions', () => {
      scene.events.emit('karma-skip-shrine')
      scene.events.emit('karma-abandon-npc')
      scene.events.emit('karma-abandon-npc')
      expect(sys.getKarma()).toBe(0)
    })
  })

  // ── Summit multiplier ─────────────────────────────────────────────────────

  describe('karma-summit multiplier', () => {
    it(`doubles karma (×${KARMA_SUMMIT_ALL_SAFE}) when allNpcsSaved=true`, () => {
      scene.events.emit('karma-help-climber') // +15
      scene.events.emit('karma-help-climber') // +15 → total 30
      sys.setAllNpcsSaved(true)
      scene.events.emit('karma-summit')
      expect(sys.getKarma()).toBe(30 * KARMA_SUMMIT_ALL_SAFE)
    })

    it('has no effect when allNpcsSaved=false', () => {
      scene.events.emit('karma-help-climber') // +15
      sys.setAllNpcsSaved(false)
      scene.events.emit('karma-summit')
      expect(sys.getKarma()).toBe(KARMA_HELP_CLIMBER)
    })

    it('has no effect when allNpcsSaved was never set (default false)', () => {
      scene.events.emit('karma-help-climber') // +15
      scene.events.emit('karma-summit')
      expect(sys.getKarma()).toBe(KARMA_HELP_CLIMBER)
    })
  })

  // ── getEndingTier() ───────────────────────────────────────────────────────

  describe('getEndingTier() boundaries', () => {
    it(`returns 'default' at ${KARMA_GOOD_ENDING - 1} karma (below good threshold)`, () => {
      ;(sys as any).karma = KARMA_GOOD_ENDING - 1  // 50
      expect(sys.getEndingTier()).toBe('default')
    })

    it(`returns 'good' at exactly ${KARMA_GOOD_ENDING} karma`, () => {
      ;(sys as any).karma = KARMA_GOOD_ENDING  // 51
      expect(sys.getEndingTier()).toBe('good')
    })

    it(`returns 'good' between ${KARMA_GOOD_ENDING} and ${KARMA_TRUE_ENDING - 1}`, () => {
      ;(sys as any).karma = KARMA_TRUE_ENDING - 1  // 150
      expect(sys.getEndingTier()).toBe('good')
    })

    it(`returns 'true' at exactly ${KARMA_TRUE_ENDING} karma`, () => {
      ;(sys as any).karma = KARMA_TRUE_ENDING  // 151
      expect(sys.getEndingTier()).toBe('true')
    })

    it(`returns 'true' above ${KARMA_TRUE_ENDING}`, () => {
      ;(sys as any).karma = KARMA_TRUE_ENDING + 100
      expect(sys.getEndingTier()).toBe('true')
    })

    it("returns 'default' at 0 (fresh game)", () => {
      expect(sys.getEndingTier()).toBe('default')
    })
  })

  // ── karma-changed event ───────────────────────────────────────────────────

  describe('karma-changed event', () => {
    it('fires with new karma value on each positive event', () => {
      scene.events.emit('karma-help-climber')
      const events = scene._events.emitted.filter(([e]) => e === 'karma-changed')
      expect(events).toHaveLength(1)
      expect(events[0][1]).toBe(KARMA_HELP_CLIMBER)
    })

    it('fires after every individual event (three events → three emissions)', () => {
      scene.events.emit('karma-help-climber')
      scene.events.emit('karma-prayer-flag')
      scene.events.emit('karma-skip-shrine')
      const events = scene._events.emitted.filter(([e]) => e === 'karma-changed')
      expect(events).toHaveLength(3)
    })

    it('fires with current karma value after summit multiplier', () => {
      ;(sys as any).karma = 50
      sys.setAllNpcsSaved(true)
      scene.events.emit('karma-summit')
      const events = scene._events.emitted.filter(([e]) => e === 'karma-changed')
      expect(events).toHaveLength(1)
      expect(events[0][1]).toBe(50 * KARMA_SUMMIT_ALL_SAFE)
    })

    it('does not fire when summit is skipped (allNpcsSaved=false)', () => {
      ;(sys as any).karma = 50
      sys.setAllNpcsSaved(false)
      scene.events.emit('karma-summit')
      const events = scene._events.emitted.filter(([e]) => e === 'karma-changed')
      expect(events).toHaveLength(0)
    })
  })

  // ── reset() ───────────────────────────────────────────────────────────────

  describe('reset()', () => {
    it('sets karma back to 0', () => {
      scene.events.emit('karma-help-climber') // +15
      sys.reset()
      expect(sys.getKarma()).toBe(0)
    })

    it('emits karma-changed with 0 on reset', () => {
      scene.events.emit('karma-help-climber') // +15
      // clear emitted log before reset so we isolate reset's event
      scene._events.emitted.length = 0
      sys.reset()
      const events = scene._events.emitted.filter(([e]) => e === 'karma-changed')
      expect(events).toHaveLength(1)
      expect(events[0][1]).toBe(0)
    })

    it('clears allNpcsSaved flag', () => {
      sys.setAllNpcsSaved(true)
      sys.reset()
      // After reset, summit multiplier should have no effect (allNpcsSaved=false)
      ;(sys as any).karma = 30
      scene.events.emit('karma-summit')
      expect(sys.getKarma()).toBe(30)
    })
  })
})
