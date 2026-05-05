import RAPIER from '@dimforge/rapier3d-compat'
import { Game } from './core/Game'

function setLoadingProgress(pct: number) {
  const bar = document.getElementById('loading-bar')
  if (bar) bar.style.width = pct + '%'
}

function setLoadingText(txt: string) {
  const el = document.getElementById('loading-text')
  if (el) el.textContent = txt
}

async function main() {
  setLoadingText('Initializing physics engine…')
  setLoadingProgress(10)
  await RAPIER.init()
  setLoadingProgress(40)

  setLoadingText('Loading game world…')
  const game = new Game(RAPIER)
  ;(window as any).himalayaGame = game
  await game.init()
  setLoadingProgress(90)

  setLoadingText('Ready!')
  setLoadingProgress(100)

  setTimeout(() => {
    const loading = document.getElementById('loading')!
    loading.style.opacity = '0'
    loading.style.transition = 'opacity 0.8s ease'
    setTimeout(() => {
      loading.style.display = 'none'
    }, 800)
    game.start()
  }, 400)
}

main().catch(err => {
  console.error(err)
  const loading = document.getElementById('loading')!
  loading.innerHTML = `
    <p style="color:#f44;font-size:1.2rem">Error: ${err.message}</p>
    <p style="color:#888;margin-top:1rem;font-size:0.9rem">Check console for details.</p>
  `
})
