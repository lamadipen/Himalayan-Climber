import type { LeaderboardEntry } from '../types'

interface GameRef {
  startLevel(id: number): void
  setState(screen: string): void
  showLeaderboard(levelId: number): void
  state: { playerName: string; currentLevel: number }
  leaderboard: { saveEntry(e: LeaderboardEntry): void; getEntries(id: number): LeaderboardEntry[] }
}

export class SummitScreen {
  private el: HTMLDivElement

  constructor(private game: GameRef) {
    this.el = document.createElement('div')
    this.el.id = 'summit-screen'
    this.el.style.cssText = `
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      z-index: 40;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    `
    document.getElementById('ui')!.appendChild(this.el)
  }

  show(elapsed: number, levelId: number): void {
    this.el.style.display = 'flex'

    const levelNames: Record<number, string> = {
      1: 'Langtang Valley',
      2: 'Annapurna Sanctuary',
      3: 'Manaslu Summit Ridge',
      4: 'Cho Oyu Death Zone',
      5: 'Everest South Col',
    }

    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
    const secs = String(Math.floor(elapsed % 60)).padStart(2, '0')
    const cs = String(Math.floor((elapsed % 1) * 100)).padStart(2, '0')
    const timeStr = `${mins}:${secs}.${cs}`

    // Check personal best
    const prev = this.game.leaderboard.getEntries(levelId)
    const pb = prev.length > 0 ? prev[0].time : null
    const pbStr = pb != null ? (() => {
      const pm = String(Math.floor(pb / 60)).padStart(2, '0')
      const ps = String(Math.floor(pb % 60)).padStart(2, '0')
      const pc = String(Math.floor((pb % 1) * 100)).padStart(2, '0')
      return `${pm}:${ps}.${pc}`
    })() : null
    const isNewBest = pb === null || elapsed < pb

    const savedName = localStorage.getItem('himalayan_name') || this.game.state.playerName || ''

    const nextBtn = levelId < 5
      ? `<button onclick="window.himalayaGame.startLevel(${levelId + 1})"
          style="background:rgba(204,34,0,0.5);border:1px solid #CC2200;color:#FFD700;
          font-family:monospace;font-size:14px;padding:12px 32px;cursor:pointer;
          border-radius:4px;letter-spacing:0.2em;margin:6px">
          NEXT MOUNTAIN &#8594;
        </button><br>`
      : `<div style="color:#FFD700;font-size:13px;letter-spacing:0.2em;margin:12px 0">
          &#127937; ALL SUMMITS CONQUERED &#127937;
        </div>`

    this.el.innerHTML = `
      <div style="text-align:center;padding:2rem;max-width:500px">
        <div style="font-size:3rem;margin-bottom:0.5rem">&#127942;</div>
        <h2 style="color:#FFD700;font-family:monospace;letter-spacing:0.4em;font-size:1.6rem;margin-bottom:0.4rem">
          SUMMIT REACHED!
        </h2>
        <h3 style="color:#CC2200;font-family:monospace;letter-spacing:0.2em;font-size:1rem;margin-bottom:1.5rem">
          ${(levelNames[levelId] || '').toUpperCase()}
        </h3>

        <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:1.2rem;margin-bottom:1.5rem">
          <div style="color:#aaa;font-family:monospace;font-size:12px;letter-spacing:0.2em;margin-bottom:4px">
            YOUR TIME
          </div>
          <div style="color:#22CC44;font-family:monospace;font-size:2rem;letter-spacing:0.1em">
            ${timeStr}
          </div>
          ${isNewBest
            ? `<div style="color:#FFD700;font-size:12px;font-family:monospace;margin-top:6px;letter-spacing:0.15em">
                &#11088; PERSONAL BEST!
              </div>`
            : pbStr
              ? `<div style="color:#888;font-size:12px;font-family:monospace;margin-top:6px">
                  Best: ${pbStr}
                </div>`
              : ''
          }
        </div>

        <!-- Save name -->
        <div id="summit-name-wrap" style="margin-bottom:1.2rem">
          <input id="summit-name-input" type="text" placeholder="Enter your name to save"
            value="${savedName}"
            style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);
            color:#fff;font-family:monospace;font-size:13px;padding:8px 14px;border-radius:4px;
            outline:none;text-align:center;width:220px;letter-spacing:0.1em"
          />
          <br>
          <button onclick="window._summitSave(${elapsed},${levelId})"
            style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
            color:#aaa;font-family:monospace;font-size:12px;padding:6px 20px;cursor:pointer;
            border-radius:4px;margin-top:6px;letter-spacing:0.12em">
            SAVE SCORE
          </button>
        </div>

        ${nextBtn}

        <button onclick="window.himalayaGame.showLeaderboard(${levelId})"
          style="background:transparent;border:1px solid rgba(255,255,255,0.15);color:#aaa;
          font-family:monospace;font-size:13px;padding:10px 24px;cursor:pointer;
          border-radius:4px;letter-spacing:0.15em;margin:4px">
          VIEW LEADERBOARD
        </button>
        <br>
        <button onclick="window.himalayaGame.setState('menu')"
          style="background:transparent;border:none;color:#555;font-family:monospace;
          font-size:12px;padding:8px 16px;cursor:pointer;letter-spacing:0.15em;margin-top:4px">
          MAIN MENU
        </button>
      </div>
    `

    // Save helper on window
    ;(window as any)._summitSave = (time: number, level: number) => {
      const input = document.getElementById('summit-name-input') as HTMLInputElement
      const name = (input?.value || 'Anonymous').trim()
      localStorage.setItem('himalayan_name', name)
      this.game.state.playerName = name
      this.game.leaderboard.saveEntry({
        name,
        time,
        level,
        date: new Date().toISOString(),
      })
      const wrap = document.getElementById('summit-name-wrap')
      if (wrap) wrap.innerHTML = `<div style="color:#22CC44;font-family:monospace;font-size:12px;letter-spacing:0.15em">&#10003; SAVED</div>`
    }

    // Auto-save with existing name
    if (savedName) {
      this.game.leaderboard.saveEntry({
        name: savedName,
        time: elapsed,
        level: levelId,
        date: new Date().toISOString(),
      })
    }
  }

  hide(): void {
    this.el.style.display = 'none'
  }
}
