# [Game Title] — Project README

> All agents read this before starting any task.
> This is the living state of the project — update it when anything significant changes.

---

## Current status

| Item | Value |
|---|---|
| Milestone | Pre-alpha — scaffold complete |
| Engine | [Phaser 3 / Three.js — update when decided] |
| Build | Not started |
| Last deploy | — |
| Open bugs | 0 |

---

## Quick start

```bash
# Install
npm install

# Dev server
npm run dev          # → http://localhost:5173

# Run tests
npx vitest run
npx playwright test

# Deploy to Firebase (preview)
npm run build
firebase hosting:channel:deploy preview --project dev

# Deploy to Firebase (production)
npm run build
firebase deploy --only hosting --project prod
```

---

## Team & active tasks

| Agent | Current task | Branch | Status |
|---|---|---|---|
| Lead Developer | — | — | Waiting for game type decision |
| Game Designer | — | — | Waiting — write GDD.md first |
| UI/UX Designer | — | — | Waiting for game type decision |
| Firebase Engineer | Set up config.ts and api.ts | feat/firebase/setup | Not started |
| QA Tester | Set up Vitest + Playwright | feat/qa/test-setup | Not started |
| Player Analyst | — | — | Waiting for first playable build |

---

## Architecture

```
src/
├── engine/          Lead Dev — game loop, input, object pools
├── entities/        Lead Dev — Player, Enemy, Projectile
├── scenes/          Lead Dev — one file per screen/level
├── levels/          Game Designer — tilemap JSON files
├── config/
│   └── balance.ts   Game Designer — all tunable values
├── ui/              UI Designer — HUD, menus, screens
├── styles/          UI Designer — design tokens, global CSS
├── firebase/        Firebase Engineer — API wrappers, config
└── feedback/        Player Analyst — feedback logging
```

---

## Firebase schema

### Firestore
```
saves/{uid}_slot{0-4}
  level:     number
  score:     number
  hp:        number
  playtime:  number (seconds)
  updatedAt: Timestamp
```

### Realtime Database
```
scores/{uid}
  score: number
  name:  string
  ts:    number (unix ms)
```

---

## Known issues

_None yet — project just scaffolded._

---

## Recent decisions

| Date | Decision | Made by |
|---|---|---|
| [today] | Repo scaffolded with 6 AI agents | Director |

---

## Player feedback

_No sessions yet — waiting for first playable build._

---

## Shipping targets

| Platform | Method | Status |
|---|---|---|
| Web (browser) | Firebase Hosting | Ready to deploy |
| Android | Capacitor wrapper | Planned |
| iOS | Capacitor wrapper | Planned |
| itch.io | ZIP of dist/ | Ready after first build |
