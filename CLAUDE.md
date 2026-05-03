# CLAUDE.md — Indie Game Studio (Root)

> Every agent reads this file first before doing any work.
> This is the single source of truth for the whole team.

---

## Project overview

An indie web game studio building 2D and 3D games for the browser.

| Item | Value |
|---|---|
| 2D engine | Phaser 3 (TypeScript) |
| 3D engine | Three.js + Babylon.js |
| Build tool | Vite |
| Backend | Firebase (Auth, Firestore, Realtime DB, Storage, Hosting) |
| Version control | GitHub |
| Testing | Playwright (E2E) + Vitest (unit) |

---

## Active game

> Update this section when starting a new game project.

- **Game title**: [TBD]
- **Genre**: [e.g. 2D platformer / top-down RPG / 3D FPS]
- **Engine**: [Phaser 3 / Three.js / Babylon.js]
- **Current milestone**: [e.g. Alpha v0.1 — core loop complete]
- **GDD**: `docs/GDD.md`
- **Balance config**: `src/config/balance.ts`

---

## Team roster & folder ownership

| Agent | Role | Owns |
|---|---|---|
| Lead Developer | Core engine, game loop, systems | `src/engine/`, `src/entities/`, `src/scenes/` |
| Game Designer | Levels, mechanics, balance | `src/levels/`, `src/config/`, `docs/GDD.md` |
| UI/UX Designer | HUD, menus, visual style | `src/ui/`, `src/styles/`, `public/assets/fonts/` |
| Firebase Engineer | Backend, auth, data, deploy | `src/firebase/`, `firestore.rules`, `firebase.json` |
| QA Tester | Tests, bug reports | `tests/`, `bug-reports/` |
| Player Analyst | Feedback simulations | `src/feedback/`, `docs/player-sessions.md` |

---

## Golden rules — all agents must follow these

1. **Read README.md before every task.** It contains current game state, known issues, and recent decisions.
2. **Never edit outside your assigned folders** unless explicitly instructed by the director.
3. **Commit prefix convention**: `[role] short description`
   - e.g. `[dev] add bullet pool system`, `[designer] tune enemy HP values`
4. **Update README.md** if your work changes a public API, game mechanic, or Firebase schema.
5. **Never hardcode Firebase config.** Always import from `src/firebase/config.ts`.
6. **Read your SKILL file before writing code.** Located in `SKILLS/` — see your agent CLAUDE.md for which files apply to you.
7. **Ask before deleting.** Never delete files outside your folder without director approval.
8. **TypeScript strict mode is on.** No `any` types without a comment explaining why.

---

## Shared environment variables

Store in `.env.local` (never commit). Reference via `import.meta.env.VITE_*`:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=
```

---

## Branch strategy

```
main          ← production, protected
dev           ← integration branch, all agents merge here
feat/[role]/[feature]   ← agent feature branches
fix/[role]/[bug]        ← agent bug fix branches
```

All agents branch from `dev`, PR back to `dev`. Director merges `dev → main`.

---

## Player feedback loop

The Player Analyst writes to `docs/player-sessions.md` after each build.
A summary of top issues is always kept under `## Player feedback` in README.md.
The Game Designer must read player feedback before starting any new level or balance work.
