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

        if (!animationHandler.hasPendingTransactions()) {
          const priorGroundPosition = gameState.lastGroundPosition
          const priorGroundFacing = gameState.lastGroundFacing

          let { event, physicsChanged } = updatePhysics(gameState, inputHandler, timestamp, fps)

          if (event != null) {
            const priorState = gameState.serialize()

            const animations = applyRules(gameState, event)

            if (animations) {
              animationHandler.queueTransaction(animations)
              undoStack.push(priorState)
            }
          } else {
            if (physicsChanged) {
              const restoreState = gameState.serialize(priorGroundPosition, priorGroundFacing)
              undoStack.push(restoreState)
            }
          }
        }

        const activeTransaction = animationHandler.getActiveTransaction(timestamp) || getStaticTransaction(gameState, timestamp)
        const visuals = interpolateVisuals(activeTransaction, timestamp)

        renderer.render(gameState, visuals, timestamp)
      }

      previousTimestamp = timestamp
      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }
}

function getStaticTransaction(gameState, timestamp) {
  const level = gameState.level

  const transaction = []
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
  return activeTransaction.map((animation) => {
    const t = (timestamp - animation.startTimestamp) / (animation.endTimestamp - animation.startTimestamp)
    const vector = {
      x: animation.toPosition.x - animation.fromPosition.x,
      y: animation.toPosition.y - animation.fromPosition.y
    }
    return {
      position: {
        x: animation.fromPosition.x + t * vector.x,
        y: animation.fromPosition.y + t * vector.y
      },
      objectTypes: animation.objectTypes
    }
  })
}