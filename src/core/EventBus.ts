type Handler<T = unknown> = (data: T) => void

export class EventBus {
  private listeners = new Map<string, Set<Handler<unknown>>>()

  on<T>(event: string, handler: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler as Handler<unknown>)
    return () => this.off(event, handler)
  }

  emit<T>(event: string, data?: T): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      for (const h of handlers) {
        h(data as unknown)
      }
    }
  }

  off(event: string, handler: Function): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.delete(handler as Handler<unknown>)
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}
