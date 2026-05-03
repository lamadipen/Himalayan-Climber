# Game Design Document — [Game Title]

> Owned by the Game Designer agent.
> Update this before implementing any new mechanic or level.
> All agents read this to understand what the game is.

---

## Overview

| Item | Value |
|---|---|
| Title | [TBD] |
| Genre | [e.g. 2D top-down shooter / 3D platformer] |
| Engine | [Phaser 3 / Three.js] |
| Target audience | [e.g. casual mobile players aged 16–35] |
| Core fantasy | [one sentence: "You are a lone warrior clearing dungeons for glory"] |
| Target session length | [e.g. 5–10 minutes] |
| Target platform | Web (primary), Android + iOS (via Capacitor) |

---

## Core loop

```
[Start level]
    ↓
[Move + fight enemies]
    ↓
[Collect pickups / score points]
    ↓
[Clear wave / reach exit]
    ↓
[Level complete — save progress to Firebase]
    ↓
[Next level — harder]
```

---

## Player

### Movement
- [ ] Define movement style (WASD / arrow keys / click-to-move)
- [ ] Jump / dash / dodge mechanic (if applicable)
- [ ] Mobile controls (virtual joystick / tap-to-move)

### Abilities
- [ ] Primary attack
- [ ] Secondary ability
- [ ] Special / ultimate

### Progression
- [ ] What does the player unlock or improve over time?
- [ ] How does progression persist via Firebase saves?

---

## Enemies

| Name | Behavior | HP | Damage | Points | Notes |
|---|---|---|---|---|---|
| Basic | Chase player | 40 | 10 | 100 | Spawns in waves |
| Ranged | Shoot from distance | 25 | 15 | 150 | Keeps range |
| Boss | Phase-based attack | 800 | 30 | 2000 | End of zone |

---

## Levels

| # | Name | Theme | New mechanic | Difficulty /5 |
|---|---|---|---|---|
| 1 | [Name] | [Theme] | [Mechanic introduced] | 1 |
| 2 | [Name] | [Theme] | [Mechanic introduced] | 2 |

---

## Progression & rewards

- [ ] Score system (see `balance.ts` → Scoring section)
- [ ] Save slots (0–4) via Firebase Firestore
- [ ] Global leaderboard via Firebase Realtime DB
- [ ] Unlockables (if any)

---

## Monetization hooks

- [ ] itch.io — pay-what-you-want
- [ ] Premium levels / cosmetics (Stripe or Firebase in-app)
- [ ] "Support the dev" link (Ko-fi / Patreon)

---

## Out of scope (v1.0)

- Multiplayer
- Custom level editor
- [add others]
