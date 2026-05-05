import * as THREE from 'three'
import { LevelBase } from './LevelBase'
import type { LevelConfig } from '../types'
import { PhysicsWorld } from '../physics/PhysicsWorld'
import type { RapierType } from '../types'
import { EventBus } from '../core/EventBus'

export class Level4_ChoOyu extends LevelBase {
  readonly config: LevelConfig = {
    id: 4,
    name: 'Cho Oyu Death Zone',
    mountain: 'Cho Oyu',
    altitudeMeters: 8201,
    startPos: [0, 2, 0],
    summitPos: [82, 26, 0],
    checkpoints: [[20, 7.25, 0], [47, 14.75, 0]],
    platforms: [
      { pos: [0, 0.25, 0],   size: [5, 0.5, 4],   type: 'snow'      },
      { pos: [7, 2.5, 0],    size: [2, 0.5, 4],   type: 'ice'       },
      { pos: [13, 4.5, 0],   size: [3, 0.5, 4],   type: 'ice_bridge'},
      { pos: [20, 6.5, 0],   size: [3.5, 0.5, 4], type: 'snow'      },
      { pos: [28, 8.0, 0],   size: [1.5, 0.5, 4], type: 'ice'       },
      { pos: [33, 10.0, 0],  size: [3.5, 0.5, 4], type: 'stone'     },
      { pos: [41, 12.0, 0],  size: [2.5, 0.5, 4], type: 'ice_bridge'},
      { pos: [47, 14.0, 0],  size: [4, 0.5, 4],   type: 'snow'      },
      { pos: [55, 16.5, 0],  size: [2.5, 0.5, 4], type: 'ice'       },
      { pos: [62, 19.0, 0],  size: [3.5, 0.5, 4], type: 'snow'      },
      { pos: [70, 22.0, 0],  size: [2.5, 0.5, 4], type: 'ice'       },
      { pos: [78, 25.0, 0],  size: [7, 0.5, 4],   type: 'snow'      },
    ],
    collectibles: [
      { type: 'oxygen', pos: [7, 3.25, 0]    },
      { type: 'oxygen', pos: [28, 8.75, 0]   },
      { type: 'oxygen', pos: [55, 17.25, 0]  },
      { type: 'warmth',  pos: [33, 10.75, 0] },
    ],
    hazards: [
      { type: 'avalanche', pos: [20, 30, 0], interval: 3000 },
      { type: 'avalanche', pos: [47, 30, 0], interval: 2500 },
      { type: 'wind_zone', pos: [28, 8, 0],  width: 20, direction: [-1, 0, 0] },
    ],
    env: {
      skyColor: 0x8090A8,
      fogColor: 0xC0CDD8,
      fogNear: 10,
      fogFar: 35,
      ambientColor: 0xC8D5E0,
      ambientIntensity: 0.35,
      sunColor: 0xFFE0D0,
      sunIntensity: 0.6,
      sunPosition: [5, 12, 8],
      windForce: 0.7,
      snowIntensity: 0.8,
      oxygenDrainRate: 2.0,
      blizzard: true,
    },
    story: {
      title: 'Cho Oyu Death Zone',
      lines: [
        'Altitude sickness hits Dawa at 8000m.',
        'Colors fade. Sound muffles. Pemba carries her pack.',
        '"Look at me. Keep moving."',
      ],
      continueLabel: 'BEGIN CLIMB',
    },
  }

  constructor(scene: THREE.Scene, physics: PhysicsWorld, RAPIER: RapierType, events: EventBus) {
    super(scene, physics, RAPIER, events)
  }
}
