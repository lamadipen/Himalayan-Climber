import { LevelBase } from './LevelBase'
import { Level1_Langtang } from './Level1_Langtang'
import { Level2_Annapurna } from './Level2_Annapurna'
import { Level3_Manaslu } from './Level3_Manaslu'
import { Level4_ChoOyu } from './Level4_ChoOyu'
import { Level5_Everest } from './Level5_Everest'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LevelCtor = new (...args: ConstructorParameters<typeof LevelBase>) => LevelBase
const registry = new Map<number, LevelCtor>()
registry.set(1, Level1_Langtang)
registry.set(2, Level2_Annapurna)
registry.set(3, Level3_Manaslu)
registry.set(4, Level4_ChoOyu)
registry.set(5, Level5_Everest)

export function getLevel(id: number) {
  const L = registry.get(id)
  if (!L) throw new Error(`Level ${id} not found`)
  return L
}

export { registry as LevelRegistry }
