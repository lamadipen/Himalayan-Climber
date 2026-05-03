import Phaser from 'phaser'
import { onAuth, signInAnonymous } from '../firebase/api'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create() {
    // Ensure a uid exists before any scene tries to read Firebase
    onAuth(uid => {
      if (uid) {
        this.registry.set('uid', uid)
        this.scene.start('PreloadScene')
      }
    })

    signInAnonymous()
      .then(uid => this.registry.set('uid', uid))
      .catch(err => console.error('[BootScene] auth failed', err))
  }
}
