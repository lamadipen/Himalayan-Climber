import Phaser from 'phaser'
import { onAuth, signInAnonymous } from '../firebase/api'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create() {
    let started = false

    const proceed = (uid: string | null) => {
      if (started) return
      started = true
      if (uid) this.registry.set('uid', uid)
      this.scene.start('PreloadScene')
    }

    // If Firebase auth doesn't respond within 3 s (e.g. emulators offline),
    // proceed anyway so the game is playable without a backend.
    this.time.delayedCall(3000, () => {
      console.warn('[BootScene] auth timeout — proceeding without uid')
      proceed(null)
    })

    onAuth(uid => { if (uid) proceed(uid) })

    signInAnonymous()
      .then(uid => proceed(uid))
      .catch(err => {
        console.error('[BootScene] auth failed', err)
        proceed(null)
      })
  }
}
