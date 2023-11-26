import { OBJECT_TYPES, OBJECT_GROUPS } from './level'
import { GRAVITY_CELLS_PER_SECOND_2 } from './physics'

const MOVEMENT_CAUSES = {
  Push: 0,
  Friction: 1
}

export function applyRules(gameState, event) {
  const level = gameState.level

  const animations = [{
    fromPosition: { x: gameState.player.position.x, y: gameState.player.position.y },
    toPosition: { x: gameState.player.position.x, y: gameState.player.position.y },
    objectTypes: null,
    durationSeconds: 0.2,
    type: 'push'
  }]

  let pendingFalls = []
  let falls = []

  for (let y = 0; y < level.data.length; y++) {
    for (let x = 0; x < level.data[0].length; x++) {
      if ((level.data[y][x] & OBJECT_TYPES.Box) === 0) {
        continue
      }

      animations.push({
        fromPosition: { x, y },
        toPosition: { x, y },
        objectTypes: level.data[y][x],
        durationSeconds: 0.2
      })

      if ((level.data[y + 1][x] & OBJECT_GROUPS.Solid) === 0) {
        pendingFalls.push({
          position: { x, y }
        })
      }
    }
  }

  for (const pendingFall of pendingFalls) {
    let fallDistance = 0
    while ((level.data[pendingFall.position.y + fallDistance + 1][pendingFall.position.x] & OBJECT_GROUPS.Solid) === 0) {
      fallDistance += 1
    }

    let risen = 0

    while ((level.data[pendingFall.position.y - risen][pendingFall.position.x] & OBJECT_TYPES.Box) !== 0) {
      const fromPosition = {
        x: pendingFall.position.x,
        y: pendingFall.position.y - risen
      }
      const toY = pendingFall.position.y - risen + fallDistance
      const toPosition = {
        x: pendingFall.position.x,
        y: toY
      }
      const fall = {
        fromPosition,
        toPosition,
        objectTypes: level.data[fromPosition.y][fromPosition.x],
      }

      if (Math.floor(gameState.player.position.x) === fromPosition.x && Math.floor(gameState.player.position.y) === toY) {
        fall.squisher = true
      }

      falls.push(fall)

      risen += 1
    }
  }

  let pendingMovements = []

  if (event.type === 'push') {
    const pushedPosition = {
      x: event.position.x + event.dir,
      y: event.position.y
    }

    if (level.hasObject(pushedPosition, OBJECT_TYPES.Box)) {
      pendingMovements.push({
        position: pushedPosition,
        dir: event.dir,
        cancelled: null,
        cause: MOVEMENT_CAUSES.Push
      })
    }
  }

  let movementsToPropagate = [...pendingMovements]

  // Horizontal propagation
  while (movementsToPropagate.length > 0) {
    let newMovements = []

    while (movementsToPropagate.length > 0) {
      const movement = movementsToPropagate.shift()

      const propagatedPosition = {
        x: movement.position.x + movement.dir,
        y: movement.position.y
      }

      if (level.hasObject(propagatedPosition, OBJECT_GROUPS.Pushable)) {
        newMovements.push({
          position: propagatedPosition,
          dir: movement.dir,
          cancelled: null,
          cause: MOVEMENT_CAUSES.Push
        })
      }
    }

    pendingMovements.push(...newMovements)

    movementsToPropagate = newMovements
  }

  checkForCancellations(level, pendingMovements)

  // Vertical propagation
  movementsToPropagate = pendingMovements.filter((movement) => !movement.cancelled)
  while (movementsToPropagate.length > 0) {
    let newMovements = []

    while (movementsToPropagate.length > 0) {
      const movement = movementsToPropagate.shift()
      if (movement.cancelled) {
        continue
      }

      const propagatedPosition = {
        x: movement.position.x,
        y: movement.position.y - 1
      }

      if (level.hasObject(propagatedPosition, OBJECT_GROUPS.Pushable)) {
        newMovements.push({
          position: propagatedPosition,
          dir: movement.dir,
          cancelled: null,
          cause: MOVEMENT_CAUSES.Friction
        })
      }
    }

    pendingMovements.push(...newMovements)

    movementsToPropagate = newMovements
  }

  checkForCancellations(level, pendingMovements)

  const movements = pendingMovements.filter((movement) => !movement.cancelled)

  for (const movement of movements) {
    const fromPosition = movement.position
    level.removeObject(fromPosition, OBJECT_TYPES.Box)
  }

  for (const movement of movements) {
    const toPosition = {
      x: movement.position.x + movement.dir,
      y: movement.position.y
    }

    level.addObject(toPosition, OBJECT_TYPES.Box)

    for (const animation of animations) {
      if (animation.fromPosition.x === movement.position.x && animation.fromPosition.y === movement.position.y) {
        animation.toPosition = toPosition
      }
    }
  }

  if (falls.length > 0) {
    for (const fall of falls) {
      level.removeObject(fall.fromPosition, OBJECT_TYPES.Box)
    }

    let squisherAnimation = null

    for (const fall of falls) {
      level.addObject(fall.toPosition, OBJECT_TYPES.Box)

      for (const animation of animations) {
        if (animation.fromPosition.x === fall.fromPosition.x && animation.fromPosition.y === fall.fromPosition.y) {
          animation.toPosition = fall.toPosition
          const fallDistance = animation.toPosition.y - animation.fromPosition.y
          animation.durationSeconds = Math.sqrt((2 * fallDistance) / GRAVITY_CELLS_PER_SECOND_2)
          animation.tween = 'gravity'

          if (fall.squisher) {
            animation.squishSeconds = Math.sqrt((2 * (fallDistance - 1)) / GRAVITY_CELLS_PER_SECOND_2)
            squisherAnimation = animation
          }

          break
        }
      }
    }

    if (squisherAnimation != null) {
      const squishPosition = { x: squisherAnimation.toPosition.x, y: squisherAnimation.toPosition.y }
      animations[0].fromPosition = squishPosition
      animations[0].toPosition = squishPosition
      animations[0].objectTypes = 'squish'
      animations[0].durationSeconds = 0.1
      animations[0].delaySeconds = squisherAnimation.squishSeconds

      const squishGooPosition = { x: squishPosition.x, y: squishPosition.y + 1 }
      animations.push({
        fromPosition: squishGooPosition,
        toPosition: squishGooPosition,
        objectTypes: 'squishgoo',
        durationSeconds: 0.5,
        delaySeconds: squisherAnimation.squishSeconds + 0.07,
        type: 'push'
      })

      level.addObject(squishGooPosition, OBJECT_TYPES.PathUp)
    }

    animations.fall = true

    return animations
  }

  if (event.type === 'push' && pendingMovements.length > 0 && !pendingMovements[0].cancelled) {
    animations[0].toPosition = {
      x: gameState.player.position.x + event.dir,
      y: gameState.player.position.y
    }
    animations[0].type = 'push'
    gameState.player.position.x = animations[0].toPosition.x
    return animations
  }

  return null
}

function checkForCancellations(level, pendingMovements) {
  while (true) {
    let allResolved = true

    for (const pendingMovement of pendingMovements) {
      if (pendingMovement.cancelled != null) {
        continue
      }

      const toPosition = {
        x: pendingMovement.position.x + pendingMovement.dir,
        y: pendingMovement.position.y
      }

      if (level.hasObject(toPosition, OBJECT_GROUPS.Static)) {
        pendingMovement.cancelled = true
      } else {
        if (pendingMovement.cause === MOVEMENT_CAUSES.Friction) {
          const belowMovement = pendingMovements.find((movement) => {
            return movement.position.x === pendingMovement.position.x
              && movement.position.y === pendingMovement.position.y + 1
          })

          if (belowMovement.cancelled) {
            pendingMovement.cancelled = true
            continue
          }
        }

        const aheadMovement = pendingMovements.find((movement) => {
          return movement.position.x === pendingMovement.position.x + pendingMovement.dir
            && movement.position.y === pendingMovement.position.y
        })

        if (aheadMovement != null) {
          if (aheadMovement.cancelled != null) {
            pendingMovement.cancelled = aheadMovement.cancelled
          } else {
            allResolved = false
          }
        } else {
          pendingMovement.cancelled = false
        } 
      }
    }

    if (allResolved) {
      break
    }
  }
}