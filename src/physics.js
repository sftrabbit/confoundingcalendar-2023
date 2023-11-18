import { MOVEMENT } from './input'

const WALK_VELOCITY_CELLS_PER_SECOND = 5.5
const JUMP_VELOCITY_CELLS_PER_SECOND = 12

const FRICTION_CELLS_PER_SECOND_2 = 0.8
const GRAVITY_CELLS_PER_SECOND_2 = 50.4

const COYOTE_TIME_SECONDS = 0.07
const ANTICOYOTE_TIME_SECONDS = 0.05

const PUSH_HOLD_TIME_SECONDS = 0.3

export function updatePhysics(gameState, inputHandler, timestamp, fps) {
  let event = null

  const player = gameState.player
  const level = gameState.level

  const horizontalMovement = inputHandler.getHorizontalMovement()

  if (horizontalMovement === MOVEMENT.Left) {
    player.velocity.x = -WALK_VELOCITY_CELLS_PER_SECOND
  } else if (horizontalMovement === MOVEMENT.Right) {
    player.velocity.x = WALK_VELOCITY_CELLS_PER_SECOND
  } else {
    if (player.velocity.x > 0) {
      player.velocity.x -= FRICTION_CELLS_PER_SECOND_2
      if (player.velocity.x < 0) {
        player.velocity.x = 0
      }
    } else if (player.velocity.x < 0) {
      player.velocity.x += FRICTION_CELLS_PER_SECOND_2
      if (player.velocity.x > 0) {
        player.velocity.x = 0
      }
    }
  }
  player.velocity.y += GRAVITY_CELLS_PER_SECOND_2 / fps

  const projectedPlayerPosition = {
    x: player.position.x + player.velocity.x / fps,
    y: player.position.y + player.velocity.y / fps
  }

  // Floor probe

  const verticalProbe = (playerPosition, probePosition, dir) => {
    const startY = Math.floor(player.position.y + 0.5 * dir)
    const probeY = Math.floor(probePosition.y + 0.5 * dir)

    const leftProbeX = Math.floor(probePosition.x - 0.5)
    const rightProbeX = Math.ceil(probePosition.x + 0.5) - 1

    for (let y = startY; y != probeY + dir; y += dir) {
      if (level.data[y][leftProbeX].length > 0 || level.data[y][rightProbeX].length > 0) {
        return Math.floor(y - dir) + 0.5
      }
    }

    return null
  }

  const horizontalProbe = (playerPosition, probePosition, dir) => {
    const upProbe = {
      x: Math.floor(probePosition.x + 0.5 * dir),
      y: Math.floor(probePosition.y - 0.5)
    }
    const downProbe = {
      x: Math.floor(probePosition.x + 0.5 * dir),
      y: Math.ceil(probePosition.y + 0.5) - 1
    }

    if (!(level.data[upProbe.y][upProbe.x].length > 0 || level.data[downProbe.y][downProbe.x].length > 0)) {
      return null
    }

    return Math.floor(upProbe.x - dir) + 0.5
  }

  const verticalCollision = verticalProbe(player.position, {
    x: player.position.x,
    y: projectedPlayerPosition.y
  }, Math.sign(player.velocity.y))
  const leftCollision = horizontalProbe(player.position, {
    x: projectedPlayerPosition.x,
    y: player.position.y
  }, -1)
  const rightCollision = horizontalProbe(player.position, {
    x: projectedPlayerPosition.x,
    y: player.position.y
  }, 1)

  const horizontalCollision = leftCollision || rightCollision

  let onGround = player.velocity.y >= 0 && verticalCollision != null

  if (verticalCollision) {
    // Leniency when colliding with ceiling/floor but there is a gap to move into
    const dir = Math.sign(player.velocity.y)
    if (horizontalMovement == null
      && Math.abs((player.position.x % 1) - 0.5) < 0.2
      && level.data[Math.floor(player.position.y) + dir][Math.floor(player.position.x)].length === 0
      && level.data[Math.floor(player.position.y) + dir][Math.floor(player.position.x) + 1].length !== 0
      && level.data[Math.floor(player.position.y) + dir][Math.floor(player.position.x) - 1].length !== 0) {
      player.position.x = Math.floor(player.position.x) + 0.5
    } else {
      player.position.y = verticalCollision
      player.velocity.y = 0
    }
  }

  if (horizontalCollision && player.velocity.x !== 0) {
    // Leniency when colliding with ceiling/floor but there is a gap to move into
    const dir = Math.sign(player.velocity.x)
    if (Math.abs((player.position.y % 1) - 0.5) < 0.1
      && level.data[Math.floor(player.position.y)][Math.floor(player.position.x) + dir].length === 0) {
      player.position.y = Math.floor(player.position.y) + 0.5
    } else {
      player.position.x = horizontalCollision
      player.velocity.x = 0
    }
  }

  // Corner check
  if (player.velocity.x !== 0 && player.velocity.y !== 0) {
    const horizontalMotionCollision = player.velocity.x > 0 ? rightCollision : leftCollision

    if (!horizontalMotionCollision && !verticalCollision) {
      const verticalCollision = verticalProbe(player.position, {
        x: player.position.x,
        y: projectedPlayerPosition.y
      }, Math.sign(player.velocity.y))

      if (verticalCollision) {
        player.position.y = verticalCollision
        player.velocity.y = 0
      }

      if (player.velocity.y >= 0 && verticalCollision) {
        onGround = true
      }
    }
  }

  if (onGround) {
    if (inputHandler.jumpQueued) {
      gameState.jumpTimestamp = timestamp
    }

    if (rightCollision != null && horizontalMovement == MOVEMENT.Right) {
      if (gameState.rightPushStartTimestamp == null) {
        gameState.rightPushStartTimestamp = timestamp
      } else if ((timestamp - gameState.rightPushStartTimestamp) >= PUSH_HOLD_TIME_SECONDS * 1000) {
        event = {
          type: 'push',
          position: {
            x: Math.floor(player.position.x),
            y: Math.floor(player.position.y)
          },
          dir: 1
        }
        gameState.rightPushStartTimestamp = null
      }
    } else {
      gameState.rightPushStartTimestamp = null
    }

    if (leftCollision != null && horizontalMovement == MOVEMENT.Left) {
      if (gameState.leftPushStartTimestamp == null) {
        gameState.leftPushStartTimestamp = timestamp
      } else if ((timestamp - gameState.leftPushStartTimestamp) >= PUSH_HOLD_TIME_SECONDS * 1000) {
        event = {
          type: 'push',
          position: {
            x: Math.floor(player.position.x),
            y: Math.floor(player.position.y)
          },
          dir: -1
        }
        gameState.leftPushStartTimestamp = null
      }
    } else {
      gameState.leftPushStartTimestamp = null
    }

    gameState.lastOnGroundTimestamp = timestamp
  } else {
    gameState.rightPushStartTimestamp = null
    gameState.leftPushStartTimestamp = null
  }

  if (inputHandler.jumpQueued) {
    inputHandler.jumpQueued = false
  }

  player.position.x += player.velocity.x / fps
  player.position.y += player.velocity.y / fps

  // TODO - This code is super ugly and I think I broke coyote time
  if (gameState.jumpTimestamp != null) {
    if ((timestamp - gameState.jumpTimestamp) < ANTICOYOTE_TIME_SECONDS * 1000) {
      if (onGround || (timestamp - gameState.lastOnGroundTimestamp) < COYOTE_TIME_SECONDS * 1000) {
        if (Math.abs((player.position.x % 1) - 0.5) < 0.2) {
          if (level.data[Math.floor(player.position.y) - 1][Math.floor(player.position.x)].length === 0
            && level.data[Math.floor(player.position.y) - 1][Math.floor(player.position.x) + 1].length !== 0
            && level.data[Math.floor(player.position.y) - 1][Math.floor(player.position.x) - 1].length !== 0) {
            player.position.x = Math.floor(player.position.x) + 0.5
          }
        }

        let jumpUpCollision = verticalProbe(player.position, {
          x: player.position.x,
          y: player.position.y - JUMP_VELOCITY_CELLS_PER_SECOND / fps
        }, -1)

        if (!jumpUpCollision) {
          player.velocity.y = -JUMP_VELOCITY_CELLS_PER_SECOND
          gameState.jumpTimestamp = null
        }
      } else {
        gameState.jumpTimestamp = null
      }
    } else {
      gameState.jumpTimestamp = null
    }
  }

  return event
}