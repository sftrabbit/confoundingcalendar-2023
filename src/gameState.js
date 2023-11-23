import { MOVEMENT } from './input'

class GameState {
  constructor (level) {
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

    this.level = level

    this.jumpTimestamp = null
    this.lastOnGroundTimestamp = 0

    this.leftPushStartTimestamp = null
    this.rightPushStartTimestamp = null

    this.playerFacing = MOVEMENT.Right
    this.playerStartedMovingTimestamp = null
    this.jumpState = null
  }
}

export default GameState