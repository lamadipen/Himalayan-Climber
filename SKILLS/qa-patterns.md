# SKILL — QA Patterns

> Read this before writing any tests.
> Covers Vitest unit tests, Playwright E2E, Firebase mocking, and performance checks.

---

## Vitest setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/entities/**'],
      thresholds: { lines: 80, functions: 80 },
    },
  },
})
```

```typescript
// tests/setup.ts
import { vi } from 'vitest'

// Mock Firebase — never hit real Firebase in unit tests
vi.mock('../src/firebase/api', () => ({
  saveGame:        vi.fn().mockResolvedValue(undefined),
  loadGame:        vi.fn().mockResolvedValue({ level: 1, score: 0, hp: 100, playtime: 0 }),
  submitScore:     vi.fn().mockResolvedValue(undefined),
  watchLeaderboard:vi.fn().mockReturnValue(() => {}),
  signInAnonymous: vi.fn().mockResolvedValue('test-uid-123'),
}))
```

---

## Unit test patterns

```typescript
// tests/unit/ScoreSystem.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ScoreSystem } from '../../src/engine/ScoreSystem'

describe('ScoreSystem', () => {
  let score: ScoreSystem
  beforeEach(() => { score = new ScoreSystem() })

  it('starts at zero', () => {
    expect(score.total).toBe(0)
  })

  it('awards correct points per enemy type', () => {
    score.addKill('basic')
    expect(score.total).toBe(100)
  })

  it('applies combo multiplier after threshold', () => {
    for (let i = 0; i < 5; i++) score.addKill('basic')
    score.addKill('basic')
    expect(score.total).toBeGreaterThan(600)
  })

  it('never overflows Number.MAX_SAFE_INTEGER', () => {
    score['_total'] = Number.MAX_SAFE_INTEGER - 10
    score.addKill('boss')
    expect(score.total).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER)
  })
})
```

---

## Playwright E2E setup

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile',   use: { ...devices['iPhone 12'] } },
  ],
  webServer: { command: 'npm run dev', port: 5173, reuseExistingServer: true },
})
```

---

## E2E test patterns

```typescript
// tests/e2e/game-loop.spec.ts
import { test, expect } from '@playwright/test'

test.describe('full game loop', () => {

  test('main menu loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="btn-play"]')).toBeVisible()
    await expect(page.locator('[data-testid="btn-leaderboard"]')).toBeVisible()
  })

  test('clicking play starts the game', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="btn-play"]')
    await expect(page.locator('[data-testid="hud-health"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="hud-score"]')).toHaveText('0')
  })

  test('pause menu opens on Escape', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="btn-play"]')
    await page.waitForSelector('[data-testid="hud-health"]')
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="pause-menu"]')).toBeVisible()
  })

})

// tests/e2e/firebase.spec.ts
test('leaderboard shows submitted score', async ({ page }) => {
  await page.goto('/')
  // Mock score submission via page evaluate
  await page.evaluate(() => {
    (window as any).__testScore = 9999
  })
  await page.goto('/leaderboard')
  await page.waitForSelector('[data-testid="leaderboard-list"]')
  // At least one entry visible
  await expect(page.locator('[data-testid="leaderboard-entry"]').first()).toBeVisible()
})
```

---

## data-testid requirements

Every interactive UI element needs a `data-testid`. Required list:

```
btn-play              Main menu play button
btn-leaderboard       Main menu leaderboard button
btn-settings          Main menu settings button
btn-pause-resume      Pause menu resume button
btn-pause-quit        Pause menu quit button
hud-health            Health bar container
hud-score             Score text element
game-over-screen      Game over screen container
game-over-score       Final score display
game-over-highscore   High score display
btn-retry             Retry button on game over
leaderboard-list      Leaderboard container
leaderboard-entry     Individual leaderboard row (multiple)
save-slot-[0-4]       Save slot buttons
```

---

## Performance check script

```typescript
// tests/perf/framerate.spec.ts
import { test, expect } from '@playwright/test'

test('maintains 60fps during gameplay', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="btn-play"]')
  await page.waitForSelector('[data-testid="hud-health"]')

  // Measure frame times over 5 seconds
  const fps = await page.evaluate(() => {
    return new Promise<number>(resolve => {
      let frames = 0
      const start = performance.now()
      const count = () => {
        frames++
        if (performance.now() - start < 5000) requestAnimationFrame(count)
        else resolve(frames / 5)
      }
      requestAnimationFrame(count)
    })
  })

  expect(fps).toBeGreaterThan(55)
})
```

---

## Run commands

```bash
# Unit tests
npx vitest run
npx vitest run --coverage

# E2E tests
npx playwright test
npx playwright test --project=mobile
npx playwright test --headed  # watch mode

# Specific test file
npx vitest run tests/unit/ScoreSystem.test.ts
npx playwright test tests/e2e/game-loop.spec.ts
```
