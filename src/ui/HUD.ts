import type { GameState, LevelConfig } from '../types'

export class HUD {
  private el: HTMLElement
  private flashTimeout: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.el = document.getElementById('hud')!
  }

  show(): void {
    this.el.style.display = 'block'
    this.el.innerHTML = `
      <style>
        #hud-altitude {
          position: fixed;
          top: 16px;
          left: 16px;
          color: #fff;
          font-family: monospace;
          font-size: 14px;
          background: rgba(0,0,0,0.55);
          padding: 6px 12px;
          border-radius: 4px;
          border-left: 3px solid #CC2200;
          letter-spacing: 0.05em;
          pointer-events: none;
        }
        #hud-timer {
          position: fixed;
          top: 16px;
          right: 16px;
          color: #FFD700;
          font-family: monospace;
          font-size: 18px;
          background: rgba(0,0,0,0.55);
          padding: 6px 14px;
          border-radius: 4px;
          letter-spacing: 0.1em;
          pointer-events: none;
        }
        #hud-level-name {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          color: #fff;
          font-family: monospace;
          font-size: 13px;
          background: rgba(0,0,0,0.55);
          padding: 6px 14px;
          border-radius: 4px;
          letter-spacing: 0.2em;
          pointer-events: none;
          white-space: nowrap;
        }
        #hud-oxygen-wrap {
          position: fixed;
          bottom: 20px;
          left: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: none;
        }
        #hud-oxygen-label {
          color: #fff;
          font-family: monospace;
          font-size: 13px;
          background: rgba(0,0,0,0.55);
          padding: 4px 8px;
          border-radius: 4px;
        }
        #hud-oxygen-bar {
          width: 120px;
          height: 10px;
          background: rgba(255,255,255,0.15);
          border-radius: 5px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.2);
        }
        #hud-oxygen-fill {
          height: 100%;
          width: 100%;
          border-radius: 5px;
          transition: width 0.3s ease, background 0.3s ease;
          background: linear-gradient(90deg, #CC2200, #22CC44);
        }
        #hud-lives {
          position: fixed;
          bottom: 20px;
          right: 16px;
          color: #CC2200;
          font-size: 22px;
          background: rgba(0,0,0,0.55);
          padding: 4px 12px;
          border-radius: 4px;
          letter-spacing: 0.15em;
          pointer-events: none;
        }
        #hud-flash {
          position: fixed;
          top: 60px;
          left: 50%;
          transform: translateX(-50%);
          color: #FFD700;
          font-family: monospace;
          font-size: 16px;
          background: rgba(0,0,0,0.75);
          padding: 8px 20px;
          border-radius: 6px;
          letter-spacing: 0.2em;
          pointer-events: none;
          border: 1px solid rgba(255,215,0,0.4);
        }
        #hud-sickness {
          position: fixed;
          bottom: 50px;
          left: 16px;
          color: #88aaff;
          font-family: monospace;
          font-size: 11px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
      </style>
      <div id="hud-altitude">ALT: 0m</div>
      <div id="hud-timer">00:00.00</div>
      <div id="hud-level-name">LANGTANG VALLEY</div>
      <div id="hud-oxygen-wrap">
        <div id="hud-oxygen-label">O&#x2082;</div>
        <div id="hud-oxygen-bar">
          <div id="hud-oxygen-fill"></div>
        </div>
      </div>
      <div id="hud-lives">&#9829; &#9829; &#9829;</div>
      <div id="hud-flash" style="display:none"></div>
      <div id="hud-sickness">ALTITUDE SICKNESS</div>
    `
  }

  hide(): void {
    this.el.style.display = 'none'
  }

  flash(msg: string): void {
    const el = document.getElementById('hud-flash')
    if (!el) return
    el.textContent = msg
    el.style.display = 'block'
    if (this.flashTimeout) clearTimeout(this.flashTimeout)
    this.flashTimeout = setTimeout(() => {
      el.style.display = 'none'
    }, 2000)
  }

  update(state: GameState, timerStr: string, levelConfig?: LevelConfig): void {
    const altEl = document.getElementById('hud-altitude')
    if (altEl && levelConfig) {
      altEl.textContent = `ALT: ${levelConfig.altitudeMeters.toLocaleString()}m`
    }

    const timerEl = document.getElementById('hud-timer')
    if (timerEl) timerEl.textContent = timerStr

    const nameEl = document.getElementById('hud-level-name')
    if (nameEl && levelConfig) {
      nameEl.textContent = levelConfig.name.toUpperCase()
    }

    const fillEl = document.getElementById('hud-oxygen-fill')
    if (fillEl) {
      const pct = Math.max(0, Math.min(1, state.oxygen))
      fillEl.style.width = `${pct * 100}%`
      // Color from red to green
      const r = Math.round(204 - pct * 170)
      const g = Math.round(pct * 204)
      fillEl.style.background = `rgb(${r},${g},0)`
    }

    const livesEl = document.getElementById('hud-lives')
    if (livesEl) {
      livesEl.innerHTML = Array.from({ length: state.lives }, () => '&#9829;').join(' ')
    }

    // Altitude sickness indicator
    const sicknessEl = document.getElementById('hud-sickness')
    if (sicknessEl) {
      sicknessEl.style.opacity = state.altitudeSickness > 0.3 ? String(state.altitudeSickness) : '0'
    }
  }
}
