// src/firebase/api.ts — the ONLY file other agents import from Firebase.
// Never call Firebase SDK directly outside this file and config.ts.

import {
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getAnalytics, logEvent as _logEvent, isSupported } from 'firebase/analytics'
import { app, auth, db, storage } from './config'
import type {
  GameState,
  SaveSlotMeta,
  LeaderboardEntry,
  WeatherSeed,
  Unsubscribe,
} from './types'

// ─── Analytics (lazy — gracefully absent in non-browser/test environments) ───

let _analytics: ReturnType<typeof getAnalytics> | null = null
isSupported().then(yes => {
  if (yes) _analytics = getAnalytics(app)
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signInAnonymous(): Promise<string> {
  const cred = await signInAnonymously(auth)
  return cred.user.uid
}

export async function signInWithGoogle(): Promise<string> {
  const cred = await signInWithPopup(auth, new GoogleAuthProvider())
  return cred.user.uid
}

// Keeps uid and all existing save data — call after player wants to persist progress
export async function upgradeAnonymousToGoogle(): Promise<void> {
  if (!auth.currentUser) throw new Error('No authenticated user')
  await linkWithPopup(auth.currentUser, new GoogleAuthProvider())
}

// Returns unsubscribe fn — call once at app startup to track auth state
export function onAuth(cb: (uid: string | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, user => cb(user?.uid ?? null))
}

// ─── Game saves (Firestore) ───────────────────────────────────────────────────

export async function saveGame(uid: string, slot: number, state: GameState): Promise<void> {
  try {
    await setDoc(doc(db, 'saves', `${uid}_slot${slot}`), {
      ...state,
      updatedAt: Timestamp.now(),
    })
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'unavailable') {
      // Offline — IndexedDB persistence queues this for sync on reconnect
      console.warn('[firebase] Offline — save queued for sync')
      return
    }
    console.error('[firebase] saveGame failed:', code)
    throw err
  }
}

export async function loadGame(uid: string, slot: number): Promise<GameState | null> {
  const snap = await getDoc(doc(db, 'saves', `${uid}_slot${slot}`))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    currentLevel:      d.currentLevel      ?? 1,
    karma:             d.karma             ?? 0,
    summitedMountains: d.summitedMountains ?? [],
    oxygenCaches:      d.oxygenCaches      ?? 0,
    yetiFootprints:    d.yetiFootprints    ?? 0,
    npcsSaved:         d.npcsSaved         ?? 0,
    totalPlaytime:     d.totalPlaytime     ?? 0,
  }
}

// Returns all 5 slots — slots without saves have exists: false
export async function listSaveSlots(uid: string): Promise<SaveSlotMeta[]> {
  const reads = Array.from({ length: 5 }, (_, i) =>
    getDoc(doc(db, 'saves', `${uid}_slot${i}`))
  )
  const snaps = await Promise.all(reads)
  return snaps.map((snap, i) => {
    if (!snap.exists()) {
      return { slot: i, level: 0, karma: 0, updatedAt: new Date(0), exists: false }
    }
    const d = snap.data()
    return {
      slot:      i,
      level:     d.currentLevel ?? 1,
      karma:     d.karma        ?? 0,
      updatedAt: (d.updatedAt as Timestamp).toDate(),
      exists:    true,
    }
  })
}

export async function deleteSave(uid: string, slot: number): Promise<void> {
  await deleteDoc(doc(db, 'saves', `${uid}_slot${slot}`))
}

// ─── Leaderboard (Firestore) ──────────────────────────────────────────────────
// Doc ID: {mountain}_{uid} — one best-time entry per player per mountain.
// Requires a composite index: (mountain ASC, time ASC) — create via Firebase console.

export async function submitScore(
  uid:         string,
  displayName: string,
  mountain:    string,
  time:        number,
  karma:       number,
  npcsSaved:   number,
): Promise<void> {
  // Only write if this is the player's personal best for this mountain
  const ref = doc(db, 'leaderboard', `${mountain}_${uid}`)
  const existing = await getDoc(ref)
  if (existing.exists() && (existing.data().time as number) <= time) return

  await setDoc(ref, {
    uid,
    displayName,
    mountain,
    time,
    karma,
    npcsSaved,
    ts: Timestamp.now(),
  })
}

export function watchLeaderboard(
  mountain: string,
  limit_: number,
  cb: (entries: LeaderboardEntry[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'leaderboard'),
    where('mountain', '==', mountain),
    orderBy('time', 'asc'),
    limit(limit_),
  )
  return onSnapshot(q, snap => {
    const entries: LeaderboardEntry[] = snap.docs.map((d, i) => ({
      rank:        i + 1,
      uid:         d.data().uid,
      displayName: d.data().displayName,
      mountain:    d.data().mountain,
      time:        d.data().time,
      karma:       d.data().karma,
      npcsSaved:   d.data().npcsSaved,
    }))
    cb(entries)
  })
}

// Returns the player's existing personal-best time (seconds) for a mountain,
// or null if they have never summited it. Used by SummitScene to detect new records.
export async function getPersonalBestTime(uid: string, mountain: string): Promise<number | null> {
  const snap = await getDoc(doc(db, 'leaderboard', `${mountain}_${uid}`))
  if (!snap.exists()) return null
  return snap.data().time as number
}

// Returns 1-based rank; returns -1 if the player has no entry for this mountain
export async function getPlayerRank(uid: string, mountain: string): Promise<number> {
  const playerSnap = await getDoc(doc(db, 'leaderboard', `${mountain}_${uid}`))
  if (!playerSnap.exists()) return -1
  const playerTime = playerSnap.data().time as number

  const betterCount = await getCountFromServer(
    query(
      collection(db, 'leaderboard'),
      where('mountain', '==', mountain),
      where('time', '<', playerTime),
    ),
  )
  return betterCount.data().count + 1
}

// ─── Weather seed (Firestore, written by Cloud Function) ─────────────────────

export async function getDailyWeatherSeed(): Promise<WeatherSeed> {
  const snap = await getDoc(doc(db, 'weather', 'today'))
  if (!snap.exists()) {
    // Fallback: derive a deterministic seed from today's date so the game
    // works even before the Cloud Function has run for the day
    const today = new Date().toISOString().slice(0, 10)
    const seed = today.split('-').reduce((acc, part) => acc * 100 + parseInt(part, 10), 0)
    return { seed, date: today }
  }
  const d = snap.data()
  return { seed: d.seed, date: d.date }
}

// ─── Asset storage ────────────────────────────────────────────────────────────

export async function uploadAsset(file: File, path: string): Promise<string> {
  const fileRef = ref(storage, path)
  await uploadBytes(fileRef, file)
  return getDownloadURL(fileRef)
}

export async function getAssetUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path))
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export function logEvent(name: string, params?: Record<string, string | number>): void {
  if (_analytics) _logEvent(_analytics, name, params)
}
