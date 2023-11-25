import InputHandler, { MOVEMENT } from './input'
import GameState from './gameState'
import { updatePhysics, GRAVITY_CELLS_PER_SECOND_2 } from './physics'
import Renderer from './renderer'
import Level, { OBJECT_TYPES, OBJECT_GROUPS } from './level'
import { applyRules } from './rules'
import AnimationHandler from './animation'

window.onload = () => {
  const level = new Level()
  const gameState = new GameState(level)
  
  const spritesheet = new Image()
  spritesheet.src = 'spritesheet.png'

  spritesheet.onload = () => {
    const animationHandler = new AnimationHandler()

    const containerElement = document.getElementById('container')
    const renderer = new Renderer(containerElement, gameState, animationHandler, spritesheet)

    const inputHandler = new InputHandler()

    let previousTimestamp = null

    const startState = gameState.serialize()
    const undoStack = [startState]

    let nextFrameEvent = null

    const tick = (timestamp) => {
      if (previousTimestamp != null) {
        let deltaTime = timestamp - previousTimestamp

        if (inputHandler.skipFrame) {
          deltaTime *= 10
        }

        if (deltaTime > 50) {
          deltaTime = 50
        }

        const fps = 1000 / deltaTime

        if (inputHandler.restart) {
          const priorState = gameState.serialize()

          const restoreState = undoStack[0]
          gameState.deserialize(restoreState)

          undoStack.push(priorState)
          animationHandler.clear()
          inputHandler.restart = false
        }

        if (inputHandler.undo) {
          const restoreState = undoStack.length > 1 ? undoStack.pop() : undoStack[0]
          gameState.deserialize(restoreState)
          animationHandler.clear()
          inputHandler.undo = false
        }

        gameState.pushHappening = null

        if (!animationHandler.hasPendingTransactions()) {
          const priorGroundPosition = gameState.lastGroundPosition
          const priorGroundFacing = gameState.lastGroundFacing

          let { event, physicsChanged } = nextFrameEvent == null
            ? updatePhysics(gameState, inputHandler, timestamp, fps)
            : { event: nextFrameEvent, physicsChanged: false }

          if (nextFrameEvent !== null) {
            nextFrameEvent = null
          }

          if (event != null) {
            const priorState = gameState.serialize()

            const animations = applyRules(gameState, event)

            if (event.type === 'push' || event.type === 'again') {
              if (event.type === 'push') {
                gameState.shortenPushTime = false

                if (animations) {
                  gameState.rightPushStartTimestamp = null
                  gameState.leftPushStartTimestamp = null
                }
              }
              gameState.pushHappening = true
            }

            if (animations) {
              nextFrameEvent = { type: 'again' }
              animationHandler.queueTransaction(animations)
              if (event.type !== 'again') {
                undoStack.push(priorState)
              }
            }
          } else {
            if (physicsChanged) {
              const restoreState = gameState.serialize(priorGroundPosition, priorGroundFacing)
              undoStack.push(restoreState)
            }
          }
        }

        if (gameState.pushHappening == null) {
          gameState.pushHappening =
            (gameState.leftPushStartTimestamp != null && (timestamp - gameState.leftPushActualStartTimestamp) > 150) ||
            (gameState.rightPushStartTimestamp != null && (timestamp - gameState.rightPushActualStartTimestamp) > 150)
        }

        const activeTransaction = animationHandler.getActiveTransaction(timestamp)
        const transaction = activeTransaction || getStaticTransaction(gameState, timestamp)
        const [ visuals, allFinished ] = interpolateVisuals(transaction, timestamp)

        if (allFinished) {
          animationHandler.stopTransaction()
        }

        const horizontalMovement = inputHandler.getHorizontalMovement()
        if (horizontalMovement == null) {
          gameState.shortenPushTime = false
        }

        let overridePushAnimation = false
        if (transaction.fall) {
          overridePushAnimation = gameState.playerFacing !== horizontalMovement
          gameState.shortenPushTime = true

          if (!overridePushAnimation) {
            const pushedPosition = {
              x: Math.floor(gameState.player.position.x + (horizontalMovement === MOVEMENT.Right ? 1 : -1)),
              y: Math.floor(gameState.player.position.y)
            }

            if (!(gameState.level.data[pushedPosition.y][pushedPosition.x] & OBJECT_GROUPS.Solid)) {
              overridePushAnimation = true
            }
          }
        }

        if (gameState.pushHappening) {
          const pushedPosition = {
            x: Math.floor(gameState.player.position.x + (horizontalMovement === MOVEMENT.Right ? 1 : -1)),
            y: Math.floor(gameState.player.position.y)
          }

          if (!(gameState.level.data[pushedPosition.y][pushedPosition.x] & OBJECT_GROUPS.Solid)) {
            overridePushAnimation = true
          }
        }

        if (activeTransaction == null && horizontalMovement !== gameState.playerFacing) {
          overridePushAnimation = true
          gameState.leftPushActualStartTimestamp = null
          gameState.rightPushActualStartTimestamp = null
        }

        renderer.render(gameState, visuals, timestamp, overridePushAnimation)
      }

      previousTimestamp = timestamp
      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }
}

function getStaticTransaction(gameState, timestamp) {
  const level = gameState.level

  const transaction = [{
    fromPosition: { x: gameState.player.position.x, y: gameState.player.position.y },
    toPosition: { x: gameState.player.position.x, y: gameState.player.position.y },
    objectTypes: null,
    startTimestamp: timestamp,
    endTimestamp: Infinity,
    type: gameState.pushHappening ? 'push' : null
  }]

  for (let y = 0; y < level.data.length; y++) {
    for (let x = 0; x < level.data[0].length; x++) {
      if ((level.data[y][x] & OBJECT_GROUPS.Pushable) === 0) {
        continue
      }

      transaction.push({
        fromPosition: { x, y },
        toPosition: { x, y },
        objectTypes: level.data[y][x],
        startTimestamp: timestamp,
        endTimestamp: Infinity
      })
    }
  }

  return transaction
}

function interpolateVisuals (activeTransaction, timestamp) {
  let allFinished = true

  return [
    activeTransaction.map((animation) => {
      const t = Math.min(1, (timestamp - animation.startTimestamp) / (animation.endTimestamp - animation.startTimestamp))
      const vector = {
        x: animation.toPosition.x - animation.fromPosition.x,
        y: animation.toPosition.y - animation.fromPosition.y
      }
      if (t < 1) {
        allFinished = false
      }
      const tween = animation.tween === 'gravity'
        ? (fromPosition, vector, t) => {
          const timePassed = t * animation.durationSeconds
          const distance = 0.5 * GRAVITY_CELLS_PER_SECOND_2 * timePassed * timePassed
          return fromPosition + (distance * (vector > 0))
        }
        : (fromPosition, vector, t) => fromPosition + t * vector

      return {
        position: {
          x: tween(animation.fromPosition.x, vector.x, t),
          y: tween(animation.fromPosition.y, vector.y, t)
        },
        objectTypes: animation.objectTypes,
        type: animation.type
      }
    }),
    allFinished
  ]
}