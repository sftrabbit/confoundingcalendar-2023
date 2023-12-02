import { MOVEMENT } from './input'
import { OBJECT_TYPES, OBJECT_GROUPS } from './level'

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

    this.plant = {
      position: {
        x: 9,
        y: 1
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
    this.leftPushActualStartTimestamp = null
    this.rightPushStartTimestamp = null
    this.rightPushActualStartTimestamp = null

    this.upPushStartTimestamp = null
    this.upPushActualStartTimestamp = null
    this.downPushStartTimestamp = null
    this.downPushActualStartTimestamp = null

    this.playerFacing = MOVEMENT.Right
    this.playerStartedMovingTimestamp = null
    this.playerJumpingDir = null

    this.lastGroundPosition = null
    this.lastGroundFacing = null
    this.wasOnGround = false

    this.shortenPushTime = false

    this.isPlant = true
    this.plantMovementFrom = null
    this.plantEyeDir = MOVEMENT.Down

    this.dead = false
    this.gameState = false
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
      this.plant.position.x,
      this.plant.position.y,
      this.isPlant,
      this.plantEyeDir,
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
      }, []),
      -1,
      ...this.level.data.reduce((pathPositions, row, y) => {
        const rowPathPositions = row.reduce((rowPathPositions, cell, x) => {
          if (!(cell & OBJECT_GROUPS.Path)) {
            return rowPathPositions
          }

          rowPathPositions.push(x, y, cell & 0xf0)
          return rowPathPositions
        }, [])
        pathPositions.push(...rowPathPositions)
        return pathPositions
      }, []),
    ]
  }

  deserialize (serializedState) {
    this.reset()

    this.player.position.x = serializedState[0]
    this.player.position.y = serializedState[1]
    this.playerFacing = serializedState[2]

    this.plant.position.x = serializedState[3]
    this.plant.position.y = serializedState[4]
    this.isPlant = serializedState[5]
    this.plantEyeDir = serializedState[6]

    for (let y = 0; y < this.level.data.length; y++) {
      for (let x = 0; x < this.level.data[0].length; x++) {
        this.level.removeObject({ x, y }, OBJECT_TYPES.Box | OBJECT_GROUPS.Path)
      }
    }

    let i = 7

    for (; i < serializedState.length; i += 2) {
      if (serializedState[i] === -1) {
        i++
        break
      }

      this.level.addObject({
        x: serializedState[i],
        y: serializedState[i + 1]
      }, OBJECT_TYPES.Box)
    }

    for (; i < serializedState.length; i += 3) {
      this.level.addObject({
        x: serializedState[i],
        y: serializedState[i + 1]
      }, serializedState[i + 2])
    }
  }
}

export default GameState