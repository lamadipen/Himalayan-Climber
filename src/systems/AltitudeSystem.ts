import { EventBus } from '../core/EventBus'

export class AltitudeSystem {
  speedMultiplier = 1.0
  jumpMultiplier = 1.0
  sicknessLevel = 0
  private progressFraction = 0

  constructor(private events: EventBus) {}

  setAltitude(altitudeMeters: number, playerY: number, levelMaxY: number): void {
    this.progressFraction = Math.max(0, Math.min(1, playerY / levelMaxY))
    const altFactor = altitudeMeters / 8849
    const t = this.progressFraction * altFactor
    this.speedMultiplier = 1.0 + (0.5 - 1.0) * t   // lerp(1.0, 0.5, t)
    this.jumpMultiplier  = 1.0 + (0.65 - 1.0) * t  // lerp(1.0, 0.65, t)
    // Clamp
    this.speedMultiplier = Math.max(0.5, Math.min(1.0, this.speedMultiplier))
    this.jumpMultiplier  = Math.max(0.65, Math.min(1.0, this.jumpMultiplier))
  }

  update(dt: number): void {
    // Accumulate altitude sickness
    this.sicknessLevel += this.progressFraction * dt * 0.02
    this.sicknessLevel = Math.max(0, Math.min(1, this.sicknessLevel))
    this.events.emit('altitude:sickness', this.sicknessLevel)
  }

  reset(): void {
    this.speedMultiplier = 1.0
    this.jumpMultiplier  = 1.0
    this.sicknessLevel   = 0
    this.progressFraction = 0
  }
}
