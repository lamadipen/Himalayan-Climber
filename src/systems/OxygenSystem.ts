import { EventBus } from '../core/EventBus'

export class OxygenSystem {
  oxygen = 1.0
  private drainRate = 0.3
  private depleted = false

  constructor(private events: EventBus) {}

  setDrainRate(rate: number): void {
    this.drainRate = rate
  }

  refill(amount: number): void {
    this.oxygen = Math.min(1.0, this.oxygen + amount)
    this.depleted = false
  }

  reset(): void {
    this.oxygen = 1.0
    this.depleted = false
  }

  update(dt: number): void {
    this.oxygen -= this.drainRate * dt * 0.008
    this.oxygen = Math.max(0, this.oxygen)

    if (this.oxygen <= 0 && !this.depleted) {
      this.depleted = true
      this.events.emit('oxygen:depleted')
    }
  }
}
