import { MOVEMENT } from './input'
import { OBJECT_TYPES } from './level'

class GameState {
  constructor (level) {
    this.level = level

    this.player = {
      position: {
        x: 10.5,
        y: 7.5
      },
      velocity: {
        x: 0,
        y: 0
      }
    }

    this.reset()
  }

  reset() {
    this.player.velocity.x = 0
    this.player.velocity.y = 0

    this.jumpTimestamp = null
    this.lastOnGroundTimestamp = 0

    this.leftPushStartTimestamp = null
    this.rightPushStartTimestamp = null

    this.playerFacing = MOVEMENT.Right
    this.playerStartedMovingTimestamp = null
    this.playerJumpingDir = null

    this.lastGroundPosition = null
    this.lastGroundFacing = null
    this.wasOnGround = false

    this.pushHappening = false
  }

  serialize (playerPosition, playerFacing) {
    if (playerPosition == null) {
      playerPosition = this.player.position
    }
    if (playerFacing == null) {
      playerFacing = this.playerFacing
    }

    return [
      playerPosition.x,
      playerPosition.y,
      playerFacing,
      ...this.level.data.reduce((blockPositions, row, y) => {
        const rowBlockPositions = row.reduce((rowBlockPositions, cell, x) => {
          if (!(cell & OBJECT_TYPES.Box)) {
            return rowBlockPositions
          }

          rowBlockPositions.push(x, y)
          return rowBlockPositions
        }, [])
        blockPositions.push(...rowBlockPositions)
        return blockPositions
      }, [])
    ]
  }

  deserialize (serializedState) {
    this.reset()

    this.player.position.x = serializedState[0]
    this.player.position.y = serializedState[1]
    this.playerFacing = serializedState[2]

    for (let y = 0; y < this.level.data.length; y++) {
      for (let x = 0; x < this.level.data[0].length; x++) {
        this.level.removeObject({ x, y }, OBJECT_TYPES.Box)
      }
    }

    for (let i = 3; i < serializedState.length; i += 2) {
      this.level.addObject({
        x: serializedState[i],
        y: serializedState[i + 1]
      }, OBJECT_TYPES.Box)
    }
  }
}

export default GameState