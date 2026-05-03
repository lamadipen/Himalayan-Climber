import Phaser from 'phaser'
import {
  KARMA_HELP_CLIMBER,
  KARMA_PRAYER_FLAG,
  KARMA_YETI_FOOTPRINT,
  KARMA_ABANDON_NPC,
  KARMA_SKIP_SHRINE,
  KARMA_SUMMIT_ALL_SAFE,
  KARMA_GOOD_ENDING,
  KARMA_TRUE_ENDING,
} from '../config/balance'

export type EndingTier = 'default' | 'good' | 'true'

export class KarmaSystem {
  // ─── Singleton ────────────────────────────────────────────────────────────
  // One instance per active game session. GameScene calls KarmaSystem.create()
  // in its create() method. Parallel scenes (HUD, etc.) call getInstance().
  private static instance: KarmaSystem | null = null

  private scene:       Phaser.Scene
  private karma        = 0
  private allNpcsSaved = false

  private constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.bindEvents()
  }

  // Creates (or replaces) the singleton for a new scene.
  // Unbinding the old instance's listeners before replacing prevents
  // the previous scene's emitter from accumulating stale handlers.
  static create(scene: Phaser.Scene): KarmaSystem {
    KarmaSystem.instance?.unbindEvents()
    KarmaSystem.instance = new KarmaSystem(scene)
    return KarmaSystem.instance
  }

  // Returns null if called before GameScene has initialised the system.
  static getInstance(): KarmaSystem | null {
    return KarmaSystem.instance
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  getKarma(): number { return this.karma }

  getEndingTier(): EndingTier {
    if (this.karma >= KARMA_TRUE_ENDING) return 'true'
    if (this.karma >= KARMA_GOOD_ENDING) return 'good'
    return 'default'
  }

  // Called by CheckpointSystem / GameScene when all NPCs in a level are safe.
  // Must be set before 'karma-summit' fires or the multiplier won't apply.
  setAllNpcsSaved(value: boolean): void {
    this.allNpcsSaved = value
  }

  // Resets for a new game run. Keeps listeners active on the same scene.
  reset(): void {
    this.karma        = 0
    this.allNpcsSaved = false
    this.scene.events.emit('karma-changed', this.karma)
  }

  // ─── Event subscription ───────────────────────────────────────────────────

  private bindEvents(): void {
    const e = this.scene.events
    e.on('karma-help-climber',   this.onHelpClimber,   this)
    e.on('karma-prayer-flag',    this.onPrayerFlag,     this)
    e.on('karma-yeti-footprint', this.onYetiFootprint,  this)
    e.on('karma-abandon-npc',    this.onAbandonNpc,     this)
    e.on('karma-skip-shrine',    this.onSkipShrine,     this)
    e.on('karma-summit',         this.onSummit,         this)
  }

  // Passing the same [fn, context] pair to off() removes the exact listener
  // registered in bindEvents() without touching any other listeners.
  private unbindEvents(): void {
    const e = this.scene.events
    e.off('karma-help-climber',   this.onHelpClimber,   this)
    e.off('karma-prayer-flag',    this.onPrayerFlag,     this)
    e.off('karma-yeti-footprint', this.onYetiFootprint,  this)
    e.off('karma-abandon-npc',    this.onAbandonNpc,     this)
    e.off('karma-skip-shrine',    this.onSkipShrine,     this)
    e.off('karma-summit',         this.onSummit,         this)
  }

  // ─── Internal karma mutation ──────────────────────────────────────────────

  // All additive karma changes route through here — clamp + emit in one place.
  private apply(delta: number): void {
    this.karma = Math.max(0, this.karma + delta)
    this.scene.events.emit('karma-changed', this.karma)
  }

  // ─── Event handlers ───────────────────────────────────────────────────────

  private onHelpClimber():   void { this.apply(KARMA_HELP_CLIMBER) }
  private onPrayerFlag():    void { this.apply(KARMA_PRAYER_FLAG) }
  private onYetiFootprint(): void { this.apply(KARMA_YETI_FOOTPRINT) }
  private onAbandonNpc():    void { this.apply(KARMA_ABANDON_NPC) }  // negative
  private onSkipShrine():    void { this.apply(KARMA_SKIP_SHRINE) }  // negative

  // Summit multiplier is applied to the total, not added as a delta.
  // Only fires when all NPCs were saved; guarded here so callers can
  // fire 'karma-summit' unconditionally at the summit cutscene.
  private onSummit(): void {
    if (!this.allNpcsSaved) return
    this.karma = this.karma * KARMA_SUMMIT_ALL_SAFE
    this.scene.events.emit('karma-changed', this.karma)
  }
}
