// src/firebase/__mocks__/api.ts
// Manual mock for Firebase API — used by all unit tests via vi.mock('../../src/firebase/api').
// Individual tests can override specific functions with mockResolvedValueOnce / mockReturnValue.

import { vi } from 'vitest'

export const signInAnonymous          = vi.fn().mockResolvedValue('test-uid-123')
export const signInWithGoogle         = vi.fn().mockResolvedValue('test-uid-456')
export const upgradeAnonymousToGoogle = vi.fn().mockResolvedValue(undefined)
export const onAuth                   = vi.fn().mockReturnValue(() => {})

export const saveGame     = vi.fn().mockResolvedValue(undefined)
export const loadGame     = vi.fn().mockResolvedValue(null)
export const listSaveSlots = vi.fn().mockResolvedValue([])
export const deleteSave   = vi.fn().mockResolvedValue(undefined)

export const submitScore        = vi.fn().mockResolvedValue(undefined)
export const watchLeaderboard   = vi.fn().mockReturnValue(() => {})
export const getPersonalBestTime = vi.fn().mockResolvedValue(null)
export const getPlayerRank      = vi.fn().mockResolvedValue(-1)

// Default seed — override with mockResolvedValue / mockResolvedValueOnce in tests
export const getDailyWeatherSeed = vi.fn().mockResolvedValue({
  seed: 12345,
  date: '2026-01-01',
})

export const uploadAsset = vi.fn().mockResolvedValue('https://mock.url/asset')
export const getAssetUrl = vi.fn().mockResolvedValue('https://mock.url/asset')
export const logEvent    = vi.fn()
