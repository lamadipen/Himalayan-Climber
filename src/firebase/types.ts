// src/firebase/types.ts
// [Firebase Engineer owns this file]
// Shared types for all Firebase data — used by api.ts and other agents

export interface GameState {
  level:    number
  score:    number
  hp:       number
  playtime: number   // seconds elapsed in current run
}

export interface SaveSlotMeta {
  slot:      number
  level:     number
  score:     number
  updatedAt: Date
  exists:    boolean
}

export interface LeaderboardEntry {
  uid:   string
  name:  string
  score: number
  rank?: number
}

export interface FeedbackEvent {
  persona:               string
  build:                 string
  event:                 'quit' | 'death' | 'level-complete' | 'friction' | 'delight'
  location:              string
  reason?:               string
  sessionDurationSeconds: number
}

export type Unsubscribe = () => void
