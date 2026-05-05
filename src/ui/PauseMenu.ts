interface GameRef {
  setState(screen: string): void
  startLevel(id: number): void
  state: { currentLevel: number }
}

export class PauseMenu {
  private el: HTMLDivElement

  constructor(private game: GameRef) {
    this.el = document.createElement('div')
    this.el.id = 'pause-menu'
    this.el.style.cssText = `
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.75);
      z-index: 40;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    `
    document.getElementById('ui')!.appendChild(this.el)

    this.el.innerHTML = `
      <style>
        .pause-btn {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.18);
          color: #fff;
          font-family: monospace;
          font-size: 14px;
          letter-spacing: 0.25em;
          padding: 12px 40px;
          cursor: pointer;
          border-radius: 4px;
          margin: 6px;
          min-width: 200px;
          transition: background 0.2s;
        }
        .pause-btn:hover {
          background: rgba(204,34,0,0.3);
          border-color: rgba(204,34,0,0.5);
        }
        .pause-btn.primary {
          background: rgba(204,34,0,0.4);
          border-color: #CC2200;
          color: #FFD700;
        }
        .pause-btn.primary:hover {
          background: rgba(204,34,0,0.65);
        }
      </style>

      <div style="text-align:center">
        <div style="color:#FFD700;font-family:monospace;font-size:2rem;letter-spacing:0.4em;margin-bottom:2rem">
          PAUSED
        </div>
        <div>
          <button class="pause-btn primary" onclick="window.himalayaGame.setState('playing')">
            RESUME
          </button>
          <br>
          <button class="pause-btn" id="pause-restart-btn">
            RESTART LEVEL
          </button>
          <br>
          <button class="pause-btn" onclick="window.himalayaGame.setState('menu')">
            MAIN MENU
          </button>
        </div>
        <div style="color:#333;font-family:monospace;font-size:11px;margin-top:1.5rem;letter-spacing:0.15em">
          ESC TO RESUME
        </div>
      </div>
    `

    this.el.querySelector('#pause-restart-btn')!.addEventListener('click', () => {
      this.game.startLevel(this.game.state.currentLevel)
    })
  }

  show(): void {
    this.el.style.display = 'flex'
  }

  hide(): void {
    this.el.style.display = 'none'
  }
}
