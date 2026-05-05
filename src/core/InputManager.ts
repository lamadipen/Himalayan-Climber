export class InputManager {
  private keys = new Set<string>()
  private pressedThisFrame = new Set<string>()

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const key = this.normalizeKey(e.key)
    if (!this.keys.has(key)) {
      this.pressedThisFrame.add(key)
    }
    this.keys.add(key)
  }

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    const key = this.normalizeKey(e.key)
    this.keys.delete(key)
  }

  constructor() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  private normalizeKey(key: string): string {
    if (key === ' ') return 'Space'
    if (key.length === 1) return key.toLowerCase()
    return key
  }

  isDown(key: string): boolean {
    return this.keys.has(this.normalizeKey(key))
  }

  wasPressed(key: string): boolean {
    return this.pressedThisFrame.has(this.normalizeKey(key))
  }

  update(): void {
    this.pressedThisFrame.clear()
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.keys.clear()
    this.pressedThisFrame.clear()
  }
}
