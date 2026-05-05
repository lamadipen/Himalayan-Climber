import * as THREE from 'three'
import { LevelBase } from './LevelBase'
import type { LevelConfig } from '../types'
import { PhysicsWorld } from '../physics/PhysicsWorld'
import type { RapierType } from '../types'
import { EventBus } from '../core/EventBus'

export class Level2_Annapurna extends LevelBase {
  readonly config: LevelConfig = {
    id: 2,
    name: 'Annapurna Sanctuary',
    mountain: 'Annapurna',
    altitudeMeters: 4130,
    startPos: [0, 2, 0],
    summitPos: [87, 16.5, 0],
    checkpoints: [[21, 4.25, 0], [52, 8.75, 0]],
    platforms: [
      { pos: [0, 0.25, 0],   size: [6, 0.5, 4],   type: 'stone'     },
      { pos: [9, 1.5, 0],    size: [3.5, 0.5, 4], type: 'ice'       },
      { pos: [15, 2.5, 0],   size: [2.5, 0.5, 4], type: 'stone'     },
      { pos: [21, 3.5, 0],   size: [6, 0.5, 4],   type: 'stone'     },
      { pos: [30, 4.5, 0],   size: [3, 0.5, 4],   type: 'ice_bridge'},
      { pos: [37, 5.5, 0],   size: [4, 0.5, 4],   type: 'stone'     },
      { pos: [45, 6.5, 0],   size: [3, 0.5, 4],   type: 'ice'       },
      { pos: [52, 8.0, 0],   size: [5, 0.5, 4],   type: 'stone'     },
      { pos: [60, 9.5, 0],   size: [3, 0.5, 4],   type: 'ice'       },
      { pos: [67, 11.0, 0],  size: [4, 0.5, 4],   type: 'snow'      },
      { pos: [75, 13.0, 0],  size: [3, 0.5, 4],   type: 'snow'      },
      { pos: [83, 15.5, 0],  size: [7, 0.5, 4],   type: 'snow'      },
    ],
    collectibles: [
      { type: 'oxygen', pos: [15, 3.25, 0] },
      { type: 'oxygen', pos: [60, 10.25, 0] },
      { type: 'warmth',  pos: [37, 6.25, 0] },
    ],
    hazards: [
      { type: 'avalanche', pos: [37, 25, 0], interval: 5000 },
      { type: 'wind_zone', pos: [60, 8, 0], width: 15, direction: [-1, 0, 0] },
    ],
    env: {
      skyColor: 0x3D7ABF,
      fogColor: 0xBDD5E8,
      fogNear: 20,
      fogFar: 65,
      ambientColor: 0xE0EEF5,
      ambientIntensity: 0.5,
      sunColor: 0xFFE8C0,
      sunIntensity: 1.0,
      sunPosition: [8, 18, 8],
      windForce: 0.25,
      snowIntensity: 0.25,
      oxygenDrainRate: 0.6,
      blizzard: false,
    },
    story: {
      title: 'Annapurna Sanctuary',
      lines: [
        'The Sanctuary\'s ice walls loom above.',
        'A rope team ahead has turned back — too dangerous.',
        'Pemba nods to Dawa: "We go on."',
      ],
      continueLabel: 'BEGIN CLIMB',
    },
  }

  constructor(scene: THREE.Scene, physics: PhysicsWorld, RAPIER: RapierType, events: EventBus) {
    super(scene, physics, RAPIER, events)
  }
}
