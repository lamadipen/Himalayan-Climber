// ─── SummitScreen — triggered by GameScene on successful summit ───────────────
// Registration: Lead Dev must add SummitScene to the scenes array in
// src/engine/GameLoop.ts and call:
//   this.scene.start('SummitScene', { mountain, timeSeconds, karma, npcsSaved, uid })
// from GameScene's summit logic.
import Phaser from 'phaser'
import {
  watchLeaderboard,
  submitScore,
  getPlayerRank,
  getPersonalBestTime,
  saveGame,
  loadGame,
} from '../firebase/api'
import type { LeaderboardEntry, Unsubscribe } from '../firebase/types'
import {
  SUMMIT_COLOR, SUMMIT_DEPTH,
  MENU_COLOR, FONT,
} from '../styles/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'ne'
type Tier = 'default' | 'good' | 'true'

interface SummitData {
  mountain:    string   // e.g. 'everest'
  timeSeconds: number
  karma:       number
  npcsSaved:   number
  uid:         string
}

// ─── Mountain metadata ────────────────────────────────────────────────────────
// npcsTotal: game-design number of NPCs placed in each level.
// Update these when the Game Designer adds/removes NPCs from a level.

const MOUNTAINS: Record<string, {
  ne:        string
  en:        string
  level:     number
  npcsTotal: number
}> = {
  langtang:     { ne: 'लाङटाङ',    en: 'Langtang',     level: 1, npcsTotal: 3 },
  annapurna:    { ne: 'अन्नपूर्णा', en: 'Annapurna',    level: 2, npcsTotal: 4 },
  manaslu:      { ne: 'मनास्लु',    en: 'Manaslu',      level: 3, npcsTotal: 5 },
  everest:      { ne: 'सगरमाथा',   en: 'Everest',      level: 4, npcsTotal: 6 },
  kanchenjunga: { ne: 'कञ्चनजंघा', en: 'Kanchenjunga', level: 5, npcsTotal: 8 },
}

const LEVEL_ORDER = ['langtang', 'annapurna', 'manaslu', 'everest', 'kanchenjunga']
const MAX_LEVEL   = LEVEL_ORDER.length

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE: Record<Tier, {
  bg: number; border: number; textColor: string
  labelEn: string; labelNe: string
}> = {
  default: {
    bg: 0x2a2a2a, border: 0x666666, textColor: '#aaaaaa',
    labelEn: 'The mountain accepted you',
    labelNe: 'पहाडले तपाईंलाई स्वीकार्यो',
  },
  good: {
    bg: 0x2a2000, border: 0xc8960a, textColor: '#ffd700',
    labelEn: 'Sherpa of the hills',
    labelNe: 'पहाडको शेर्पा',
  },
  true: {
    bg: 0x0a2828, border: 0x40c8b0, textColor: '#40f0d0',
    labelEn: 'Blessed by the mountain',
    labelNe: 'पहाडको आशीर्वाद',
  },
}

// ─── Bilingual strings ────────────────────────────────────────────────────────

const STR: Record<Lang, {
  summit:       string
  time:         string
  karma:        string
  npcsSaved:    string
  newRecord:    string
  rank:         (n: number) => string
  top5:         string
  share:        'Share' | 'सेयर'
  playAgain:    string
  nextMountain: string
  mainMenu:     string
  loading:      string
  copied:       string
}> = {
  en: {
    summit:       '★ SUMMIT! ★',
    time:         'Time',
    karma:        'Karma',
    npcsSaved:    'Climbers Saved',
    newRecord:    '✦ New Record!',
    rank:         (n) => `Rank #${n}`,
    top5:         'TOP 5',
    share:        'Share',
    playAgain:    'Play Again',
    nextMountain: 'Next Mountain',
    mainMenu:     'Main Menu',
    loading:      'Loading...',
    copied:       'Copied!',
  },
  ne: {
    summit:       '★ शिखर! ★',
    time:         'समय',
    karma:        'कर्म',
    npcsSaved:    'बचाइएका पर्वतारोही',
    newRecord:    '✦ नयाँ कीर्तिमान!',
    rank:         (n) => `क्रम #${n}`,
    top5:         'शीर्ष ५',
    share:        'सेयर',
    playAgain:    'फेरि खेल्नुहोस्',
    nextMountain: 'अर्को हिमाल',
    mainMenu:     'मुख्य मेनु',
    loading:      'लोड हुँदैछ...',
    copied:       'प्रतिलिपि भयो!',
  },
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getTier(karma: number): Tier {
  if (karma >= 151) return 'true'
  if (karma >= 51)  return 'good'
  return 'default'
}

function generateShareText(
  mountain: { ne: string; en: string },
  timeStr:  string,
  karma:    number,
  tier:     Tier,
  lang:     Lang,
): string {
  const badge = BADGE[tier]
  if (lang === 'ne') {
    return [
      `मैले ${mountain.ne}को शिखर चढें! ⛰️`,
      `समय: ${timeStr} | कर्म: ${karma}`,
      badge.labelNe,
      '#HimalayanClimber',
    ].join('\n')
  }
  return [
    `I summited ${mountain.en} (${mountain.ne})! ⛰️`,
    `Time: ${timeStr} | Karma: ${karma}`,
    badge.labelEn,
    '#HimalayanClimber',
  ].join('\n')
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const LCX  = 240      // left panel centre x
const RCX  = 720      // right panel centre x
const PW   = 440      // panel width (both panels identical)
const PY   = 70       // panel top y
const PH   = 350      // panel height
const BROW = 40       // leaderboard row height

// ─── Scene ────────────────────────────────────────────────────────────────────

export class SummitScreen extends Phaser.Scene {
  private summitData!:   SummitData
  private mountain!:     (typeof MOUNTAINS)[string]
  private tier!:         Tier
  private lang:          Lang = 'en'
  private timeStr        = ''
  private nextDisabled   = false

  // Leaderboard live state
  private lbSub:         Unsubscribe | null = null
  private lbContainer!:  Phaser.GameObjects.Container
  private spinnerText!:  Phaser.GameObjects.Text
  private spinnerTimer:  Phaser.Time.TimerEvent | null = null
  private lbFirstLoad    = true

  // Rank / record — updated asynchronously after score submit
  private rankText!:     Phaser.GameObjects.Text

  // Transparent DOM <button> elements that carry data-testid for Playwright
  private overlayBtns:   HTMLButtonElement[] = []

  constructor() {
    super({ key: 'SummitScene' })
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  create(data: SummitData): void {
    // Fallback uid from registry so scene works even if caller omitted it
    this.summitData  = { ...data, uid: data.uid ?? this.registry.get('uid') ?? '' }
    this.mountain    = MOUNTAINS[data.mountain] ?? MOUNTAINS.langtang
    this.tier        = getTier(data.karma)
    this.timeStr     = formatTime(data.timeSeconds)
    this.lang        = (localStorage.getItem('lang') as Lang | null) ?? 'en'
    this.nextDisabled = this.mountain.level >= MAX_LEVEL

    const W = this.scale.width
    const H = this.scale.height

    this.buildBackground(W, H)
    this.buildHeader(W)
    this.buildStatsPanel()
    this.buildLeaderboard(W)
    this.buildButtons(W, H)
    this.buildDomOverlays(W, H)

    this.cameras.main.fadeIn(500, 0, 0, 0)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this)

    // Async: submit score, detect new record, update rank display
    void this.processScore()
  }

  private onShutdown(): void {
    this.lbSub?.()
    this.spinnerTimer?.remove()
    this.overlayBtns.forEach(b => b.remove())
    this.overlayBtns = []
  }

  // ─── Background ─────────────────────────────────────────────────────────────

  private buildBackground(W: number, H: number): void {
    // Deep pre-dawn sky — warmer than the menu's pure night
    this.add.rectangle(W / 2, H / 2, W, H, SUMMIT_COLOR.sky).setDepth(SUMMIT_DEPTH.bg)

    // Sparse stars (dawn — fewer visible than full night)
    const rng   = new Phaser.Math.RandomDataGenerator(['summit-stars'])
    const stars = this.add.graphics().setDepth(SUMMIT_DEPTH.bg + 1)
    for (let i = 0; i < 45; i++) {
      const sx = rng.integerInRange(0, W)
      const sy = rng.integerInRange(0, Math.floor(H * 0.5))
      const br = rng.integerInRange(180, 255)
      stars.fillStyle(
        Phaser.Display.Color.GetColor(br, br, Math.min(255, br + 20)),
        rng.realInRange(0.25, 0.75),
      )
      stars.fillRect(sx, sy, 1, 1)
    }

    // Horizon glow — stacked semi-transparent bands for a soft gradient
    const glow = this.add.graphics().setDepth(SUMMIT_DEPTH.bg + 2)
    for (let i = 0; i < 7; i++) {
      glow.fillStyle(SUMMIT_COLOR.horizonGlow, (7 - i) * 0.028)
      glow.fillRect(0, H * 0.58 + i * 10, W, 14)
    }

    // Single foreground mountain silhouette (the conquered peak, symbolic)
    const mtn = this.add.graphics().setDepth(SUMMIT_DEPTH.bg + 3)
    mtn.fillStyle(SUMMIT_COLOR.mtnSilhouette)
    mtn.fillPoints([
      { x: 0,   y: H },
      { x: 0,   y: H * 0.64 },
      { x: 120, y: H * 0.56 },
      { x: 300, y: H * 0.64 },
      { x: 480, y: H * 0.50 },
      { x: 660, y: H * 0.62 },
      { x: 820, y: H * 0.57 },
      { x: W,   y: H * 0.65 },
      { x: W,   y: H },
    ], true)
  }

  // ─── Header ─────────────────────────────────────────────────────────────────

  private buildHeader(W: number): void {
    const s  = STR[this.lang]
    const cx = W / 2

    const hdr = this.add.text(cx, 18, s.summit, {
      fontFamily: FONT.family,
      fontSize:   '15px',
      color:      SUMMIT_COLOR.headerGold,
      stroke:     '#060c18',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(SUMMIT_DEPTH.text).setAlpha(0)

    // Bilingual mountain name in a Devanagari-capable font
    const mtnName = `${this.mountain.ne} / ${this.mountain.en}`
    const mtnTxt  = this.add.text(cx, 46, mtnName, {
      fontFamily: '"Noto Sans Devanagari", sans-serif',
      fontSize:   '13px',
      color:      '#c8dff0',
    }).setOrigin(0.5).setDepth(SUMMIT_DEPTH.text).setAlpha(0)

    this.tweens.add({ targets: hdr,    alpha: 1, duration: 600, delay: 100, ease: 'Power2' })
    this.tweens.add({ targets: mtnTxt, alpha: 1, duration: 600, delay: 350, ease: 'Power2' })
  }

  // ─── Stats panel (left half) ─────────────────────────────────────────────────

  private buildStatsPanel(): void {
    const s = STR[this.lang]

    // Panel background
    this.add.rectangle(LCX, PY + PH / 2, PW, PH, SUMMIT_COLOR.panelBg, 0.90)
      .setStrokeStyle(1, SUMMIT_COLOR.panelBorder, 0.7)
      .setDepth(SUMMIT_DEPTH.panel)

    const rows: Phaser.GameObjects.GameObject[] = []

    // ── Summit time ────────────────────────────────────────────────────────
    rows.push(this.add.text(LCX, PY + 28, `${s.time}: ${this.timeStr}`, {
      fontFamily: FONT.family, fontSize: '10px', color: SUMMIT_COLOR.timeColor,
    }).setOrigin(0.5).setDepth(SUMMIT_DEPTH.text).setAlpha(0))

    // ── Karma score ────────────────────────────────────────────────────────
    rows.push(this.add.text(LCX, PY + 64, `${s.karma}: ${this.summitData.karma} ♦`, {
      fontFamily: FONT.family, fontSize: '10px', color: SUMMIT_COLOR.karmaColor,
    }).setOrigin(0.5).setDepth(SUMMIT_DEPTH.text).setAlpha(0))

    // ── Tier badge (has its own pop-in tween, not part of row stagger) ────
    this.buildBadge(LCX, PY + 108, PY + 140)

    // ── NPCs saved ─────────────────────────────────────────────────────────
    const total = this.mountain.npcsTotal
    rows.push(this.add.text(LCX, PY + 183, `${s.npcsSaved}: ${this.summitData.npcsSaved} / ${total}`, {
      fontFamily: FONT.family, fontSize: '9px', color: SUMMIT_COLOR.npcColor,
    }).setOrigin(0.5).setDepth(SUMMIT_DEPTH.text).setAlpha(0))

    // ── Rank / record — populated asynchronously by processScore() ─────────
    this.rankText = this.add.text(LCX, PY + 222, '', {
      fontFamily: FONT.family, fontSize: '9px', color: SUMMIT_COLOR.newRecord,
    }).setOrigin(0.5).setDepth(SUMMIT_DEPTH.text)

    // Stagger stat rows in after header tweens settle
    rows.forEach((row, i) => {
      this.tweens.add({
        targets: row, alpha: 1,
        duration: 380, delay: 400 + i * 90, ease: 'Power2',
      })
    })
  }

  // ─── Karma tier badge ───────────────────────────────────────────────────────

  private buildBadge(cx: number, bgY: number, labelY: number): void {
    const cfg   = BADGE[this.tier]
    const label = this.lang === 'ne' ? cfg.labelNe : cfg.labelEn

    const bg = this.add.rectangle(cx, bgY, 300, 30, cfg.bg)
      .setStrokeStyle(2, cfg.border)
      .setDepth(SUMMIT_DEPTH.badge)
      .setAlpha(0)
      .setScale(0.7)

    const txt = this.add.text(cx, labelY, label, {
      fontFamily: '"Noto Sans Devanagari", monospace',
      fontSize:   '8px',
      color:      cfg.textColor,
    }).setOrigin(0.5).setDepth(SUMMIT_DEPTH.badge + 1).setAlpha(0).setScale(0.7)

    // Delayed pop-in after stats rows are visible
    this.time.delayedCall(700, () => {
      this.tweens.add({
        targets:  [bg, txt],
        alpha:    1,
        scaleX:   1,
        scaleY:   1,
        duration: 320,
        ease:     'Back.Out',
      })
    })
  }

  // ─── Leaderboard panel (right half) ──────────────────────────────────────────

  private buildLeaderboard(_W: number): void {
    const s = STR[this.lang]

    // Panel background
    this.add.rectangle(RCX, PY + PH / 2, PW, PH, SUMMIT_COLOR.panelBg, 0.90)
      .setStrokeStyle(1, SUMMIT_COLOR.panelBorder, 0.7)
      .setDepth(SUMMIT_DEPTH.panel)

    // Panel title: "TOP 5 — <mountain in Nepali>"
    this.add.text(RCX, PY + 18, `${s.top5} — ${this.mountain.ne}`, {
      fontFamily: '"Noto Sans Devanagari", monospace',
      fontSize:   '9px',
      color:      '#e8f4f8',
    }).setOrigin(0.5).setDepth(SUMMIT_DEPTH.text)

    // Loading spinner — shown until watchLeaderboard fires its first callback
    this.spinnerText = this.add.text(RCX, PY + PH / 2, `● ${s.loading}`, {
      fontFamily: FONT.family, fontSize: '8px', color: '#4a6080',
    }).setOrigin(0.5).setDepth(SUMMIT_DEPTH.text)

    const frames = ['●○○○', '○●○○', '○○●○', '○○○●']
    let fi = 0
    this.spinnerTimer = this.time.addEvent({
      delay: 220, loop: true,
      callback: () => {
        fi = (fi + 1) % frames.length
        this.spinnerText?.setText(`${frames[fi]} ${s.loading}`)
      },
    })

    // Off-screen container; rows are added when data arrives
    this.lbContainer = this.add.container(RCX, PY + 50)
      .setDepth(SUMMIT_DEPTH.text)
      .setAlpha(0)

    // Start live subscription — spec calls this watchMountainLeaderboard()
    // which maps to the existing watchLeaderboard(mountain, limit, cb) API.
    this.lbSub = watchLeaderboard(this.summitData.mountain, 5, entries => {
      this.onLeaderboardData(entries)
    })
  }

  private onLeaderboardData(entries: LeaderboardEntry[]): void {
    // Destroy spinner on first data arrival
    if (this.lbFirstLoad) {
      this.lbFirstLoad = false
      this.spinnerText?.destroy()
      this.spinnerTimer?.remove()
      this.spinnerTimer = null
    }

    // Replace existing rows (real-time updates overwrite previous render)
    this.lbContainer.removeAll(true)

    const uid = this.summitData.uid
    entries.forEach((entry, i) => {
      const isMe    = entry.uid === uid
      const color   = isMe ? SUMMIT_COLOR.lbHighlight : SUMMIT_COLOR.lbDefault
      const tStr    = formatTime(entry.time)
      const meTag   = isMe ? ' ◄' : ''
      const name    = entry.displayName.slice(0, 10)
      const line    = `${String(entry.rank).padStart(2)}. ${name.padEnd(10)} ${tStr} ♦${entry.karma}${meTag}`

      const row = this.add.text(0, i * BROW, line, {
        fontFamily: FONT.family, fontSize: '8px', color,
      }).setOrigin(0.5).setAlpha(0)

      this.lbContainer.add(row)

      // Slide + fade in with stagger
      this.tweens.add({
        targets:  row,
        alpha:    1,
        x:        { from: -28, to: 0 },
        duration: 240,
        delay:    i * 75,
        ease:     'Power2',
      })
    })

    this.tweens.add({ targets: this.lbContainer, alpha: 1, duration: 200 })
  }

  // ─── Buttons ─────────────────────────────────────────────────────────────────

  private buildButtons(W: number, H: number): void {
    const s      = STR[this.lang]
    const btnW   = 176
    const btnH   = 34
    const gap    = 16
    const totalW = btnW * 4 + gap * 3
    const startX = (W - totalW) / 2 + btnW / 2
    const y      = H - 46

    const defs: [string, () => void, boolean][] = [
      [s.share,        () => this.onShare(),        false],
      [s.playAgain,    () => this.onPlayAgain(),    false],
      [s.nextMountain, () => this.onNextMountain(), this.nextDisabled],
      [s.mainMenu,     () => this.onMainMenu(),     false],
    ]

    defs.forEach(([label, cb, disabled], i) => {
      const cx = startX + i * (btnW + gap)
      this.makeBtn(cx, y, btnW, btnH, label, cb, disabled)
    })
  }

  private makeBtn(
    cx: number, cy: number, w: number, h: number,
    label:   string,
    onClick: () => void,
    disabled = false,
  ): void {
    const baseAlpha = disabled ? 0.32 : 0.90

    const bg = this.add
      .rectangle(cx, cy, w, h, MENU_COLOR.btnBg, baseAlpha)
      .setDepth(SUMMIT_DEPTH.overlay)
      .setStrokeStyle(1, disabled ? 0x333355 : MENU_COLOR.btnBorder, baseAlpha)

    const txt = this.add
      .text(cx, cy, label, {
        fontFamily: FONT.family, fontSize: '8px',
        color: disabled ? '#445566' : MENU_COLOR.btnText,
      })
      .setOrigin(0.5)
      .setDepth(SUMMIT_DEPTH.overlay + 1)

    if (disabled) return

    const enter = () => { bg.setFillStyle(MENU_COLOR.btnBgHover, 0.95); txt.setColor(MENU_COLOR.btnTextHvr) }
    const leave = () => { bg.setFillStyle(MENU_COLOR.btnBg,      0.90); txt.setColor(MENU_COLOR.btnText)    }
    const press = () => { bg.setFillStyle(MENU_COLOR.btnBgDown);        this.time.delayedCall(100, onClick)  }

    txt.setInteractive({ useHandCursor: true })
      .on('pointerover', enter).on('pointerout', leave).on('pointerdown', press)
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', enter).on('pointerout', leave).on('pointerdown', press)
  }

  // ─── DOM button overlays (real data-testid for Playwright) ───────────────────

  private buildDomOverlays(W: number, H: number): void {
    const parent = this.game.canvas.parentElement
    if (!parent) return
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative'

    const btnW   = 176
    const btnH   = 34
    const gap    = 16
    const totalW = btnW * 4 + gap * 3
    const startX = (W - totalW) / 2
    const y      = H - 46 - btnH / 2

    const ids      = ['btn-share', 'btn-play-again', 'btn-next-mountain', 'btn-main-menu']
    const disabled = [false, false, this.nextDisabled, false]
    const cbs      = [
      () => this.onShare(),
      () => this.onPlayAgain(),
      () => this.onNextMountain(),
      () => this.onMainMenu(),
    ]

    ids.forEach((testId, i) => {
      const lx = startX + i * (btnW + gap)
      const el = document.createElement('button')
      el.setAttribute('data-testid', testId)
      if (disabled[i]) el.setAttribute('disabled', '')

      el.style.cssText = [
        'position:absolute',
        `left:${(lx / W * 100).toFixed(3)}%`,
        `top:${(y / H * 100).toFixed(3)}%`,
        `width:${(btnW / W * 100).toFixed(3)}%`,
        `height:${(btnH / H * 100).toFixed(3)}%`,
        'background:transparent', 'border:none',
        'cursor:pointer', 'z-index:999', 'padding:0', 'opacity:0',
      ].join(';')

      if (!disabled[i]) el.addEventListener('click', cbs[i])
      parent.appendChild(el)
      this.overlayBtns.push(el)
    })
  }

  // ─── Score processing ────────────────────────────────────────────────────────
  // Runs concurrently with scene build — updates rankText when done.

  private async processScore(): Promise<void> {
    const { uid, mountain, timeSeconds, karma, npcsSaved } = this.summitData
    const s = STR[this.lang]

    try {
      const prevBest    = await getPersonalBestTime(uid, mountain)
      const isNewRecord = prevBest === null || timeSeconds < prevBest

      const displayName = (this.registry.get('displayName') as string | null)
        ?? uid.slice(0, 8)
      await submitScore(uid, displayName, mountain, timeSeconds, karma, npcsSaved)

      if (isNewRecord) {
        this.rankText.setText(s.newRecord)
        this.tweens.add({
          targets:  this.rankText,
          scaleX:   1.35, scaleY: 1.35,
          duration: 130, yoyo: true, ease: 'Power2',
        })
      } else {
        const rank = await getPlayerRank(uid, mountain)
        if (rank > 0) this.rankText.setText(s.rank(rank)).setColor(SUMMIT_COLOR.rankColor)
      }
    } catch {
      // Firebase offline — rank display stays blank; gameplay unaffected
    }
  }

  // ─── Share ───────────────────────────────────────────────────────────────────

  private onShare(): void {
    const s    = STR[this.lang]
    const text = generateShareText(this.mountain, this.timeStr, this.summitData.karma, this.tier, this.lang)

    const showCopied = () => {
      const toast = this.add
        .text(this.scale.width / 2, this.scale.height - 70, s.copied, {
          fontFamily: FONT.family, fontSize: '8px', color: '#90ee90',
        })
        .setOrigin(0.5)
        .setDepth(SUMMIT_DEPTH.overlay + 5)

      this.tweens.add({
        targets:  toast,
        alpha:    0,
        y:        toast.y - 22,
        duration: 1200,
        delay:    400,
        onComplete: () => toast.destroy(),
      })
    }

    if (navigator.share) {
      navigator.share({ title: `Himalayan Climber — ${this.mountain.en}`, text })
        .catch(() => {/* user cancelled — no action needed */})
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(showCopied).catch(() => {/* permission denied */})
    } else {
      window.prompt('Copy to share:', text)
    }
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  private onPlayAgain(): void {
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'))
  }

  private async onNextMountain(): Promise<void> {
    if (this.nextDisabled) return

    const { uid, mountain, timeSeconds, karma, npcsSaved } = this.summitData
    const nextLevel = this.mountain.level + 1   // guaranteed ≤ MAX_LEVEL here

    try {
      const save = await loadGame(uid, 0)
      await saveGame(uid, 0, {
        currentLevel:      nextLevel,
        karma:             save?.karma             ?? karma,
        summitedMountains: [...(save?.summitedMountains ?? []), mountain],
        oxygenCaches:      save?.oxygenCaches      ?? 0,
        yetiFootprints:    save?.yetiFootprints     ?? 0,
        npcsSaved:         (save?.npcsSaved         ?? 0) + npcsSaved,
        totalPlaytime:     (save?.totalPlaytime     ?? 0) + timeSeconds,
      })
    } catch {/* offline — GameScene will load from Firestore cache on next start */}

    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'))
  }

  private onMainMenu(): void {
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenuScene'))
  }
}
