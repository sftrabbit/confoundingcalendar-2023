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

  const containerElement = document.getElementById('container')
  const renderer = new Renderer(containerElement, gameState, spritesheet)

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

      const event = updatePhysics(gameState, inputHandler, timestamp, fps)
      if (event != null) {
        applyRules(gameState, event)
      }
      
      renderer.render(gameState)
    }

    previousTimestamp = timestamp
    requestAnimationFrame(tick)
  }

  spritesheet.onload = () => {
    requestAnimationFrame(tick)
  }
}
