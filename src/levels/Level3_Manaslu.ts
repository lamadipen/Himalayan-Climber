import * as THREE from 'three'
import { LevelBase } from './LevelBase'
import type { LevelConfig } from '../types'
import { PhysicsWorld } from '../physics/PhysicsWorld'
import type { RapierType } from '../types'
import { EventBus } from '../core/EventBus'

export class Level3_Manaslu extends LevelBase {
  readonly config: LevelConfig = {
    id: 3,
    name: 'Manaslu Summit Ridge',
    mountain: 'Manaslu',
    altitudeMeters: 8163,
    startPos: [0, 2, 0],
    summitPos: [83, 21, 0],
    checkpoints: [[19, 6.25, 0], [47, 12.25, 0]],
    platforms: [
      { pos: [0, 0.25, 0],   size: [5, 0.5, 4],   type: 'snow'      },
      { pos: [7, 2.0, 0],    size: [3, 0.5, 4],   type: 'ice'       },
      { pos: [13, 4.0, 0],   size: [2.5, 0.5, 4], type: 'ice_bridge'},
      { pos: [19, 5.5, 0],   size: [4, 0.5, 4],   type: 'stone'     },
      { pos: [27, 6.5, 0],   size: [2, 0.5, 4],   type: 'ice'       },
      { pos: [33, 8.0, 0],   size: [4.5, 0.5, 4], type: 'snow'      },
      { pos: [41, 9.5, 0],   size: [2.5, 0.5, 4], type: 'ice_bridge'},
      { pos: [47, 11.5, 0],  size: [5, 0.5, 4],   type: 'stone'     },
      { pos: [56, 13.0, 0],  size: [2.5, 0.5, 4], type: 'ice'       },
      { pos: [63, 15.0, 0],  size: [4, 0.5, 4],   type: 'snow'      },
      { pos: [71, 17.5, 0],  size: [3, 0.5, 4],   type: 'ice'       },
      { pos: [79, 20.0, 0],  size: [7, 0.5, 4],   type: 'snow'      },
    ],
    collectibles: [
      { type: 'oxygen', pos: [7, 2.75, 0]    },
      { type: 'oxygen', pos: [33, 8.75, 0]   },
      { type: 'oxygen', pos: [63, 15.75, 0]  },
      { type: 'warmth',  pos: [19, 6.25, 0]  },
    ],
    hazards: [
      { type: 'avalanche', pos: [13, 28, 0], interval: 4000 },
      { type: 'avalanche', pos: [41, 28, 0], interval: 3500 },
      { type: 'serac',     pos: [56, 22, 0], interval: 5000 },
    ],
    env: {
      skyColor: 0x243060,
      fogColor: 0x7090B0,
      fogNear: 15,
      fogFar: 50,
      ambientColor: 0xC0D5E8,
      ambientIntensity: 0.4,
      sunColor: 0xFFD0A0,
      sunIntensity: 0.8,
      sunPosition: [5, 15, 8],
      windForce: 0.5,
      snowIntensity: 0.7,
      oxygenDrainRate: 1.2,
      blizzard: true,
    },
    story: {
      title: 'Manaslu Summit Ridge',
      lines: [
        'Night falls on the ridge. A blizzard rolls in.',
        'Pemba ropes Dawa to him.',
        '"One step. Then another."',
      ],
      continueLabel: 'BEGIN CLIMB',
    },
  }

  constructor(scene: THREE.Scene, physics: PhysicsWorld, RAPIER: RapierType, events: EventBus) {
    super(scene, physics, RAPIER, events)
  }
}
