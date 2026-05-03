import Phaser from 'phaser'
import { signInAnonymous, loadGame } from '../firebase/api'
import {
  MENU_DEPTH, MENU_COLOR, PARALLAX,
  FONT,
} from '../styles/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'ne'

// ─── Bilingual strings ────────────────────────────────────────────────────────
// Title and subtitle swap roles when the language switches so the user's chosen
// language is always the larger, more prominent line.

const STR: Record<Lang, {
  title:       string
  subtitle:    string
  play:        string
  cont:        (level: number) => string
  leaderboard: string
  language:    string
  support:     string
}> = {
  en: {
    title:       'Himalayan Climber',
    subtitle:    'हिमाली आरोही',
    play:        'Play',
    cont:        (n) => `Continue (Level ${n})`,
    leaderboard: 'Leaderboard',
    language:    '🌐 नेपाली',
    support:     'Support the dev ♥',
  },
  ne: {
    title:       'हिमाली आरोही',
    subtitle:    'Himalayan Climber',
    play:        'खेल्नुहोस्',
    cont:        (n) => `जारी (Level ${n})`,
    leaderboard: 'लिडरबोर्ड',
    language:    '🌐 English',
    support:     'Support the dev ♥',
  },
}

// Replace with your Ko-fi page URL before shipping.
const KOFI_URL = 'https://ko-fi.com'

// Button dimensions shared by makeBtn() and buildDomOverlays()
const BTN_W  = 240
const BTN_H  = 36
const BTN_Y0_FRAC = 0.49   // first button as fraction of scene height
const BTN_GAP = 48          // vertical gap between buttons in px

export class MainMenuScene extends Phaser.Scene {
  // ─── Parallax layers ──────────────────────────────────────────────────────
  private farLayer!:  Phaser.GameObjects.Graphics
  private midLayer!:  Phaser.GameObjects.Graphics
  private nearLayer!: Phaser.GameObjects.Graphics

  // ─── Title ────────────────────────────────────────────────────────────────
  private titleText!:    Phaser.GameObjects.Text
  private subtitleText!: Phaser.GameObjects.Text

  // ─── Buttons ──────────────────────────────────────────────────────────────
  private btnPlay!:   Phaser.GameObjects.Text
  private btnLeader!: Phaser.GameObjects.Text
  private btnLang!:   Phaser.GameObjects.Text

  // ─── State ────────────────────────────────────────────────────────────────
  private lang:      Lang = 'en'
  private uid        = ''
  private saveLevel  = 0    // 0 = no save; >0 = show "Continue (Level N)"

  // Invisible DOM <button> elements positioned over canvas — carry data-testid
  // for Playwright. Cleaned up on scene shutdown.
  private overlayBtns: HTMLButtonElement[] = []

  constructor() {
    super({ key: 'MainMenuScene' })
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async create(): Promise<void> {
    const W = this.scale.width
    const H = this.scale.height

    // 1. Auth — sign in anonymously; uid flows to all scenes via registry.
    //    BootScene may have done this already; signInAnonymously is idempotent.
    try {
      this.uid = await signInAnonymous()
    } catch {
      this.uid = `guest-${Date.now()}`
    }
    this.registry.set('uid', this.uid)

    // 2. Language preference from previous session
    this.lang = (localStorage.getItem('lang') as Lang | null) ?? 'en'

    // 3. Detect existing save — controls "Play" vs "Continue (Level N)" label
    try {
      const save   = await loadGame(this.uid, 0)
      this.saveLevel = save?.currentLevel ?? 0
    } catch {
      this.saveLevel = 0
    }

    // 4. Build scene — order matters for depth layering
    this.buildBackground(W, H)
    this.buildTitle(W, H)
    this.buildButtons(W, H)
    this.buildKofiLink(W, H)

    // 5. DOM overlays must run after buttons are laid out (needs coordinates)
    this.buildDomOverlays(W, H)

    // 6. Fade in from black
    this.cameras.main.fadeIn(600, 0, 0, 0)

    // 7. Clean up DOM overlays when scene stops (transition, restart, or shutdown)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupDom, this)
  }

  update(): void {
    this.updateParallax()
  }

  // ─── Background ───────────────────────────────────────────────────────────

  private buildBackground(W: number, H: number): void {
    // Deep night sky
    this.add.rectangle(W / 2, H / 2, W, H, MENU_COLOR.sky).setDepth(MENU_DEPTH.sky)

    // Seeded star field — deterministic so it looks the same on every visit
    const rng   = new Phaser.Math.RandomDataGenerator(['himalayan-stars'])
    const stars = this.add.graphics().setDepth(MENU_DEPTH.stars)
    for (let i = 0; i < 80; i++) {
      const sx   = rng.integerInRange(0, W)
      const sy   = rng.integerInRange(0, Math.floor(H * 0.65))
      const br   = rng.integerInRange(160, 255)
      const size = rng.frac() < 0.15 ? 2 : 1
      const a    = rng.realInRange(0.45, 1.0)
      // Slight blue tint on brighter stars for realism
      const col  = Phaser.Display.Color.GetColor(br, br, Math.min(255, br + 25))
      stars.fillStyle(col, a)
      stars.fillRect(sx, sy, size, size)
    }

    // Crescent moon — top-right; shadow circle punched out of a full circle
    const moon = this.add.graphics().setDepth(MENU_DEPTH.moon)
    moon.fillStyle(MENU_COLOR.moon, 0.9)
    moon.fillCircle(Math.round(W * 0.82), Math.round(H * 0.14), 22)
    moon.fillStyle(MENU_COLOR.moonShadow, 1)
    moon.fillCircle(Math.round(W * 0.82) + 11, Math.round(H * 0.14) - 5, 17)

    // Three mountain silhouette layers.
    // Each layer is drawn 96 px wider than the viewport (48 px overhang each
    // side) so parallax movement never reveals the canvas edge.
    this.farLayer  = this.add.graphics().setDepth(MENU_DEPTH.farMtn)
    this.midLayer  = this.add.graphics().setDepth(MENU_DEPTH.midMtn)
    this.nearLayer = this.add.graphics().setDepth(MENU_DEPTH.nearMtn)

    this.drawLayer(this.farLayer, MENU_COLOR.farMtn, [
      [-48, H], [-48, 160], [80, 90],  [180, 140], [280, 75],  [400, 130],
      [500, 60], [620, 120], [730, 55], [830, 110], [940, 85],  [1008, 150], [1008, H],
    ])
    // Snow caps on the three tallest far peaks — drawn in the same Graphics
    // object so they move with the layer automatically during parallax.
    this.farLayer.fillStyle(MENU_COLOR.snowCap, 0.85)
    this.farLayer.fillTriangle(500, 60,  478, 96,  524, 93)
    this.farLayer.fillTriangle(280, 75,  260, 108, 303, 106)
    this.farLayer.fillTriangle(730, 55,  710, 91,  753, 89)

    this.drawLayer(this.midLayer, MENU_COLOR.midMtn, [
      [-48, H], [-48, 240], [60, 210],  [180, 185], [300, 220], [400, 180],
      [520, 205], [640, 175], [750, 215], [860, 185], [950, 225], [1008, 210], [1008, H],
    ])

    this.drawLayer(this.nearLayer, MENU_COLOR.nearMtn, [
      [-48, H], [-48, 350], [100, 330], [220, 310], [340, 345], [460, 305],
      [580, 335], [700, 315], [820, 350], [920, 325], [1008, 345], [1008, H],
    ])
  }

  private drawLayer(
    gfx:   Phaser.GameObjects.Graphics,
    color: number,
    pts:   [number, number][],
  ): void {
    gfx.fillStyle(color)
    gfx.fillPoints(pts.map(([x, y]) => ({ x, y })), true)
  }

  // ─── Title ────────────────────────────────────────────────────────────────

  private buildTitle(W: number, H: number): void {
    const cx    = W / 2
    const s     = STR[this.lang]
    const finalY_en = H * 0.20
    const finalY_ne = H * 0.30

    // Start 24 px lower so the tween drifts upward as it fades in
    this.titleText = this.add.text(cx, finalY_en + 24, s.title, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize:   '22px',
      color:      MENU_COLOR.titleEn,
      stroke:     '#06101e',
      strokeThickness: 5,
      shadow: { offsetX: 2, offsetY: 3, color: '#000000', blur: 6, fill: true },
    })
      .setOrigin(0.5)
      .setDepth(MENU_DEPTH.ui)
      .setAlpha(0)

    // Nepali subtitle uses a Devanagari-capable system font
    this.subtitleText = this.add.text(cx, finalY_ne + 24, s.subtitle, {
      fontFamily: '"Noto Sans Devanagari", "Mangal", sans-serif',
      fontSize:   '16px',
      color:      MENU_COLOR.titleNe,
      shadow: { offsetX: 1, offsetY: 2, color: '#000000', blur: 4, fill: true },
    })
      .setOrigin(0.5)
      .setDepth(MENU_DEPTH.ui)
      .setAlpha(0)

    // Staggered drift-up + fade tween for both lines
    this.tweens.add({
      targets:  this.titleText,
      alpha:    1,
      y:        finalY_en,
      duration: 900,
      ease:     'Power2',
      delay:    200,
    })
    this.tweens.add({
      targets:  this.subtitleText,
      alpha:    1,
      y:        finalY_ne,
      duration: 900,
      ease:     'Power2',
      delay:    550,
    })
  }

  // ─── Buttons ──────────────────────────────────────────────────────────────

  private buildButtons(W: number, H: number): void {
    const cx     = W / 2
    const startY = H * BTN_Y0_FRAC
    const s      = STR[this.lang]
    const play   = this.saveLevel > 0 ? s.cont(this.saveLevel) : s.play

    this.btnPlay   = this.makeBtn(cx, startY,              play,          () => this.onPlay())
    this.btnLeader = this.makeBtn(cx, startY + BTN_GAP,    s.leaderboard, () => this.onLeaderboard())
    this.btnLang   = this.makeBtn(cx, startY + BTN_GAP * 2, s.language,  () => this.onLanguage())

    // Playwright testid on the Phaser objects (in-engine tooling)
    this.btnPlay.setData('testid',   'btn-play')
    this.btnLeader.setData('testid', 'btn-leaderboard')
    this.btnLang.setData('testid',   'btn-language')
  }

  // Creates a button: background rectangle + label text + hover/press handlers.
  // Both the bg and the text are made interactive so the full visual area fires.
  private makeBtn(
    cx:      number,
    cy:      number,
    label:   string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const bg = this.add
      .rectangle(cx, cy, BTN_W, BTN_H, MENU_COLOR.btnBg, 0.88)
      .setDepth(MENU_DEPTH.ui)
      .setStrokeStyle(1, MENU_COLOR.btnBorder, 0.7)

    const txt = this.add
      .text(cx, cy, label, {
        fontFamily: FONT.family,
        fontSize:   '9px',
        color:      MENU_COLOR.btnText,
      })
      .setOrigin(0.5)
      .setDepth(MENU_DEPTH.btnFg)
      .setInteractive({ useHandCursor: true })

    const enter = () => { bg.setFillStyle(MENU_COLOR.btnBgHover, 0.95); txt.setColor(MENU_COLOR.btnTextHvr) }
    const leave = () => { bg.setFillStyle(MENU_COLOR.btnBg,      0.88); txt.setColor(MENU_COLOR.btnText)    }
    const press = () => { bg.setFillStyle(MENU_COLOR.btnBgDown);        this.time.delayedCall(100, onClick)  }

    txt.on('pointerover', enter).on('pointerout', leave).on('pointerdown', press)

    // Propagate events from the bg rectangle so both the bg and label are clickable
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', enter).on('pointerout', leave).on('pointerdown', press)

    return txt
  }

  // ─── Ko-fi link ───────────────────────────────────────────────────────────

  private buildKofiLink(W: number, H: number): void {
    const link = this.add
      .text(W / 2, H - 18, STR[this.lang].support, {
        fontFamily: FONT.family,
        fontSize:   '7px',
        color:      MENU_COLOR.kofi,
      })
      .setOrigin(0.5, 1)
      .setDepth(MENU_DEPTH.ui)
      .setAlpha(0.75)
      .setInteractive({ useHandCursor: true })
      .setData('testid', 'link-kofi')

    link.on('pointerover',  () => { link.setAlpha(1).setColor(MENU_COLOR.kofiHover) })
    link.on('pointerout',   () => { link.setAlpha(0.75).setColor(MENU_COLOR.kofi)   })
    link.on('pointerdown',  () => { window.open(KOFI_URL, '_blank', 'noopener,noreferrer') })
  }

  // ─── DOM overlays (real data-testid for Playwright's getByTestId()) ────────
  // Invisible <button> elements sized and positioned to match each Phaser button.
  // Clicking them fires the same callback as the Phaser interactive objects.
  // Percentage-based positioning keeps them aligned when the canvas is scaled.

  private buildDomOverlays(W: number, H: number): void {
    const parent = this.game.canvas.parentElement
    if (!parent) return

    // Ensure the container has a positioning context for absolute children
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative'
    }

    const cx     = W / 2
    const startY = H * BTN_Y0_FRAC

    const add = (testId: string, cy: number, cb: () => void) => {
      const el = document.createElement('button')
      el.setAttribute('data-testid', testId)
      // Convert Phaser pixel coords to percentage of canvas size so the overlay
      // scales correctly when Phaser's scale manager resizes the canvas.
      const lPct = ((cx - BTN_W / 2) / W * 100).toFixed(3)
      const tPct = ((cy - BTN_H / 2) / H * 100).toFixed(3)
      const wPct = (BTN_W / W * 100).toFixed(3)
      const hPct = (BTN_H / H * 100).toFixed(3)
      el.style.cssText = [
        'position:absolute',
        `left:${lPct}%`, `top:${tPct}%`,
        `width:${wPct}%`, `height:${hPct}%`,
        'background:transparent', 'border:none',
        'cursor:pointer', 'z-index:999',
        'padding:0', 'opacity:0',
      ].join(';')
      el.addEventListener('click', cb)
      parent.appendChild(el)
      this.overlayBtns.push(el)
    }

    add('btn-play',        startY,              () => this.onPlay())
    add('btn-leaderboard', startY + BTN_GAP,    () => this.onLeaderboard())
    add('btn-language',    startY + BTN_GAP * 2, () => this.onLanguage())
  }

  private cleanupDom(): void {
    this.overlayBtns.forEach(b => b.remove())
    this.overlayBtns = []
  }

  // ─── Parallax ─────────────────────────────────────────────────────────────
  // Mouse/touch offset (–1…1) drives each layer's position.
  // Snow caps live in farLayer so they move automatically.

  private updateParallax(): void {
    const cx = this.scale.width  / 2
    const cy = this.scale.height / 2
    const px = (this.input.activePointer.x - cx) / cx
    const py = (this.input.activePointer.y - cy) / cy

    this.farLayer .setPosition(PARALLAX.far.x  * px, PARALLAX.far.y  * py)
    this.midLayer .setPosition(PARALLAX.mid.x  * px, PARALLAX.mid.y  * py)
    this.nearLayer.setPosition(PARALLAX.near.x * px, PARALLAX.near.y * py)
  }

  // ─── Button actions ───────────────────────────────────────────────────────

  private onPlay(): void {
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'))
  }

  private onLeaderboard(): void {
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('LeaderboardScene'))
  }

  private onLanguage(): void {
    this.lang = this.lang === 'en' ? 'ne' : 'en'
    localStorage.setItem('lang', this.lang)
    this.registry.set('lang', this.lang)  // other scenes can read this
    this.applyLanguage()
  }

  // ─── Language swap ────────────────────────────────────────────────────────
  // Called only from onLanguage() — all text objects already exist at that point.

  private applyLanguage(): void {
    const s    = STR[this.lang]
    const play = this.saveLevel > 0 ? s.cont(this.saveLevel) : s.play

    this.titleText.setText(s.title)
    this.subtitleText.setText(s.subtitle)
    this.btnPlay.setText(play)
    this.btnLeader.setText(s.leaderboard)
    this.btnLang.setText(s.language)
  }
}
