import InputHandler from './input'
import GameState from './gameState'
import { updatePhysics } from './physics'
import Renderer from './renderer'
import Level, { OBJECT_GROUPS } from './level'
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
          inputHandler.restart = false
        }

        if (inputHandler.undo) {
          const restoreState = undoStack.length > 1 ? undoStack.pop() : undoStack[0]
          gameState.deserialize(restoreState)
          inputHandler.undo = false
        }

        let pushHappening = false

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

            if (event.type === 'push') {
              pushHappening = true
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

        if (!pushHappening) {
          pushHappening = gameState.leftPushStartTimestamp != null || gameState.rightPushStartTimestamp != null
        }

        const activeTransaction = animationHandler.getActiveTransaction(timestamp) || getStaticTransaction(gameState, pushHappening, timestamp)
        const [ visuals, allFinished ] = interpolateVisuals(activeTransaction, timestamp)

        if (allFinished) {
          animationHandler.stopTransaction()
        }

        renderer.render(gameState, visuals, timestamp)
      }

      previousTimestamp = timestamp
      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }
}

function getStaticTransaction(gameState, pushHappening, timestamp) {
  const level = gameState.level

  const transaction = [{
    fromPosition: { x: gameState.player.position.x, y: gameState.player.position.y },
    toPosition: { x: gameState.player.position.x, y: gameState.player.position.y },
    objectTypes: null,
    startTimestamp: timestamp,
    endTimestamp: Infinity,
    type: pushHappening ? 'push' : null
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
      return {
        position: {
          x: animation.fromPosition.x + t * vector.x,
          y: animation.fromPosition.y + t * vector.y
        },
        objectTypes: animation.objectTypes,
        type: animation.type
      }
    }),
    allFinished
  ]
}