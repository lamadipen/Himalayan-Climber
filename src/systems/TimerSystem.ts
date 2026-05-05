export class TimerSystem {
  elapsed = 0
  running = false

  start(): void {
    this.running = true
  }

  stop(): void {
    this.running = false
  }

  reset(): void {
    this.elapsed = 0
    this.running = false
  }

  update(dt: number): void {
    if (this.running) {
      this.elapsed += dt
    }
  }

  format(): string {
    const total = this.elapsed
    const minutes = Math.floor(total / 60)
    const seconds = Math.floor(total % 60)
    const centiseconds = Math.floor((total % 1) * 100)
    const mm = String(minutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')
    const cc = String(centiseconds).padStart(2, '0')
    return `${mm}:${ss}.${cc}`
  }
}
