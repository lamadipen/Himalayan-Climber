import type { LeaderboardEntry } from '../types'

const LS_KEY = 'himalayan_lb'
const MEDALS = ['&#127945;', '&#129352;', '&#129353;'] // gold, silver, bronze

export class Leaderboard {
  private el: HTMLDivElement

  constructor() {
    this.el = document.createElement('div')
    this.el.id = 'leaderboard-screen'
    this.el.style.cssText = `
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.93);
      z-index: 40;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      overflow-y: auto;
    `
    document.getElementById('ui')!.appendChild(this.el)
  }

  show(levelId: number): void {
    this.el.style.display = 'flex'
    this.render(levelId)
  }

  hide(): void {
    this.el.style.display = 'none'
  }

  saveEntry(entry: LeaderboardEntry): void {
    const all = this.loadAll()
    all.push(entry)
    localStorage.setItem(LS_KEY, JSON.stringify(all))
  }

  getEntries(levelId: number): LeaderboardEntry[] {
    return this.loadAll()
      .filter(e => e.level === levelId)
      .sort((a, b) => a.time - b.time)
  }

  private loadAll(): LeaderboardEntry[] {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    } catch {
      return []
    }
  }

  private render(levelId: number): void {
    const tabs = [1, 2, 3, 4, 5].map(id => {
      const active = id === levelId ? 'background:rgba(204,34,0,0.3);border-bottom:2px solid #CC2200;' : ''
      return `<button onclick="window.himalayaGame.showLeaderboard(${id})"
        style="background:transparent;border:none;color:${id === levelId ? '#FFD700' : '#aaa'};
        font-family:monospace;font-size:13px;padding:8px 16px;cursor:pointer;letter-spacing:0.1em;${active}">
        LVL ${id}</button>`
    }).join('')

    const entries = this.getEntries(levelId).slice(0, 10)
    const rows = entries.length === 0
      ? `<tr><td colspan="4" style="text-align:center;color:#555;padding:20px">No records yet</td></tr>`
      : entries.map((e, i) => {
          const medal = i < 3 ? MEDALS[i] : `#${i + 1}`
          const mins = String(Math.floor(e.time / 60)).padStart(2, '0')
          const secs = String(Math.floor(e.time % 60)).padStart(2, '0')
          const cs = String(Math.floor((e.time % 1) * 100)).padStart(2, '0')
          return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
            <td style="padding:10px 16px;color:#FFD700">${medal}</td>
            <td style="padding:10px 16px;color:#fff">${e.name || 'Anonymous'}</td>
            <td style="padding:10px 16px;color:#22CC44;font-family:monospace">${mins}:${secs}.${cs}</td>
            <td style="padding:10px 8px;color:#666;font-size:11px">${e.date.slice(0, 10)}</td>
          </tr>`
        }).join('')

    this.el.innerHTML = `
      <div style="max-width:600px;width:90%;padding:2rem 0">
        <h2 style="color:#FFD700;font-family:monospace;letter-spacing:0.3em;text-align:center;margin-bottom:0.5rem">
          LEADERBOARD
        </h2>
        <p style="color:#666;text-align:center;font-family:monospace;font-size:12px;margin-bottom:1.5rem;letter-spacing:0.2em">
          TOP CLIMBERS
        </p>
        <div style="display:flex;justify-content:center;margin-bottom:1rem;border-bottom:1px solid rgba(255,255,255,0.1)">
          ${tabs}
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.2)">
              <th style="text-align:left;padding:8px 16px;color:#CC2200;font-family:monospace;font-size:12px">RANK</th>
              <th style="text-align:left;padding:8px 16px;color:#CC2200;font-family:monospace;font-size:12px">CLIMBER</th>
              <th style="text-align:left;padding:8px 16px;color:#CC2200;font-family:monospace;font-size:12px">TIME</th>
              <th style="text-align:left;padding:8px 8px;color:#CC2200;font-family:monospace;font-size:12px">DATE</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="text-align:center;margin-top:2rem">
          <button onclick="window.himalayaGame.setState('menu')"
            style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);
            color:#fff;font-family:monospace;font-size:13px;padding:10px 28px;cursor:pointer;
            border-radius:4px;letter-spacing:0.15em">
            BACK TO MENU
          </button>
        </div>
      </div>
    `
  }
}
