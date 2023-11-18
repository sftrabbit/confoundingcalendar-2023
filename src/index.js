import InputHandler from './input'
import GameState from './gameState'
import { updatePhysics } from './physics'
import Renderer from './renderer'
import { loadLevel } from './level'

window.onload = () => {
  const level = loadLevel()
  const gameState = new GameState(level)

  const containerElement = document.getElementById('container')
  const renderer = new Renderer(containerElement, gameState)

  const inputHandler = new InputHandler()

  let previousTimestamp = null

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

      updatePhysics(gameState, inputHandler, timestamp, fps)
      
      renderer.render(gameState)
    }

    previousTimestamp = timestamp
    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}
