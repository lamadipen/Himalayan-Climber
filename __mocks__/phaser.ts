// Root-level manual mock for the 'phaser' npm package.
// Vitest uses this when vi.mock('phaser') is called in any test file.
// Only the runtime-used parts of the API are implemented; type-only
// references (Phaser.Scene, Phaser.Physics.Arcade.Body, etc.) are not needed.

const Phaser = {
  Math: {
    Clamp: (value: number, min: number, max: number): number =>
      Math.min(Math.max(value, min), max),
  },
  // Stub the rest of the namespace to prevent "cannot read property of undefined"
  // errors if any system access an unexpected Phaser namespace in tests.
  Physics: { Arcade: { Body: {} } },
  Scenes:  { Events: { SHUTDOWN: 'shutdown', UPDATE: 'update' } },
  Display: { Color: { GetColor: (r: number, g: number, b: number) => (r << 16) | (g << 8) | b } },
}

export default Phaser
