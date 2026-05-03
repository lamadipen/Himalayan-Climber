# Game Design Document — Himalayan Climber

**Engine**: Phaser 3 | **Platform**: Web + Android + iOS (Capacitor) | **Milestone**: Pre-production

---

## Overview

| Item | Value |
|---|---|
| Title | Himalayan Climber (हिमाली आरोही) |
| Genre | 2D physics platformer |
| Core fantasy | A veteran Sherpa guiding climbers across Nepal's greatest peaks |
| Target audience | Nepali youth 16–35, mountaineering fans worldwide, Nepali diaspora |
| Session length | 8–15 min per mountain |
| Platforms | Web (Firebase Hosting), Android + iOS (Capacitor) |
| Languages | English + Nepali (Devanagari) |

---

## Core loop

```
Base camp (briefing + load save)
  ↓
Climb section — platformer traversal
  ↓
Checkpoint (auto-save to Firestore, resupply oxygen + ropes)
  ↓
Summit push — hazards increase, oxygen critical
  ↓
Summit cutscene (localised in Nepali + English)
  ↓
Score screen — time, karma, NPCs saved, compare to leaderboard
  ↓
Share card generated (Firebase Storage) → social share
  ↓
Next mountain unlocked
```

---

## Player character — Karma Sherpa

| Attribute | Value |
|---|---|
| Name | Karma (कर्म) — player-named at start |
| Starting HP | 100 |
| Starting Oxygen | 100 |
| Move speed | 180 px/s (sea level) |
| Jump force | -440 (variable, hold for more) |
| Gravity | 800 |
| Sprite size | 32×48 px |

### Abilities

| Key | Action | Notes |
|---|---|---|
| WASD / Arrow | Walk / run | 8 directions |
| Space / Up | Jump | Variable height, hold to extend |
| Down | Crouch | Smaller hitbox, fits ledges |
| X | Ice axe grab | Hold near ice wall tile — anchor, prevent slide |
| Z | Rope throw | Grapple to anchor points. 3 uses, replenish at checkpoint |
| Down + run | Crouch slide | Fast, uncontrolled — avalanche escape only |

---

## Altitude & oxygen system

### Altitude zones

| Zone | Altitude | Oxygen drain/sec | Move speed | Input delay |
|---|---|---|---|---|
| Foothills | < 6,000m | 0 | 100% | 0ms |
| High altitude | 6,000–7,500m | 0.8 | 90% | 0ms |
| Very high | 7,500–8,500m | 2.2 | 75% | 0ms |
| Death zone | > 8,500m | 5.0 | 65% | 80ms |

- Oxygen bar on HUD. At 0%, HP drains at 5/sec.
- Oxygen replenished at checkpoints and oxygen cache pickups.
- Screen vignette darkens as oxygen drops below 25%.

---

## Karma system

| Action | Karma change |
|---|---|
| Help a lost NPC climber to route | +15 |
| Touch a prayer flag | +5 |
| Collect yeti footprint | +3 |
| Abandon an NPC | -20 |
| Take a shortcut past a shrine | -5 |
| Summit with all NPCs safe | ×2 bonus multiplier |

**Karma outcomes:**
- 0–50: Default ending. Mountain accepts your presence.
- 51–150: Good ending. Village celebration cutscene.
- 151+: True ending (Level 5 only). Spirit grants blessing. Secret route opens.

---

## Levels

### Level 1 — Langtang Valley (लाङटाङ उपत्यका)
- **Altitude range**: 3,500–4,600m
- **Difficulty**: 1/5 (tutorial)
- **New mechanics introduced**: Basic movement, ice axe grab, checkpoint save
- **Special**: Snow leopard guide (high karma → helpful, low karma → hostile)
- **Cultural beat**: Community memorial section (2015 Gorkha earthquake tribute)
- **Tilemap**: `src/levels/level1-langtang.json`

### Level 2 — Annapurna Circuit (अन्नपूर्ण सर्किट)
- **Altitude range**: 4,000–5,416m (Thorong La pass)
- **Difficulty**: 2/5
- **New mechanics**: Rope throw, mule train hazard, blizzard weather event
- **Special**: Tihar festival event — if played Oct 20–24, decorative lights and extra karma opportunities
- **Cultural beat**: Teahouse checkpoint system with NPC dialogue in Nepali
- **Tilemap**: `src/levels/level2-annapurna.json`

### Level 3 — Manaslu (मनास्लु)
- **Altitude range**: 5,500–8,163m
- **Difficulty**: 3/5
- **New mechanics**: Crevasse detection (visual tell), first death zone exposure
- **Special**: Ancient monastery at 5,800m — prayer grants +30 karma, brief oxygen restore
- **Cultural beat**: Buddhist prayer wheel puzzles unlock shortcut routes
- **Tilemap**: `src/levels/level3-manaslu.json`

### Level 4 — Everest Khumbu (सगरमाथा)
- **Altitude range**: 6,000–8,849m
- **Difficulty**: 4.5/5 (hardest)
- **New mechanics**: Extended death zone, Khumbu Icefall (dynamic falling ice pillars), Hillary Step (precision platforming)
- **Special**: Most famous summit — leaderboard most competitive
- **Cultural beat**: Everest is called Sagarmatha (सगरमाथा) in Nepali — game uses local name
- **Tilemap**: `src/levels/level4-everest.json`

### Level 5 — Kanchenjunga (कञ्चनजंघा)
- **Altitude range**: 5,000–8,586m
- **Difficulty**: 3/5 (meditative)
- **New mechanics**: Spirit guardian boss fight, karma-gated true ending
- **Special**: Nepali tradition — true summit left untouched. Karma ≥ 150 = true ending; < 150 = good ending only
- **Cultural beat**: Ancient spirit dialogue spoken in formal Nepali
- **Tilemap**: `src/levels/level5-kanchenjunga.json`

---

## Hazards

| Hazard | Trigger | Effect | Counter |
|---|---|---|---|
| Avalanche | Zone trigger or blizzard weather | Instant kill if not in safe zone within 4,200ms | Run right, reach safe zone marker |
| Crevasse | Hidden under snow tile | Fall = instant death | Visual tell: slightly darker snow colour |
| Rock fall | Timed random overhead | -25 HP per hit | Move to shade-marked safe zones |
| Whiteout | Weather event | Visibility radius 60px | Follow compass indicator |
| Ice wall | Terrain type | Cannot pass without ice axe | Use X key to anchor |
| Altitude edema | Oxygen < 10% | Screen blur + 80ms input delay | Reach checkpoint or oxygen cache |
| Yak charge | Player enters yak zone running | Knockback, -20 HP | Walk slowly or wait |

---

## Enemies / creatures

| Creature | Behaviour | Karma interaction |
|---|---|---|
| Snow leopard (L1) | Follows player | High karma: guides to hidden route. Low karma: charges. |
| Mule train (L2) | Moves on fixed path | None — purely hazard |
| Lost NPC climber | Wanders off route | Save = +15 karma. Abandon = -20 karma + NPC gone. |
| Kanchenjunga spirit (L5 boss) | Phase 1: wind push. Phase 2: ice wall summons. | Karma ≥ 150 skips phase 2 |

---

## HUD layout

```
[Oxygen bar ████████░░░░]   [Weather icon]  [Karma ♦ 45]
[Health  bar ██████████░░]  [Altitude 7,240m]
```

---

## Firebase design

### Firestore — save schema
```
saves/{uid}_slot0
  currentLevel: number        // 1–5
  karma: number
  summitedMountains: string[] // ["langtang", "annapurna"]
  oxygenCaches: number
  yetiFootprints: number
  npcsSaved: number
  totalPlaytime: number       // seconds
  updatedAt: Timestamp
```

### Realtime Database — leaderboard
```
summitTimes/{mountain}/{uid}
  time: number        // seconds to summit
  displayName: string
  karma: number
  npcsSaved: number
  ts: number

weatherSeed/today
  seed: number        // same for all players each day
  date: string        // YYYY-MM-DD
```

---

## Firebase Cloud Functions needed

1. `generateDailyWeatherSeed` — runs daily at 00:00 Nepal time (UTC+5:45), writes seed to `weatherSeed/today`
2. `generateSummitShareCard` — triggered on summit, creates PNG share card from template, saves to Storage

---

## Monetisation

- **itch.io**: Pay-what-you-want. Suggested NPR 200 / $1.99.
- **Ko-fi link**: In main menu and game over screen.
- **Cosmetic DLC** (v1.1): Alternative Sherpa outfits (Rai, Tamang, Gurung traditional clothing). No gameplay advantage.
- **No ads**: Ruins the immersive mountain atmosphere.

---

## Milestones

| Week | Deliverable |
|---|---|
| 1 | Project scaffold, Firebase setup, core player movement + jump |
| 2 | Altitude system, avalanche, crevasse, checkpoint save |
| 3 | Level 1 complete + playable, karma system, snow leopard |
| 4 | Level 2 + weather system + Tihar event |
| 5 | Levels 3–4, death zone, Icefall, Hillary Step |
| 6 | Level 5 + spirit boss + true ending + all Firebase features |
| 7 | QA pass, player feedback sessions, polish |
| 8 | Ship to Firebase Hosting + itch.io |
