// Forward-declare Game interface to avoid circular dep
interface GameRef {
  startLevel(id: number): void
  setState(screen: string): void
  showLeaderboard(levelId: number): void
}

export class MainMenu {
  private el: HTMLDivElement
  private levelSelectVisible = false

  constructor(private game: GameRef) {
    this.el = document.createElement('div')
    this.el.id = 'main-menu'
    document.getElementById('ui')!.appendChild(this.el)
    this.render()
  }

  show(): void {
    this.el.style.display = 'flex'
  }

  hide(): void {
    this.el.style.display = 'none'
  }

  private render(): void {
    this.el.style.cssText = `
      display: none;
      position: fixed;
      inset: 0;
      background: linear-gradient(160deg, #050510 0%, #0d0525 40%, #150a1a 100%);
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 35;
      overflow: hidden;
    `

    this.el.innerHTML = `
      <style>
        @keyframes snowfall {
          0% { transform: translateY(-10px) translateX(0); opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.5; }
          100% { transform: translateY(110vh) translateX(30px); opacity: 0; }
        }
        .menu-snowflake {
          position: absolute;
          color: #fff;
          font-size: 10px;
          pointer-events: none;
          animation: snowfall linear infinite;
          opacity: 0;
        }
        .menu-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.18);
          color: #fff;
          font-family: monospace;
          font-size: 14px;
          letter-spacing: 0.25em;
          padding: 12px 36px;
          cursor: pointer;
          border-radius: 4px;
          margin: 6px;
          transition: background 0.2s ease, border-color 0.2s ease;
          min-width: 220px;
        }
        .menu-btn:hover {
          background: rgba(204,34,0,0.25);
          border-color: rgba(204,34,0,0.6);
        }
        .menu-btn.primary {
          background: rgba(204,34,0,0.4);
          border-color: #CC2200;
          color: #FFD700;
          font-size: 15px;
        }
        .menu-btn.primary:hover {
          background: rgba(204,34,0,0.65);
        }
        .level-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.15);
          color: #aaa;
          font-family: monospace;
          font-size: 12px;
          padding: 8px 18px;
          cursor: pointer;
          border-radius: 4px;
          margin: 4px;
          transition: background 0.2s;
        }
        .level-btn:hover {
          background: rgba(204,34,0,0.2);
          color: #fff;
        }
      </style>

      <!-- Snow particles -->
      ${Array.from({ length: 30 }, (_, i) => `
        <div class="menu-snowflake" style="
          left:${Math.random() * 100}%;
          animation-duration:${5 + Math.random() * 8}s;
          animation-delay:${Math.random() * 5}s;
          font-size:${6 + Math.random() * 8}px;
        ">&#10052;</div>
      `).join('')}

      <!-- Nepal accent lines -->
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#003399,#CC2200,#003399)"></div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#003399,#CC2200,#003399)"></div>

      <!-- Main content -->
      <div style="text-align:center;z-index:1;padding:2rem">
        <div style="font-size:clamp(2rem,5vw,3.2rem);letter-spacing:0.4em;color:#FFD700;
          text-shadow:0 0 40px rgba(255,200,0,0.4);font-family:Georgia,serif;margin-bottom:0.3rem">
          HIMALAYAN CLIMBER
        </div>
        <div style="font-size:clamp(0.8rem,2vw,1rem);color:#CC2200;letter-spacing:0.5em;
          font-family:monospace;margin-bottom:0.6rem">
          A SHERPA'S JOURNEY
        </div>
        <div style="color:#666;font-size:13px;line-height:1.8;max-width:380px;margin:0 auto 2rem;font-style:italic">
          Pemba and Dawa face the Himalayas.<br>
          Five mountains. One unbreakable bond.
        </div>

        <button class="menu-btn primary" onclick="window.himalayaGame.startLevel(1)">
          BEGIN JOURNEY
        </button>
        <br>
        <button class="menu-btn" id="menu-select-btn" onclick="
          const lv = document.getElementById('menu-levels');
          lv.style.display = lv.style.display === 'none' ? 'block' : 'none';
        ">
          SELECT LEVEL
        </button>

        <div id="menu-levels" style="display:none;margin:12px 0">
          ${[
            { id: 1, name: 'Langtang Valley', alt: '3,500m' },
            { id: 2, name: 'Annapurna', alt: '4,130m' },
            { id: 3, name: 'Manaslu', alt: '8,163m' },
            { id: 4, name: 'Cho Oyu', alt: '8,201m' },
            { id: 5, name: 'Everest', alt: '8,849m' },
          ].map(l => `
            <button class="level-btn" onclick="window.himalayaGame.startLevel(${l.id})">
              ${l.id}. ${l.name} <span style="color:#666">${l.alt}</span>
            </button>
          `).join('<br>')}
        </div>
        <br>
        <button class="menu-btn" onclick="window.himalayaGame.showLeaderboard(1)">
          LEADERBOARD
        </button>

        <div style="margin-top:2.5rem;color:#333;font-size:11px;font-family:monospace;letter-spacing:0.15em">
          ARROW KEYS / WASD TO MOVE &nbsp;|&nbsp; SPACE TO JUMP &nbsp;|&nbsp; ESC TO PAUSE
        </div>
      </div>
    `
  }
}
