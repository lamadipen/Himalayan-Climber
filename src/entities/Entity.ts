export abstract class Entity {
  abstract update(dt: number): void
  abstract destroy(): void
}
