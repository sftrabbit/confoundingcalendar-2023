import { OBJECT_TYPES, OBJECT_GROUPS } from './level'

const MOVEMENT_CAUSES = {
  Push: 0,
  Friction: 1
}

export function applyRules(gameState, event) {
  const level = gameState.level

  let pendingMovements = []

  if (event.type === 'push') {
    const pushedPosition = {
      x: event.position.x + event.dir,
      y: event.position.y
    }

    if (level.hasObject(pushedPosition, OBJECT_GROUPS.Pushable)) {
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
  }

  if (event.type === 'push' && pendingMovements.length > 0 && !pendingMovements[0].cancelled) {
    gameState.player.position.x += event.dir
    return true
  }

  return false
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