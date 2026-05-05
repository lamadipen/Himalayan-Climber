import * as THREE from 'three'
import { LevelBase } from './LevelBase'
import type { LevelConfig } from '../types'
import { PhysicsWorld } from '../physics/PhysicsWorld'
import type { RapierType } from '../types'
import { EventBus } from '../core/EventBus'

export class Level1_Langtang extends LevelBase {
  readonly config: LevelConfig = {
    id: 1,
    name: 'Langtang Valley',
    mountain: 'Langtang',
    altitudeMeters: 3500,
    startPos: [0, 2, 0],
    summitPos: [92, 13, 0],
    checkpoints: [[32, 4.25, 0], [64, 8.25, 0]],
    platforms: [
      { pos: [0, 0.25, 0],   size: [8, 0.5, 4],   type: 'stone' },
      { pos: [10, 1.5, 0],   size: [5, 0.5, 4],   type: 'stone' },
      { pos: [17, 2.0, 0],   size: [6, 0.5, 4],   type: 'stone' },
      { pos: [26, 3.0, 0],   size: [3.5, 0.5, 4], type: 'stone' },
      { pos: [32, 3.5, 0],   size: [7, 0.5, 4],   type: 'stone' },
      { pos: [42, 4.5, 0],   size: [3, 0.5, 4],   type: 'stone' },
      { pos: [49, 5.5, 0],   size: [5, 0.5, 4],   type: 'stone' },
      { pos: [57, 6.5, 0],   size: [3, 0.5, 4],   type: 'snow'  },
      { pos: [64, 7.5, 0],   size: [6, 0.5, 4],   type: 'stone' },
      { pos: [73, 8.5, 0],   size: [3, 0.5, 4],   type: 'snow'  },
      { pos: [80, 10, 0],    size: [4, 0.5, 4],   type: 'snow'  },
      { pos: [88, 12, 0],    size: [8, 0.5, 4],   type: 'snow'  },
    ],
    collectibles: [
      { type: 'oxygen', pos: [26, 3.75, 0] },
      { type: 'oxygen', pos: [57, 7.25, 0] },
    ],
    hazards: [
      { type: 'avalanche', pos: [49, 20, 0], interval: 6000 },
    ],
    env: {
      skyColor: 0x87CEEB,
      fogColor: 0xC8E6F2,
      fogNear: 25,
      fogFar: 80,
      ambientColor: 0xFFF5E0,
      ambientIntensity: 0.6,
      sunColor: 0xFFFAD0,
      sunIntensity: 1.2,
      sunPosition: [10, 20, 10],
      windForce: 0.08,
      snowIntensity: 0.0,
      oxygenDrainRate: 0.25,
      blizzard: false,
    },
    story: {
      title: 'Langtang Valley',
      lines: [
        'Pemba Sherpa takes his sister Dawa on her first high-altitude trek',
        'through the lush Langtang Valley.',
        '"The mountains breathe here," he tells her.',
        '"Learn to breathe with them."',
      ],
      continueLabel: 'BEGIN CLIMB',
    },
  }

  constructor(scene: THREE.Scene, physics: PhysicsWorld, RAPIER: RapierType, events: EventBus) {
    super(scene, physics, RAPIER, events)
  }
}
