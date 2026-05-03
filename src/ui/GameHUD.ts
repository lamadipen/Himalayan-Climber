import Phaser from 'phaser'
import type { Player }                    from '../entities/Player'
import type { AltitudeSystem }            from '../engine/AltitudeSystem'
import type { KarmaSystem }               from '../engine/KarmaSystem'
import type { WeatherSystem, WeatherState } from '../engine/WeatherSystem'
import {
  ALTITUDE_VERY_HIGH,
  ALTITUDE_DEATH_ZONE,
  OXYGEN_LOW_THRESHOLD,
} from '../config/balance'
import { HUD_DEPTH, HUD_SF, COLOR, FONT, BAR, LAYOUT } from '../styles/tokens'

// ─── Playwright test surface ───────────────────────────────────────────────────
// Canvas elements cannot carry HTML data-testid attributes, so we maintain a
// plain-object mirror on window that Playwright can read via page.evaluate():
//   const o2 = await page.evaluate(() => window.__hudState?.oxygen)
// Individual Phaser objects also carry .getData('testid') for in-engine tooling.
declare global {
  interface Window {
    __hudState?: {
      oxygen:   number        // 0–100
      health:   number        // 0–1
      altitude: number        // metres
      karma:    number
      weather:  WeatherState
    }
  }
}

// ─── Internal constants ────────────────────────────────────────────────────────
const PHASER_FONT: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: FONT.family,
  fontSize:   FONT.size,
  color:      FONT.color,
}

const WEATHER_CFG: Record<WeatherState, { label: string; color: string }> = {
  clear:    { label: '☀ Clear',    color: COLOR.weatherClear    },
  cloud:    { label: '☁ Cloud',    color: COLOR.weatherCloud    },
  blizzard: { label: '❄ Blizzard', color: COLOR.weatherBlizzard },
  storm:    { label: '⛈ Storm',    color: COLOR.weatherStorm    },
}

export class GameHUD {
  private readonly scene:  Phaser.Scene
  private readonly player: Player

  // Graphics — cleared and redrawn every frame for smooth bar fill animation
  private readonly oxygenGfx:   Phaser.GameObjects.Graphics
  private readonly healthGfx:   Phaser.GameObjects.Graphics

  private readonly o2Label:     Phaser.GameObjects.Text
  private readonly altText:     Phaser.GameObjects.Text
  private readonly karmaText:   Phaser.GameObjects.Text
  private readonly weatherText: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene  = scene
    this.player = player

    const rightX = scene.scale.width - LAYOUT.rightPad

    // ── O₂ label ───────────────────────────────────────────────────────────────
    // Sits in the 16 px gap left of BAR.x; at 8 px Press-Start-2P 'O₂' = ~16 px.
    this.o2Label = scene.add
      .text(0, LAYOUT.o2Y, 'O₂', PHASER_FONT)
      .setScrollFactor(HUD_SF).setDepth(HUD_DEPTH)
      .setData('testid', 'hud-o2-label')

    // ── Oxygen bar ─────────────────────────────────────────────────────────────
    this.oxygenGfx = scene.add.graphics()
      .setScrollFactor(HUD_SF).setDepth(HUD_DEPTH)
      .setData('testid', 'hud-oxygen-bar')

    // ── Health bar ─────────────────────────────────────────────────────────────
    this.healthGfx = scene.add.graphics()
      .setScrollFactor(HUD_SF).setDepth(HUD_DEPTH)
      .setData('testid', 'hud-health-bar')

    // ── Altitude text ──────────────────────────────────────────────────────────
    this.altText = scene.add
      .text(BAR.x, LAYOUT.altY, '0 m', PHASER_FONT)
      .setScrollFactor(HUD_SF).setDepth(HUD_DEPTH)
      .setData('testid', 'hud-altitude')

    // ── Karma counter — top-right, right-aligned ───────────────────────────────
    this.karmaText = scene.add
      .text(rightX, LAYOUT.karmaY, '◆ 0', { ...PHASER_FONT, color: COLOR.karma })
      .setOrigin(1, 0)
      .setScrollFactor(HUD_SF).setDepth(HUD_DEPTH)
      .setData('testid', 'hud-karma')

    // ── Weather icon — below karma, right-aligned ──────────────────────────────
    this.weatherText = scene.add
      .text(rightX, LAYOUT.weatherY, WEATHER_CFG.clear.label, {
        ...PHASER_FONT,
        color: WEATHER_CFG.clear.color,
      })
      .setOrigin(1, 0)
      .setScrollFactor(HUD_SF).setDepth(HUD_DEPTH)
      .setData('testid', 'hud-weather')

    // ── Events ─────────────────────────────────────────────────────────────────
    // karma-changed: only the pop tween — karma text value is polled in update().
    // weather-changed: dropped — weather is polled from WeatherSystem in update()
    //   so the icon stays correct even if an event was missed (e.g. scene restart).
    scene.events.on('karma-changed', this.onKarmaPopped, this)
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  // Called each frame from GameScene.update(). Reads live state from all three
  // systems so the HUD is always consistent with gameplay, regardless of whether
  // events were received. Also updates window.__hudState for Playwright.
  update(
    altitudeSystem: AltitudeSystem,
    karmaSystem:    KarmaSystem,
    weatherSystem:  WeatherSystem,
  ): void {
    const oxygen   = altitudeSystem.getOxygen()
    const altitude = altitudeSystem.getCurrentAltitude()
    const health   = this.player.healthPercent
    const karma    = karmaSystem.getKarma()
    const weather  = weatherSystem.getCurrentWeather()

    this.drawOxygenBar(oxygen)
    this.drawHealthBar(health)
    this.updateAltitude(altitude)
    this.karmaText.setText(`◆ ${karma}`)
    this.updateWeather(weather)

    // Playwright test surface — updated every frame so reads are always fresh.
    window.__hudState = { oxygen, health, altitude, karma, weather }
  }

  // Call from GameScene shutdown / scene transition to clean up listeners.
  destroy(): void {
    this.scene.events.off('karma-changed', this.onKarmaPopped, this)
    this.oxygenGfx.destroy()
    this.healthGfx.destroy()
    this.o2Label.destroy()
    this.altText.destroy()
    this.karmaText.destroy()
    this.weatherText.destroy()
    // Clear stale state so Playwright reads after scene end return undefined.
    window.__hudState = undefined
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private drawOxygenBar(oxygen: number): void {
    const pct = Math.max(0, Math.min(100, oxygen)) / 100

    const color = pct > 0.50
      ? COLOR.oxygenHigh
      : pct > OXYGEN_LOW_THRESHOLD / 100
        ? COLOR.oxygenMid
        : COLOR.oxygenLow

    this.oxygenGfx.clear()
    this.oxygenGfx.fillStyle(COLOR.barBg)
    this.oxygenGfx.fillRect(BAR.x, LAYOUT.o2Y, BAR.w, BAR.h)
    this.oxygenGfx.fillStyle(color)
    this.oxygenGfx.fillRect(BAR.x + 1, LAYOUT.o2Y + 1, (BAR.w - 2) * pct, BAR.h - 2)
  }

  private drawHealthBar(healthPercent: number): void {
    const fill = Math.max(0, Math.min(1, healthPercent))
    this.healthGfx.clear()
    this.healthGfx.fillStyle(COLOR.barBg)
    this.healthGfx.fillRect(BAR.x, LAYOUT.hpY, BAR.w, BAR.h)
    this.healthGfx.fillStyle(COLOR.health)
    this.healthGfx.fillRect(BAR.x + 1, LAYOUT.hpY + 1, (BAR.w - 2) * fill, BAR.h - 2)
  }

  private updateAltitude(altitude: number): void {
    const color = altitude >= ALTITUDE_DEATH_ZONE ? COLOR.altRed
                : altitude >= ALTITUDE_VERY_HIGH  ? COLOR.altAmber
                : COLOR.altNormal

    this.altText
      .setText(Math.round(altitude).toLocaleString('en-US') + ' m')
      .setColor(color)
  }

  private updateWeather(state: WeatherState): void {
    const cfg = WEATHER_CFG[state]
    // setText/setColor are no-ops when value is unchanged — safe to call every frame.
    this.weatherText.setText(cfg.label).setColor(cfg.color)
  }

  // Fires the pop tween when karma changes; the actual text value is set in
  // update() so we never display a stale number if the event and frame are out
  // of sync.
  private onKarmaPopped(): void {
    this.scene.tweens.add({
      targets:  this.karmaText,
      scaleX:   1.2,
      scaleY:   1.2,
      duration: 80,
      yoyo:     true,
      ease:     'Power2',
    })
  }
}
