// src/ui/GameOverScreen.ts — key: 'GameOverScene'
// Received data: { cause, altitude, karma, timeSeconds }
// Re-exported from src/scenes/GameOverScene.ts so GameLoop.ts picks it up.

import Phaser from 'phaser'
import {
  GAMEOVER_DEPTH, GAMEOVER_COLOR,
  MENU_COLOR, FONT,
} from '../styles/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'ne'
type Cause = 'oxygen' | 'avalanche' | 'fall' | 'yak' | string

interface GameOverData {
  cause:       Cause
  altitude:    number
  karma:       number
  timeSeconds: number
}

// ─── Bilingual strings ────────────────────────────────────────────────────────

const CAUSE_MSG: Record<string, Record<Lang, string>> = {
  oxygen: {
    en: 'You succumbed to altitude sickness',
    ne: 'तपाईं उचाइ रोगले ग्रस्त हुनुभयो',
  },
  avalanche: {
    en: 'Swept away by the mountain',
    ne: 'हिमपहिरोले बगायो',
  },
  fall: {
    en: 'Lost to the depths',
    ne: 'गहिराइमा हरायो',
  },
  yak: {
    en: 'Charged off the path',
    ne: 'याकले बाटोबाट धकेल्यो',
  },
}

const STR: Record<Lang, {
  title:     string
  altitude:  string
  time:      string
  karma:     string
  tryAgain:  string
  mainMenu:  string
}> = {
  en: {
    title:    'GAME OVER',
    altitude: 'Altitude reached',
    time:     'Time',
    karma:    'Karma',
    tryAgain: 'Try Again',
    mainMenu: 'Main Menu',
  },
  ne: {
    title:    'खेल समाप्त',
    altitude: 'पुगिएको उचाइ',
    time:     'समय',
    karma:    'कर्म',
    tryAgain: 'फेरि प्रयास',
    mainMenu: 'मुख्य मेनु',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getCauseMsg(cause: Cause, lang: Lang): string {
  return (CAUSE_MSG[cause] ?? CAUSE_MSG.fall)[lang]
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export class GameOverScreen extends Phaser.Scene {
  private overlayBtns: HTMLButtonElement[] = []

  constructor() {
    super({ key: 'GameOverScene' })
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  create(data: GameOverData): void {
    const lang:        Lang   = (localStorage.getItem('lang') as Lang | null) ?? 'en'
    const s                   = STR[lang]
    const causeMsg            = getCauseMsg(data.cause ?? 'fall', lang)
    const timeStr             = formatTime(data.timeSeconds ?? 0)
    const altitude            = Math.round(data.altitude ?? 0)

    const W = this.scale.width
    const H = this.scale.height

    this.buildBackground(W, H)
    this.buildText(W, H, s, causeMsg, altitude, timeStr, data.karma ?? 0, lang)
    this.buildButtons(W, H, s)
    this.buildDomOverlays(W, H, s)

    this.cameras.main.fadeIn(600, 0, 0, 0)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this)
  }

  // ─── Background ─────────────────────────────────────────────────────────────

  private buildBackground(W: number, H: number): void {
    // Near-black sky
    this.add.rectangle(W / 2, H / 2, W, H, GAMEOVER_COLOR.sky)
      .setDepth(GAMEOVER_DEPTH.bg)

    // Red-tinted vignette bands emanating from top — death-zone atmosphere
    const gfx = this.add.graphics().setDepth(GAMEOVER_DEPTH.bg + 1)
    for (let i = 0; i < 6; i++) {
      gfx.fillStyle(0x330000, 0.06 - i * 0.008)
      gfx.fillRect(0, i * 18, W, 22)
    }

    // Mountain silhouette — darker and more jagged than summit screen
    const mtn = this.add.graphics().setDepth(GAMEOVER_DEPTH.mtn)
    mtn.fillStyle(GAMEOVER_COLOR.mtn)
    mtn.fillPoints([
      { x: 0,   y: H },
      { x: 0,   y: H * 0.70 },
      { x: 80,  y: H * 0.62 },
      { x: 200, y: H * 0.72 },
      { x: 340, y: H * 0.55 },
      { x: 480, y: H * 0.65 },
      { x: 580, y: H * 0.52 },
      { x: 700, y: H * 0.63 },
      { x: 830, y: H * 0.58 },
      { x: W,   y: H * 0.68 },
      { x: W,   y: H },
    ], true)
  }

  // ─── Text elements ──────────────────────────────────────────────────────────

  private buildText(
    W:        number,
    H:        number,
    s:        typeof STR['en'],
    causeMsg: string,
    altitude: number,
    timeStr:  string,
    karma:    number,
    lang:     Lang,
  ): void {
    const cx = W / 2

    // "GAME OVER" title — starts invisible, fades in first
    const title = this.add.text(cx, H * 0.20, s.title, {
      fontFamily: FONT.family,
      fontSize:   '22px',
      color:      GAMEOVER_COLOR.title,
      stroke:     '#080808',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(GAMEOVER_DEPTH.text).setAlpha(0)

    // Death cause message — Devanagari-safe font
    const cause = this.add.text(cx, H * 0.34, causeMsg, {
      fontFamily: '"Noto Sans Devanagari", sans-serif',
      fontSize:   '13px',
      color:      GAMEOVER_COLOR.causeText,
    }).setOrigin(0.5).setDepth(GAMEOVER_DEPTH.text).setAlpha(0)

    // Stats
    const altLabel  = `${s.altitude}: ${altitude.toLocaleString()}m`
    const timeLabel = `${s.time}: ${timeStr}`
    const karmaLabel = `${s.karma}: ${karma} ♦`

    const statStyle = { fontFamily: FONT.family, fontSize: '9px' }

    const altTxt = this.add.text(cx, H * 0.46, altLabel, {
      ...statStyle, color: GAMEOVER_COLOR.altColor,
    }).setOrigin(0.5).setDepth(GAMEOVER_DEPTH.text).setAlpha(0)

    const timeTxt = this.add.text(cx, H * 0.54, timeLabel, {
      ...statStyle, color: GAMEOVER_COLOR.statLabel,
    }).setOrigin(0.5).setDepth(GAMEOVER_DEPTH.text).setAlpha(0)

    const karmaTxt = this.add.text(cx, H * 0.62, karmaLabel, {
      ...statStyle, color: GAMEOVER_COLOR.karmaColor,
    }).setOrigin(0.5).setDepth(GAMEOVER_DEPTH.text).setAlpha(0)

    // Staggered fade-in after camera fade completes
    const elements = [title, cause, altTxt, timeTxt, karmaTxt]
    elements.forEach((el, i) => {
      this.tweens.add({
        targets:  el,
        alpha:    1,
        duration: 400,
        delay:    650 + i * 160,
        ease:     'Power2',
      })
    })

    void lang  // lang is available for future localisation of number formatting
  }

  // ─── Buttons ────────────────────────────────────────────────────────────────

  private buildButtons(W: number, H: number, s: typeof STR['en']): void {
    const btnW   = 180
    const btnH   = 36
    const gap    = 20
    const totalW = btnW * 2 + gap
    const startX = W / 2 - totalW / 2 + btnW / 2
    const y      = H * 0.80

    this.makeBtn(startX,       y, btnW, btnH, s.tryAgain, () => this.onTryAgain())
    this.makeBtn(startX + btnW + gap, y, btnW, btnH, s.mainMenu, () => this.onMainMenu())
  }

  private makeBtn(
    cx: number, cy: number, w: number, h: number,
    label:   string,
    onClick: () => void,
  ): void {
    const bg = this.add
      .rectangle(cx, cy, w, h, MENU_COLOR.btnBg, 0.90)
      .setStrokeStyle(1, MENU_COLOR.btnBorder, 0.7)
      .setDepth(GAMEOVER_DEPTH.btns)
      .setAlpha(0)

    const txt = this.add
      .text(cx, cy, label, {
        fontFamily: FONT.family, fontSize: '8px', color: MENU_COLOR.btnText,
      })
      .setOrigin(0.5)
      .setDepth(GAMEOVER_DEPTH.btns + 1)
      .setAlpha(0)

    // Buttons reveal after stats have faded in
    this.tweens.add({ targets: [bg, txt], alpha: 1, duration: 350, delay: 1600, ease: 'Power2' })

    const enter = () => { bg.setFillStyle(MENU_COLOR.btnBgHover, 0.95); txt.setColor(MENU_COLOR.btnTextHvr) }
    const leave = () => { bg.setFillStyle(MENU_COLOR.btnBg,      0.90); txt.setColor(MENU_COLOR.btnText)    }
    const press = () => { bg.setFillStyle(MENU_COLOR.btnBgDown);         this.time.delayedCall(80, onClick)  }

    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', enter).on('pointerout', leave).on('pointerdown', press)
    txt.setInteractive({ useHandCursor: true })
      .on('pointerover', enter).on('pointerout', leave).on('pointerdown', press)
  }

  // ─── DOM overlays (Playwright data-testid) ───────────────────────────────────

  private buildDomOverlays(W: number, H: number, s: typeof STR['en']): void {
    const parent = this.game.canvas.parentElement
    if (!parent) return
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative'

    const btnW   = 180
    const btnH   = 36
    const gap    = 20
    const totalW = btnW * 2 + gap
    const startLX = W / 2 - totalW / 2
    const ly      = H * 0.80 - btnH / 2

    const defs: [string, string, number, () => void][] = [
      ['btn-gameover-retry', s.tryAgain,  startLX,               () => this.onTryAgain()],
      ['btn-gameover-menu',  s.mainMenu,  startLX + btnW + gap,   () => this.onMainMenu()],
    ]

    defs.forEach(([testId, , lx, cb]) => {
      const el = document.createElement('button')
      el.setAttribute('data-testid', testId)
      el.style.cssText = [
        'position:absolute',
        `left:${(lx / W * 100).toFixed(3)}%`,
        `top:${(ly / H * 100).toFixed(3)}%`,
        `width:${(btnW / W * 100).toFixed(3)}%`,
        `height:${(btnH / H * 100).toFixed(3)}%`,
        'background:transparent', 'border:none',
        'cursor:pointer', 'z-index:999', 'padding:0', 'opacity:0',
      ].join(';')

      el.addEventListener('click', cb)
      parent.appendChild(el)
      this.overlayBtns.push(el)
    })
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  private onTryAgain(): void {
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'))
  }

  private onMainMenu(): void {
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenuScene'))
  }

  private onShutdown(): void {
    this.overlayBtns.forEach(b => b.remove())
    this.overlayBtns = []
  }
}
