// src/firebase/config.ts — Firebase initialization
// All VITE_FIREBASE_* vars must be set in .env.local — never hardcode keys here.
// Other agents must NOT import from this file — use src/firebase/api.ts instead.

import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

export const app = initializeApp({
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
})

export const auth    = getAuth(app)
export const storage = getStorage(app)

// Offline persistence — saves queue to IndexedDB and sync when reconnected.
// Multi-tab manager allows multiple browser tabs without conflicts.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})

// Call once before any SDK operations. Safe to call multiple times — guarded internally.
let emulatorsConnected = false
export function connectToEmulators(): void {
  if (emulatorsConnected) return
  emulatorsConnected = true
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}

if (import.meta.env.DEV) {
  connectToEmulators()
}
