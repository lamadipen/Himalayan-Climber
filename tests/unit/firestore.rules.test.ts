// Tests for firestore.rules — run against the local emulator.
// Start emulator first: firebase emulators:start --only firestore,auth
// Then run: vitest run tests/unit/firestore.rules.test.ts

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const PROJECT_ID = 'himalayan-climber-test'
const RULES_PATH = resolve(__dirname, '../../firestore.rules')

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

afterAll(async () => {
  await testEnv.cleanup()
})

// ─── saves collection ─────────────────────────────────────────────────────────

describe('saves — authenticated user reads own save', () => {
  it('allows read of own slot', async () => {
    const uid = 'user-abc'
    const db = testEnv.authenticatedContext(uid).firestore()
    await assertSucceeds(getDoc(doc(db, 'saves', `${uid}_slot0`)))
  })

  it('allows write to own slot', async () => {
    const uid = 'user-abc'
    const db = testEnv.authenticatedContext(uid).firestore()
    await assertSucceeds(
      setDoc(doc(db, 'saves', `${uid}_slot2`), { currentLevel: 1, karma: 0 }),
    )
  })

  it('allows all valid slot numbers 0–4', async () => {
    const uid = 'user-abc'
    const db = testEnv.authenticatedContext(uid).firestore()
    for (const slot of [0, 1, 2, 3, 4]) {
      await assertSucceeds(getDoc(doc(db, 'saves', `${uid}_slot${slot}`)))
    }
  })
})

describe('saves — user reads another user\'s save (deny)', () => {
  it('denies read of another uid slot', async () => {
    const db = testEnv.authenticatedContext('user-abc').firestore()
    await assertFails(getDoc(doc(db, 'saves', 'user-xyz_slot0')))
  })

  it('denies write to another uid slot', async () => {
    const db = testEnv.authenticatedContext('user-abc').firestore()
    await assertFails(
      setDoc(doc(db, 'saves', 'user-xyz_slot1'), { currentLevel: 1 }),
    )
  })

  it('denies slot number outside 0–4', async () => {
    const uid = 'user-abc'
    const db = testEnv.authenticatedContext(uid).firestore()
    await assertFails(getDoc(doc(db, 'saves', `${uid}_slot5`)))
  })
})

describe('saves — unauthenticated access (deny)', () => {
  it('denies unauthenticated read', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'saves', 'user-abc_slot0')))
  })

  it('denies unauthenticated write', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(
      setDoc(doc(db, 'saves', 'user-abc_slot0'), { currentLevel: 1 }),
    )
  })
})

// ─── feedback collection ──────────────────────────────────────────────────────

describe('feedback — write-only', () => {
  const validFeedback = {
    persona: 'casual-player',
    build:   '0.1.0',
    event:   'death',
    location: 'langtang_slope_1',
    sessionDurationSeconds: 120,
  }

  it('allows authenticated create with required fields', async () => {
    const db = testEnv.authenticatedContext('user-abc').firestore()
    await assertSucceeds(setDoc(doc(db, 'feedback', 'fb-001'), validFeedback))
  })

  it('denies authenticated read of feedback', async () => {
    const db = testEnv.authenticatedContext('user-abc').firestore()
    await assertFails(getDoc(doc(db, 'feedback', 'fb-001')))
  })

  it('denies create missing required fields', async () => {
    const db = testEnv.authenticatedContext('user-abc').firestore()
    await assertFails(
      setDoc(doc(db, 'feedback', 'fb-002'), { persona: 'casual-player' }),
    )
  })

  it('denies unauthenticated write', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(setDoc(doc(db, 'feedback', 'fb-003'), validFeedback))
  })
})

// ─── default deny — arbitrary collection ─────────────────────────────────────

describe('default deny — unlisted collections', () => {
  it('denies authenticated read of arbitrary collection', async () => {
    const db = testEnv.authenticatedContext('user-abc').firestore()
    await assertFails(getDoc(doc(db, 'arbitrary', 'doc-1')))
  })

  it('denies authenticated write of arbitrary collection', async () => {
    const db = testEnv.authenticatedContext('user-abc').firestore()
    await assertFails(setDoc(doc(db, 'arbitrary', 'doc-1'), { data: true }))
  })
})
