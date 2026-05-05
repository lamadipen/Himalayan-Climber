import * as THREE from 'three'
import { LevelBase } from './LevelBase'
import type { LevelConfig } from '../types'
import { PhysicsWorld } from '../physics/PhysicsWorld'
import type { RapierType } from '../types'
import { EventBus } from '../core/EventBus'

export class Level5_Everest extends LevelBase {
  readonly config: LevelConfig = {
    id: 5,
    name: 'Everest South Col',
    mountain: 'Everest',
    altitudeMeters: 8849,
    startPos: [0, 2, 0],
    summitPos: [68, 35, 0],
    checkpoints: [[28, 15.75, 0], [49, 27.75, 0]],
    platforms: [
      { pos: [0, 0.25, 0],   size: [4, 0.5, 4],   type: 'snow'      },
      { pos: [6, 3.0, 0],    size: [1.5, 0.5, 4], type: 'stone'     },
      { pos: [11, 6.0, 0],   size: [2, 0.5, 4],   type: 'ice'       },
      { pos: [17, 9.0, 0],   size: [1, 0.5, 4],   type: 'stone'     },
      { pos: [22, 12.0, 0],  size: [2.5, 0.5, 4], type: 'ice_bridge'},
      { pos: [28, 15.0, 0],  size: [1.5, 0.5, 4], type: 'stone'     },
      { pos: [33, 18.0, 0],  size: [2, 0.5, 4],   type: 'ice'       },
      { pos: [39, 21.0, 0],  size: [1, 0.5, 4],   type: 'stone'     },
      { pos: [44, 24.0, 0],  size: [0.8, 0.5, 4], type: 'stone'     }, // HILLARY STEP
      { pos: [49, 27.0, 0],  size: [3, 0.5, 4],   type: 'snow'      },
      { pos: [56, 30.0, 0],  size: [3.5, 0.5, 4], type: 'snow'      },
      { pos: [64, 34.0, 0],  size: [7, 0.5, 4],   type: 'snow'      }, // SUMMIT
    ],
    collectibles: [
      { type: 'oxygen', pos: [11, 6.75, 0]  },
      { type: 'oxygen', pos: [22, 12.75, 0] },
      { type: 'oxygen', pos: [39, 21.75, 0] },
      { type: 'warmth',  pos: [28, 15.75, 0] },
    ],
    hazards: [
      { type: 'avalanche', pos: [17, 28, 0], interval: 2000 },
      { type: 'avalanche', pos: [33, 28, 0], interval: 1800 },
      { type: 'serac',     pos: [11, 20, 0], interval: 3000 },
      { type: 'wind_zone', pos: [28, 15, 0], width: 30, direction: [-1, 0, 0] },
    ],
    env: {
      skyColor: 0x100828,
      fogColor: 0x404060,
      fogNear: 6,
      fogFar: 22,
      ambientColor: 0xA0B0C8,
      ambientIntensity: 0.3,
      sunColor: 0xFF9040,
      sunIntensity: 0.5,
      sunPosition: [3, 10, 5],
      windForce: 0.9,
      snowIntensity: 1.0,
      oxygenDrainRate: 3.0,
      blizzard: true,
    },
    story: {
      title: 'Everest South Col',
      lines: [
        'The Hillary Step. Stars visible in daylight. -40°C.',
        'Pemba and Dawa look at each other.',
        'No words needed. They climb.',
      ],
      continueLabel: 'BEGIN CLIMB',
    },
  }

  constructor(scene: THREE.Scene, physics: PhysicsWorld, RAPIER: RapierType, events: EventBus) {
    super(scene, physics, RAPIER, events)
  }
}
