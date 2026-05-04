// src/ui/PauseMenu.ts — Pause overlay, key: 'PauseScene'
// Usage (from GameScene):
//   this.scene.launch('PauseScene', { uid, currentLevel, karma, npcsSaved, timeSeconds })
//   this.scene.pause()
// Resume restores GameScene's update loop; restart / quit stop it first.

import Phaser from 'phaser'
import { saveGame, loadGame } from '../firebase/api'
import {
  PAUSE_DEPTH, PAUSE_COLOR,
  MENU_COLOR, FONT,
} from '../styles/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'ne'

interface PauseData {
  uid:          string
  currentLevel: number
  karma:        number
  npcsSaved:    number
  timeSeconds:  number
}

// ─── Bilingual strings ────────────────────────────────────────────────────────

const STR: Record<Lang, {
  paused:   string
  resume:   string
  restart:  string
  saveQuit: string
  settings: string
  language: string
  langEn:   string
  langNe:   string
  back:     string
  saving:   string
  esc:      string
}> = {
  en: {
    paused:   'PAUSED',
    resume:   'Resume',
    restart:  'Restart Level',
    saveQuit: 'Save & Quit to Menu',
    settings: 'Settings',
    language: 'Language',
    langEn:   'English',
    langNe:   'नेपाली',
    back:     'Back',
    saving:   'Saving…',
    esc:      'ESC to resume',
  },
  ne: {
    paused:   'रोकिएको',
    resume:   'जारी राख्नुहोस्',
    restart:  'स्तर पुनः सुरु',
    saveQuit: 'सेभ गरी मेनुमा जानुहोस्',
    settings: 'सेटिङ',
    language: 'भाषा',
    langEn:   'English',
    langNe:   'नेपाली',
    back:     'पछाडि',
    saving:   'सेभ हुँदैछ…',
    esc:      'ESC — जारी',
  },
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const PW    = 320
const PH    = 290
const BTN_W = 230
const BTN_H = 36
const GAP   = 13

export class PauseMenu extends Phaser.Scene {
  private pauseData!:      PauseData
  private lang:            Lang = 'en'
  private mainPanel!:      Phaser.GameObjects.Container
  private settingsPanel!:  Phaser.GameObjects.Container
  private overlayBtns:     HTMLButtonElement[] = []
  private testIdDiv:       HTMLDivElement | null = null

  constructor() {
    super({ key: 'PauseScene' })
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  create(data: PauseData): void {
    this.pauseData = data
    this.lang      = (localStorage.getItem('lang') as Lang | null) ?? 'en'

    const W = this.scale.width
    const H = this.scale.height

    // Semi-transparent full-screen overlay
    this.add
      .rectangle(W / 2, H / 2, W, H, PAUSE_COLOR.overlayFill, 0.72)
      .setDepth(PAUSE_DEPTH.overlay)

    this.buildMainPanel(W, H)
    this.buildSettingsPanel(W, H)
    this.buildDomOverlays(W, H)

    // ESC key resumes — once only (re-registered each time scene is launched)
    this.input.keyboard!.addKey('ESC').once('down', this.onResume, this)

    // Slide-in reveal
    const targetY = this.mainPanel.y
    this.mainPanel.setAlpha(0).setY(targetY - 18)
    this.tweens.add({
      targets: this.mainPanel,
      alpha:   1,
      y:       targetY,
      duration: 180,
      ease:    'Power2',
    })

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this)
  }

  // ─── Main panel ─────────────────────────────────────────────────────────────

  private buildMainPanel(W: number, H: number): void {
    const s  = STR[this.lang]
    const cx = W / 2
    const cy = H / 2

    this.mainPanel = this.add.container(cx, cy).setDepth(PAUSE_DEPTH.panel)

    // Background card
    this.mainPanel.add(
      this.add.rectangle(0, 0, PW, PH, PAUSE_COLOR.panelBg, 0.97)
        .setStrokeStyle(1, PAUSE_COLOR.panelBorder, 0.8),
    )

    // Title
    this.mainPanel.add(
      this.add.text(0, -PH / 2 + 30, s.paused, {
        fontFamily: FONT.family, fontSize: '14px', color: PAUSE_COLOR.title,
      }).setOrigin(0.5),
    )

    // ESC hint at bottom
    this.mainPanel.add(
      this.add.text(0, PH / 2 - 14, s.esc, {
        fontFamily: FONT.family, fontSize: '7px', color: PAUSE_COLOR.subtitle,
      }).setOrigin(0.5),
    )

    // Four buttons stacked
    const totalH = 4 * BTN_H + 3 * GAP
    const startY = -totalH / 2 + BTN_H / 2 + 12

    const defs: [string, () => void][] = [
      [s.resume,   () => this.onResume()],
      [s.restart,  () => this.onRestart()],
      [s.saveQuit, () => { void this.onSaveAndQuit() }],
      [s.settings, () => this.openSettings()],
    ]

    defs.forEach(([label, cb], i) => {
      this.addPanelBtn(this.mainPanel, 0, startY + i * (BTN_H + GAP), BTN_W, BTN_H, label, cb)
    })
  }

  // ─── Settings sub-panel ─────────────────────────────────────────────────────

  private buildSettingsPanel(W: number, H: number): void {
    const s  = STR[this.lang]
    const cx = W / 2
    const cy = H / 2

    this.settingsPanel = this.add.container(cx, cy)
      .setDepth(PAUSE_DEPTH.panel)
      .setVisible(false)

    this.settingsPanel.add(
      this.add.rectangle(0, 0, PW, PH, PAUSE_COLOR.panelBg, 0.97)
        .setStrokeStyle(1, PAUSE_COLOR.panelBorder, 0.8),
    )

    this.settingsPanel.add(
      this.add.text(0, -PH / 2 + 30, s.settings, {
        fontFamily: FONT.family, fontSize: '12px', color: PAUSE_COLOR.title,
      }).setOrigin(0.5),
    )

    this.settingsPanel.add(
      this.add.text(0, -40, s.language, {
        fontFamily: FONT.family, fontSize: '8px', color: PAUSE_COLOR.subtitle,
      }).setOrigin(0.5),
    )

    // Language options
    const enBtn = this.add.text(-64, 0, s.langEn, {
      fontFamily: '"Noto Sans Devanagari", monospace',
      fontSize:   '10px',
      color:      this.lang === 'en' ? '#ffffff' : '#4a7090',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    const neBtn = this.add.text(64, 0, s.langNe, {
      fontFamily: '"Noto Sans Devanagari", monospace',
      fontSize:   '10px',
      color:      this.lang === 'ne' ? '#ffffff' : '#4a7090',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    enBtn.on('pointerdown', () => this.setLang('en', enBtn, neBtn))
    neBtn.on('pointerdown', () => this.setLang('ne', enBtn, neBtn))

    this.settingsPanel.add([enBtn, neBtn])

    // Back button
    this.addPanelBtn(
      this.settingsPanel,
      0, PH / 2 - BTN_H / 2 - 18,
      BTN_W, BTN_H,
      s.back,
      () => this.closeSettings(),
    )
  }

  private setLang(
    lang: Lang,
    enBtn: Phaser.GameObjects.Text,
    neBtn: Phaser.GameObjects.Text,
  ): void {
    this.lang = lang
    localStorage.setItem('lang', lang)
    enBtn.setColor(lang === 'en' ? '#ffffff' : '#4a7090')
    neBtn.setColor(lang === 'ne' ? '#ffffff' : '#4a7090')
  }

  private openSettings(): void {
    this.mainPanel.setVisible(false)
    this.settingsPanel.setVisible(true)
  }

  private closeSettings(): void {
    this.settingsPanel.setVisible(false)
    this.mainPanel.setVisible(true)
  }

  // ─── Button factory ─────────────────────────────────────────────────────────

  private addPanelBtn(
    container: Phaser.GameObjects.Container,
    x: number, y: number, w: number, h: number,
    label:   string,
    onClick: () => void,
  ): void {
    const bg = this.add
      .rectangle(x, y, w, h, MENU_COLOR.btnBg, 0.90)
      .setStrokeStyle(1, MENU_COLOR.btnBorder, 0.7)

    const txt = this.add
      .text(x, y, label, {
        fontFamily: FONT.family, fontSize: '8px', color: MENU_COLOR.btnText,
      })
      .setOrigin(0.5)

    const enter = () => { bg.setFillStyle(MENU_COLOR.btnBgHover, 0.95); txt.setColor(MENU_COLOR.btnTextHvr) }
    const leave = () => { bg.setFillStyle(MENU_COLOR.btnBg,      0.90); txt.setColor(MENU_COLOR.btnText)    }
    const press = () => { bg.setFillStyle(MENU_COLOR.btnBgDown);         this.time.delayedCall(80, onClick)  }

    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', enter).on('pointerout', leave).on('pointerdown', press)
    txt.setInteractive({ useHandCursor: true })
      .on('pointerover', enter).on('pointerout', leave).on('pointerdown', press)

    container.add([bg, txt])
  }

  // ─── DOM overlays (Playwright data-testid) ───────────────────────────────────

  private buildDomOverlays(W: number, H: number): void {
    const parent = this.game.canvas.parentElement
    if (!parent) return
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative'

    // Wrapper div carries the top-level pause-menu testid
    this.testIdDiv = document.createElement('div')
    this.testIdDiv.setAttribute('data-testid', 'pause-menu')
    this.testIdDiv.style.cssText =
      'position:absolute;inset:0;pointer-events:none;z-index:998'
    parent.appendChild(this.testIdDiv)

    const cx     = W / 2
    const cy     = H / 2
    const totalH = 4 * BTN_H + 3 * GAP
    const startY = cy - totalH / 2 + BTN_H / 2 + 12

    const defs: [string, number, () => void][] = [
      ['btn-pause-resume',   0, () => this.onResume()],
      ['btn-pause-restart',  1, () => this.onRestart()],
      ['btn-pause-quit',     2, () => { void this.onSaveAndQuit() }],
      ['btn-pause-settings', 3, () => this.openSettings()],
    ]

    defs.forEach(([testId, i, cb]) => {
      const lx = cx - BTN_W / 2
      const ly = startY + i * (BTN_H + GAP) - BTN_H / 2

      const el = document.createElement('button')
      el.setAttribute('data-testid', testId)
      el.style.cssText = [
        'position:absolute',
        `left:${(lx / W * 100).toFixed(3)}%`,
        `top:${(ly / H * 100).toFixed(3)}%`,
        `width:${(BTN_W / W * 100).toFixed(3)}%`,
        `height:${(BTN_H / H * 100).toFixed(3)}%`,
        'background:transparent', 'border:none',
        'cursor:pointer', 'z-index:999', 'padding:0', 'opacity:0',
      ].join(';')

      el.addEventListener('click', cb)
      this.testIdDiv!.appendChild(el)
      this.overlayBtns.push(el)
    })
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  private onResume(): void {
    this.scene.resume('GameScene')
    this.scene.stop()
  }

  private onRestart(): void {
    this.scene.stop('GameScene')
    this.scene.start('GameScene')
  }

  private async onSaveAndQuit(): Promise<void> {
    const { uid, currentLevel, karma, npcsSaved, timeSeconds } = this.pauseData

    try {
      const existing = await loadGame(uid, 0)
      await saveGame(uid, 0, {
        currentLevel,
        karma,
        summitedMountains: existing?.summitedMountains ?? [],
        oxygenCaches:      existing?.oxygenCaches      ?? 0,
        yetiFootprints:    existing?.yetiFootprints     ?? 0,
        npcsSaved:         (existing?.npcsSaved         ?? 0) + npcsSaved,
        totalPlaytime:     (existing?.totalPlaytime     ?? 0) + timeSeconds,
      })
    } catch { /* offline — Firestore queues for sync on reconnect */ }

    this.scene.stop('GameScene')
    this.scene.start('MainMenuScene')
  }

  private onShutdown(): void {
    this.overlayBtns.forEach(b => b.remove())
    this.overlayBtns = []
    this.testIdDiv?.remove()
    this.testIdDiv = null
  }
}
