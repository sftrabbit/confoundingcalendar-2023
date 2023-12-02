import { MOVEMENT } from './input'
import { OBJECT_TYPES, OBJECT_GROUPS } from './level'

const WALK_VELOCITY_CELLS_PER_SECOND = 3.5
const JUMP_VELOCITY_CELLS_PER_SECOND = 7

const FRICTION_CELLS_PER_SECOND_2 = 0.8
export const GRAVITY_CELLS_PER_SECOND_2 = 23.4

const COYOTE_TIME_SECONDS = 0.1
const ANTICOYOTE_TIME_SECONDS = 0.1

const PUSH_HOLD_TIME_SECONDS = 0.3

export function updatePhysics(gameState, inputHandler, timestamp, fps) {
  let event = null
  let physicsChanged = false

  const player = gameState.player
  const level = gameState.level

  const playerCellPosition = {
    x: Math.floor(player.position.x),
    y: Math.floor(player.position.y)
  }

  if (gameState.isPlant) {
    if (inputHandler.directionalMovement != null) {
      const event = { type: 'plant-move', dir: inputHandler.directionalMovement }
      inputHandler.directionalMovement = null
      return { event, physicsChanged: false } 
    }

    return { event: null, physicsChanged: false }
  } else {
    if (level.hasObject(playerCellPosition, OBJECT_TYPES.Door)) {
      const event = { type: 'end' }
      inputHandler.directionalMovement = null
      gameState.end = timestamp
      return { event, physicsChanged: false } 
    }
  }

  inputHandler.directionalMovement = null

  const horizontalMovement = inputHandler.getHorizontalMovement()

  if (horizontalMovement === MOVEMENT.Left) {
    if (gameState.playerStartedMovingTimestamp == null) {
      gameState.playerStartedMovingTimestamp = timestamp
    }
    player.velocity.x = -WALK_VELOCITY_CELLS_PER_SECOND
    gameState.playerFacing = MOVEMENT.Left
  } else if (horizontalMovement === MOVEMENT.Right) {
    if (gameState.playerStartedMovingTimestamp == null) {
      gameState.playerStartedMovingTimestamp = timestamp
    }
    player.velocity.x = WALK_VELOCITY_CELLS_PER_SECOND
    gameState.playerFacing = MOVEMENT.Right
  } else {
    gameState.playerStartedMovingTimestamp = null

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
      if (level.hasObject({ x: leftProbeX, y: y }, OBJECT_GROUPS.Solid) || level.hasObject({ x: rightProbeX, y: y }, OBJECT_GROUPS.Solid)) {
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

    if (!(level.hasObject(upProbe, OBJECT_GROUPS.Solid) || level.hasObject(downProbe, OBJECT_GROUPS.Solid))) {
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

  const ceilingCollision = verticalProbe(player.position, {
    x: player.position.x,
    y: player.position.y - JUMP_VELOCITY_CELLS_PER_SECOND / fps
  }, -1)

  const horizontalCollision = leftCollision || rightCollision

  let onGround = player.velocity.y >= 0 && verticalCollision != null

  if (verticalCollision) {
    // Leniency when colliding with ceiling/floor but there is a gap to move into
    const dir = Math.sign(player.velocity.y)
    if (horizontalMovement == null
      && Math.abs((player.position.x % 1) - 0.5) < 0.2
      && !level.hasObject({ x: playerCellPosition.x, y: playerCellPosition.y + dir }, OBJECT_GROUPS.Solid)
      && level.hasObject({ x: playerCellPosition.x + 1, y: playerCellPosition.y + dir }, OBJECT_GROUPS.Solid)
      && level.hasObject({ x: playerCellPosition.x - 1, y: playerCellPosition.y + dir }, OBJECT_GROUPS.Solid)) {
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
      && !level.hasObject({ x: playerCellPosition.x + dir, y: playerCellPosition.y }, OBJECT_GROUPS.Solid)) {
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
    if (horizontalMovement == null) {
      const verticalMovement = inputHandler.getVerticalMovement()

      if (ceilingCollision != null && verticalMovement == MOVEMENT.Up) {
        if (gameState.upPushStartTimestamp == null) {
          gameState.upPushStartTimestamp = timestamp
          if (gameState.upPushActualStartTimestamp == null) {
            gameState.upPushActualStartTimestamp = timestamp
          }
        } else if ((timestamp - gameState.upPushStartTimestamp) >= PUSH_HOLD_TIME_SECONDS * 1000) {
          event = {
            type: 'push',
            position: {
              x: Math.floor(player.position.x),
              y: Math.floor(player.position.y)
            },
            dir: MOVEMENT.Up
          }
          gameState.upPushStartTimestamp = null
        }
      } else {
        gameState.upPushStartTimestamp = null
      }

      if (verticalCollision != null ** player.velocity.y > 0 && verticalMovement == MOVEMENT.Down) {
        if (gameState.downPushStartTimestamp == null) {
          gameState.downPushStartTimestamp = timestamp
          if (gameState.downPushActualStartTimestamp == null) {
            gameState.downPushActualStartTimestamp = timestamp
          }
        } else if ((timestamp - gameState.downPushStartTimestamp) >= PUSH_HOLD_TIME_SECONDS * 1000) {
          event = {
            type: 'push',
            position: {
              x: Math.floor(player.position.x),
              y: Math.floor(player.position.y)
            },
            dir: MOVEMENT.Down
          }
          gameState.downPushStartTimestamp = null
        }
      } else {
        gameState.downPushStartTimestamp = null
      }

      if (verticalMovement == null) {
        gameState.upPushActualStartTimestamp = null
        gameState.downPushActualStartTimestamp = null
      }
    } else {
      gameState.upPushStartTimestamp = null
      gameState.downPushStartTimestamp = null
    }

    if (rightCollision != null && horizontalMovement == MOVEMENT.Right) {
      if (gameState.rightPushStartTimestamp == null) {
        gameState.rightPushStartTimestamp = timestamp
        if (gameState.rightPushActualStartTimestamp == null) {
          gameState.rightPushActualStartTimestamp = timestamp
        }
      } else if ((timestamp - gameState.rightPushStartTimestamp) >= (gameState.shortenPushTime ? 0 : PUSH_HOLD_TIME_SECONDS * 1000)) {
        event = {
          type: 'push',
          position: {
            x: Math.floor(player.position.x),
            y: Math.floor(player.position.y)
          },
          dir: MOVEMENT.Right
        }
        gameState.rightPushStartTimestamp = null
      }
    } else {
      gameState.rightPushStartTimestamp = null
    }

    if (leftCollision != null && horizontalMovement == MOVEMENT.Left) {
      if (gameState.leftPushStartTimestamp == null) {
        gameState.leftPushStartTimestamp = timestamp
        if (gameState.leftPushActualStartTimestamp == null) {
          gameState.leftPushActualStartTimestamp = timestamp
        }
      } else if ((timestamp - gameState.leftPushStartTimestamp) >= (gameState.shortenPushTime ? 0 : PUSH_HOLD_TIME_SECONDS * 1000)) {
        event = {
          type: 'push',
          position: {
            x: Math.floor(player.position.x),
            y: Math.floor(player.position.y)
          },
          dir: MOVEMENT.Left
        }
        gameState.leftPushStartTimestamp = null
      }
    } else {
      gameState.leftPushStartTimestamp = null
    }

    gameState.lastOnGroundTimestamp = timestamp
  } else {
    gameState.leftPushStartTimestamp = null
    gameState.rightPushStartTimestamp = null
    gameState.leftPushActualStartTimestamp = null
    gameState.rightPushActualStartTimestamp = null
  }

  if (inputHandler.jumpQueued) {
    if (onGround || (timestamp - gameState.lastOnGroundTimestamp) < COYOTE_TIME_SECONDS * 1000) {
      gameState.jumpTimestamp = timestamp
      gameState.lastOnGroundTimestamp = 0
    }
    inputHandler.jumpQueued = false
  }

  if (!onGround) {
    gameState.playerJumpingDir = Math.sign(player.velocity.y - 3)
    gameState.wasOnGround = false
  } else {
    if (!gameState.wasOnGround && gameState.lastGroundPosition != null && Math.floor(player.position.y) !== Math.floor(gameState.lastGroundPosition.y)) {
      physicsChanged = true
    }
    gameState.playerJumpingDir = null
    gameState.lastGroundPosition = {
      x: player.position.x,
      y: player.position.y
    }
    gameState.lastGroundFacing = gameState.playerFacing
    gameState.wasOnGround = true
  }

  player.position.x += player.velocity.x / fps
  player.position.y += player.velocity.y / fps

  if (gameState.jumpTimestamp != null) {
    if ((timestamp - gameState.jumpTimestamp) < ANTICOYOTE_TIME_SECONDS * 1000) {
      if (Math.abs((player.position.x % 1) - 0.5) < 0.2) {
        if (!level.hasObject({ x: playerCellPosition.x, y: playerCellPosition.y - 1 }, OBJECT_GROUPS.Solid)
          && level.hasObject({ x: playerCellPosition.x + 1, y: playerCellPosition.y - 1 }, OBJECT_GROUPS.Solid)
          && level.hasObject({ x: playerCellPosition.x - 1, y: playerCellPosition.y - 1 }, OBJECT_GROUPS.Solid)) {
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
  }

  return { event, physicsChanged }
}