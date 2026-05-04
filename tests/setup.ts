import { beforeEach, vi } from 'vitest'

// Clear call history between tests; implementations set in __mocks__ or
// individual describe blocks are preserved.
beforeEach(() => {
  vi.clearAllMocks()
})
