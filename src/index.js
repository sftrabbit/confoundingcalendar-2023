import InputHandler from './input'
import GameState from './gameState'
import { updatePhysics } from './physics'
import Renderer from './renderer'
import Level from './level'
import { applyRules } from './rules'

window.onload = () => {
  const level = new Level()
  const gameState = new GameState(level)
  
  const spritesheet = new Image()
  spritesheet.src = 'spritesheet.png'

  spritesheet.onload = () => {
    const containerElement = document.getElementById('container')
    const renderer = new Renderer(containerElement, gameState, spritesheet)

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
          if (undoStack.length > 1) {
            const restoreState = undoStack.pop()
            gameState.deserialize(restoreState)
          }
          inputHandler.undo = false
        }

        const event = updatePhysics(gameState, inputHandler, timestamp, fps)
        if (event != null) {
          const priorState = gameState.serialize()
          const anythingChanged = applyRules(gameState, event)
          if (anythingChanged) {
            undoStack.push(priorState)
          }
        }
        
        renderer.render(gameState, timestamp)
      }

      previousTimestamp = timestamp
      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }
}
