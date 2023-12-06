import { OBJECT_TYPES, OBJECT_GROUPS } from './level'
import { GRAVITY_CELLS_PER_SECOND_2 } from './physics'
import { MOVEMENT } from './input'
import { STATE } from './gameState'

const MOVEMENT_CAUSES = {
  Push: 0,
  Friction: 1
}

const OPPOSITE_MOVEMENTS = {
  [MOVEMENT.Up]: MOVEMENT.Down,
  [MOVEMENT.Right]: MOVEMENT.Left,
  [MOVEMENT.Down]: MOVEMENT.Up,
  [MOVEMENT.Left]: MOVEMENT.Right,
}

export function applyRules(gameState, audio, event) {
  const level = gameState.level

  const animations = []

  let pendingFalls = []
  let falls = []

  for (let y = 0; y < level.data.length; y++) {
    for (let x = 0; x < level.data[0].length; x++) {
      if ((level.data[y][x] & (OBJECT_TYPES.Box | OBJECT_GROUPS.Path)) === 0) {
        continue
      }

      animations.push({
        fromPosition: { x, y },
        toPosition: { x, y },
        objectTypes: level.data[y][x],
        durationSeconds: 0.1
      })

      if (level.data[y][x] & OBJECT_TYPES.Box) {
        if ((level.data[y + 1][x] & OBJECT_GROUPS.Solid) === 0) {
          pendingFalls.push({
            position: { x, y }
          })
        }
      }
    }
  }

  if (event.type === 'end') {
    animations.push({
      fromPosition: { x: gameState.player.position.x, y: gameState.player.position.y },
      toPosition: { x: Math.floor(gameState.player.position.x) + 0.5, y: Math.floor( gameState.player.position.y) + 0.5 },
      objectTypes: 'end',
      durationSeconds: 2,
      tween: 'fast'
    })
    return [null, true, animations]
  }

  if (event.type === 'plant-move' || gameState.plantMovementFrom != null) {
    const eyeAnimationIndex = animations.push({
      fromPosition: { x: gameState.plant.position.x, y: gameState.plant.position.y },
      toPosition: { x: gameState.plant.position.x, y: gameState.plant.position.y },
      objectTypes: 'plant-eye',
      durationSeconds: 0.03,
    }) - 1

    let enteringExistingPath = false

    const currentCell = level.data[gameState.plant.position.y][gameState.plant.position.x]

    let movement = null
    if (gameState.plantMovementFrom != null) {
      movement = (currentCell >> 4) & ~gameState.plantMovementFrom
    } else {
      movement = event.dir
    }

    const nextPosition = {
      x: gameState.plant.position.x + (movement === MOVEMENT.Left ? -1 : (movement === MOVEMENT.Right ? 1 : 0)),
      y: gameState.plant.position.y + (movement === MOVEMENT.Up ? -1 : (movement === MOVEMENT.Down ? 1 : 0))
    }

    const oppositeMovement = OPPOSITE_MOVEMENTS[movement]

    const path = movement << 4
    const oppositePath = oppositeMovement << 4

    if (nextPosition.y < 0 || (gameState.plantMovementFrom == null && (currentCell & path))) {
      // Trying to move backwards
      return [null, false, null]
    }

    if (level.hasObject(nextPosition, OBJECT_GROUPS.Path)) {
      if (!level.hasObject(nextPosition, oppositePath)) {
        if (gameState.plantMovementFrom == null) {
          // Trying to move into existing path that isn't pointing the right way
          return [null, false, null]
        } else {
          // Turn around
          gameState.plantMovementFrom = movement
          return [{ type: 'again' }, false, null]
        }
      }

      enteringExistingPath = true
    }

    gameState.plantEyeDir = movement

    level.addObject(gameState.plant.position, path)

    if (level.hasObject(nextPosition, OBJECT_GROUPS.Solid)) {
      level.addObject(nextPosition, oppositePath)

      gameState.plant.position = nextPosition
    } else {
      gameState.player.position.x = nextPosition.x + 0.5
      gameState.player.position.y = nextPosition.y + 0.5
      gameState.isPlant = false
      audio.playSound('emerge')
    }

    animations[eyeAnimationIndex].toPosition.x = nextPosition.x
    animations[eyeAnimationIndex].toPosition.y = nextPosition.y

    const growPosition = {
      x: (gameState.plant.position.x + nextPosition.x) / 2,
      y: (gameState.plant.position.y + nextPosition.y) / 2
    }

    if (gameState.gameState !== STATE.Intro || (gameState.introSteps % 2) === 1) {
      audio.playSound('grow')
    }
    if (gameState.gameState === STATE.Intro) {
      gameState.introSteps += 1
    }

    if (enteringExistingPath) {
      gameState.plantMovementFrom = oppositeMovement
      animations[eyeAnimationIndex].duration = 0.1
      // Automated movement
      return [{ type: 'again' }, event.type !== 'again', animations]
    } else {
      gameState.plantMovementFrom = null
      animations.push({
        fromPosition: growPosition,
        toPosition: growPosition,
        objectTypes: 'grow',
        durationSeconds: 0.03,
        type: movement
      })
    }

    // Normal movement
    return [null, event.type !== 'again', animations]
  }

  const playerAnimationIndex = animations.push({
    fromPosition: { x: gameState.player.position.x, y: gameState.player.position.y },
    toPosition: { x: gameState.player.position.x, y: gameState.player.position.y },
    objectTypes: null,
    durationSeconds: 0.2,
    type: 'push'
  }) - 1

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

  if (event.type === 'push' && (event.dir === MOVEMENT.Right || event.dir === MOVEMENT.Left)) {
    const pushedPosition = {
      x: event.position.x + (event.dir === MOVEMENT.Right ? 1 : -1),
      y: event.position.y
    }

    if (level.hasObject(pushedPosition, OBJECT_TYPES.Box)) {
      pendingMovements.push({
        position: pushedPosition,
        dir: event.dir === MOVEMENT.Right ? 1 : -1,
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
    movement.objectTransfer = level.getObjects(fromPosition)
    level.clear(fromPosition)
  }

  for (const movement of movements) {
    const toPosition = {
      x: movement.position.x + movement.dir,
      y: movement.position.y
    }

    level.addObject(toPosition, movement.objectTransfer)

    for (const animation of animations) {
      if (animation.fromPosition.x === movement.position.x && animation.fromPosition.y === movement.position.y) {
        animation.toPosition = toPosition
      }
    }
  }

  if (falls.length > 0) {
    for (const fall of falls) {
      fall.objectTransfer = level.getObjects(fall.fromPosition)
      level.clear(fall.fromPosition)
    }

    let squisherAnimation = null

    for (const fall of falls) {
      level.addObject(fall.toPosition, fall.objectTransfer)

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
      animations[playerAnimationIndex].fromPosition = squishPosition
      animations[playerAnimationIndex].toPosition = squishPosition
      animations[playerAnimationIndex].objectTypes = 'squish'
      animations[playerAnimationIndex].durationSeconds = 0.1
      animations[playerAnimationIndex].delaySeconds = squisherAnimation.squishSeconds

      const squishGooPosition = { x: squishPosition.x, y: squishPosition.y + 1 }
      animations.push({
        fromPosition: squishGooPosition,
        toPosition: squishGooPosition,
        objectTypes: 'squishgoo',
        durationSeconds: 0.5,
        delaySeconds: squisherAnimation.squishSeconds + 0.07,
        type: 'push'
      })

      if (level.hasObject(squishGooPosition, OBJECT_TYPES.PathUp)) {
        gameState.plantMovementFrom = MOVEMENT.Up
      }

      if (level.hasObject(squishGooPosition, OBJECT_GROUPS.Path & ~OBJECT_TYPES.PathUp)) {
        gameState.dead = true
        return [null, true, null]
      }

      level.addObject(squishGooPosition, OBJECT_TYPES.PathUp)

      gameState.plant.position.x = squishGooPosition.x
      gameState.plant.position.y = squishGooPosition.y
      gameState.isPlant = true
      gameState.lastGroundPosition = null
    }

    animations.fall = true

    return [null, true, animations]
  }

  if (event.type === 'push') {
    const pushedPosition = {
      x: event.position.x + (event.dir === MOVEMENT.Right ? 1 : (event.dir === MOVEMENT.Left ? -1 : 0)),
      y: event.position.y + (event.dir === MOVEMENT.Down ? 1 : (event.dir === MOVEMENT.Up ? -1 : 0))
    }
    if ((pendingMovements.length > 0 && pendingMovements[0].cancelled) || (pendingMovements.length === 0 && level.hasObject(pushedPosition, OBJECT_GROUPS.Solid))) {
      if (level.hasObject(pushedPosition, OPPOSITE_MOVEMENTS[event.dir] << 4)) {
        gameState.plant.position.x = pushedPosition.x
        gameState.plant.position.y = pushedPosition.y
        gameState.isPlant = true
        gameState.lastGroundPosition = null
        gameState.plantMovementFrom = OPPOSITE_MOVEMENTS[event.dir]

        animations[playerAnimationIndex] = {
          fromPosition: { x: event.position.x, y: event.position.y },
          toPosition:  { x: event.position.x, y: event.position.y },
          objectTypes: 'enter',
          durationSeconds: 0.1,
          type: event.dir
        }

        audio.playSound('enter')

        return [{ type: 'again' }, true, animations]
      }
    }
  }

  if (event.type === 'push' && pendingMovements.length > 0 && !pendingMovements[0].cancelled) {
    animations[playerAnimationIndex].toPosition = {
      x: gameState.player.position.x + (event.dir === MOVEMENT.Right ? 1 : -1),
      y: gameState.player.position.y
    }
    animations[playerAnimationIndex].type = 'push'
    gameState.player.position.x = animations[playerAnimationIndex].toPosition.x
    for (const animation of animations) {
      if (animation.objectTypes & OBJECT_TYPES.Box) {
        animation.durationSeconds = 0.2
      }
    }
    audio.playSound('push')
    return [{ type: 'again' }, true, animations]
  }

  return [null, false, null]
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