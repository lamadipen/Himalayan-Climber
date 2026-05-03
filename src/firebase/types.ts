// src/firebase/types.ts — shared types for all Firebase data
// Other agents import these types alongside the api.ts functions

export interface GameState {
  currentLevel:      number     // 1–5
  karma:             number
  summitedMountains: string[]   // e.g. ['langtang', 'annapurna']
  oxygenCaches:      number
  yetiFootprints:    number
  npcsSaved:         number
  totalPlaytime:     number     // seconds
}

export interface SaveSlotMeta {
  slot:      number
  level:     number
  karma:     number
  updatedAt: Date
  exists:    boolean
}

// One entry per player per mountain — Firestore leaderboard/{mountain}_{uid}
export interface LeaderboardEntry {
  uid:         string
  displayName: string
  mountain:    string
  time:        number   // seconds to summit (lower is better)
  karma:       number
  npcsSaved:   number
  rank?:       number
}

// Written daily by Cloud Function generateDailyWeatherSeed — clients read only
export interface WeatherSeed {
  seed: number
  date: string   // YYYY-MM-DD in Nepal time (UTC+5:45)
}

export interface FeedbackEvent {
  persona:                string
  build:                  string
  event:                  'quit' | 'death' | 'level-complete' | 'friction' | 'delight'
  location:               string
  reason?:                string
  sessionDurationSeconds: number
}

export type Unsubscribe = () => void
