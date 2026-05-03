# SKILL — Firebase Patterns

> Read this before writing any Firebase code.
> All agents must call the typed API in src/firebase/api.ts — never the SDK directly.

---

## Config setup

```typescript
// src/firebase/config.ts
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'

const app = initializeApp({
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
})

export const auth    = getAuth(app)
export const db      = getFirestore(app)
export const rtdb    = getDatabase(app)
export const storage = getStorage(app)

// Enable offline persistence — game works without internet
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') console.warn('Multiple tabs open — persistence limited')
  if (err.code === 'unimplemented') console.warn('Browser does not support persistence')
})
```

---

## Auth patterns

```typescript
// Anonymous sign-in (default — zero friction)
import { signInAnonymously, onAuthStateChanged, linkWithPopup, GoogleAuthProvider } from 'firebase/auth'

export async function signInAnonymous(): Promise<string> {
  const cred = await signInAnonymously(auth)
  return cred.user.uid
}

// Upgrade anonymous → Google (keeps uid and all data)
export async function upgradeToGoogle(): Promise<void> {
  if (!auth.currentUser) throw new Error('No current user')
  await linkWithPopup(auth.currentUser, new GoogleAuthProvider())
}

// Listen for auth state (call once at app startup)
export function onAuth(cb: (uid: string | null) => void) {
  return onAuthStateChanged(auth, user => cb(user?.uid ?? null))
}
```

---

## Firestore save/load

```typescript
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import type { GameState } from './types'

export async function saveGame(uid: string, slot: number, state: GameState): Promise<void> {
  const ref = doc(db, 'saves', `${uid}_slot${slot}`)
  await setDoc(ref, {
    ...state,
    updatedAt: Timestamp.now(),
  })
}

export async function loadGame(uid: string, slot: number): Promise<GameState | null> {
  const ref = doc(db, 'saves', `${uid}_slot${slot}`)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    level:    data.level    ?? 1,
    score:    data.score    ?? 0,
    hp:       data.hp       ?? 100,
    playtime: data.playtime ?? 0,
  } as GameState
}
```

---

## Realtime DB leaderboard

```typescript
import { ref, set, onValue, query, orderByChild, limitToLast } from 'firebase/database'

export async function submitScore(uid: string, name: string, score: number): Promise<void> {
  await set(ref(rtdb, `scores/${uid}`), { score, name, ts: Date.now() })
}

export function watchLeaderboard(
  limit: number,
  cb: (entries: { uid: string; name: string; score: number }[]) => void
) {
  const q = query(ref(rtdb, 'scores'), orderByChild('score'), limitToLast(limit))
  return onValue(q, snap => {
    const entries = Object.entries(snap.val() ?? {})
      .map(([uid, v]: any) => ({ uid, name: v.name, score: v.score }))
      .sort((a, b) => b.score - a.score)
    cb(entries)
  })
}
```

---

## Error handling pattern (use everywhere)

```typescript
export async function saveGame(uid: string, slot: number, state: GameState): Promise<void> {
  try {
    await setDoc(doc(db, 'saves', `${uid}_slot${slot}`), state)
  } catch (err: any) {
    if (err.code === 'unavailable') {
      // Offline — Firestore will sync when back online (persistence handles this)
      console.warn('Offline — save queued for sync')
      return
    }
    console.error('Save failed:', err.code, err.message)
    throw err  // re-throw unexpected errors
  }
}
```

---

## Types

```typescript
// src/firebase/types.ts
export interface GameState {
  level:    number
  score:    number
  hp:       number
  playtime: number   // seconds
}

export interface SaveSlotMeta {
  slot:      number
  level:     number
  score:     number
  updatedAt: Date
}

export interface LeaderboardEntry {
  uid:   string
  name:  string
  score: number
}

export type Unsubscribe = () => void
```

---

## Firestore security rules template

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Saves: user can only read/write their own slots
    match /saves/{docId} {
      allow read, write: if request.auth != null
        && docId.matches(request.auth.uid + '_slot[0-4]');
    }

    // Feedback: authenticated write only, no user read
    match /feedback/{docId} {
      allow create: if request.auth != null;
      allow read:   if false;
    }

    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Deploy commands

```bash
# Test rules against emulator first
firebase emulators:start --only firestore,auth

# Deploy hosting only (most common)
firebase deploy --only hosting --project prod

# Deploy rules only
firebase deploy --only firestore:rules --project prod

# Preview channel (share URL before going live)
firebase hosting:channel:deploy preview-v02 --project dev
```
