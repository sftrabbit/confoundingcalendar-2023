import { OBJECT_TYPES } from './level'
import { MOVEMENT } from './input'

const CELL_DIMENSIONS = {
  width: 8,
  height: 8
}

const CLEAR_COLOR = '#0e0e12'
const BACKGROUND_COLOR = '#a6a6bf'

class Renderer {
  constructor (containerElement, gameState, animationHandler, spritesheet) {
    this.screenCanvas = containerElement.querySelector('canvas')
    this.screenContext = this.screenCanvas.getContext('2d')

    this.renderCanvas = document.createElement('canvas')
    this.renderContext = this.renderCanvas.getContext('2d')

    const resizeObserver = new ResizeObserver((elements) => {
      updateCanvasScaling(this.screenContext)

      this.renderCanvas.width = gameState.level.width * CELL_DIMENSIONS.width
      this.renderCanvas.height = gameState.level.height * CELL_DIMENSIONS.height

      const renderContext = this.renderCanvas.getContext('2d')
      renderContext.imageSmoothingEnabled = false

      // this.render(gameState)
    })

    resizeObserver.observe(this.screenCanvas)

    this.animationHandler = animationHandler
    this.spritesheet = spritesheet
    this.scaleFactor = 1

    this.undoButtonPressed = false
    this.restartButtonPressed = false
  }

  render (gameState, visuals, timestamp) {
    this.screenContext.save()
    this.renderContext.save()

    clearCanvas(this.screenContext, CLEAR_COLOR)
    clearCanvas(this.renderContext, BACKGROUND_COLOR)

    for (let x = 0; x < gameState.level.width; x++) {
      for (let y = 0; y < gameState.level.height; y++) {
        const cell = gameState.level.data[y][x]
        const drawPosition = {
          x: x * CELL_DIMENSIONS.width,
          y: y * CELL_DIMENSIONS.height
        }
        if (cell & OBJECT_TYPES.Wall) {
          this.renderContext.fillStyle = '#0e0e12'
          this.renderContext.fillRect(
            drawPosition.x, drawPosition.y,
            CELL_DIMENSIONS.width, CELL_DIMENSIONS.height
          )
          if (y > 0 && !(gameState.level.data[y - 1][x] & OBJECT_TYPES.Wall)) {
            this.renderContext.drawImage(
              this.spritesheet,
              4 * 8, 0, 8, 8,
              drawPosition.x, drawPosition.y,
              8, 8
            )
          }
          if (y < gameState.level.height - 1 && !(gameState.level.data[y + 1][x] & OBJECT_TYPES.Wall)) {
            this.renderContext.drawImage(
              this.spritesheet,
              4 * 8, 2 * 8, 8, 8,
              drawPosition.x, drawPosition.y,
              8, 8
            )
          }
          if (x > 0 && !(gameState.level.data[y][x - 1] & OBJECT_TYPES.Wall)) {
            this.renderContext.drawImage(
              this.spritesheet,
              4 * 8, 3 * 8, 8, 8,
              drawPosition.x, drawPosition.y,
              8, 8
            )
          }
          if (x < gameState.level.width - 1 && !(gameState.level.data[y][x + 1] & OBJECT_TYPES.Wall)) {
            this.renderContext.drawImage(
              this.spritesheet,
              4 * 8, 1 * 8, 8, 8,
              drawPosition.x, drawPosition.y,
              8, 8
            )
          }
        } else {
          this.renderContext.drawImage(
            this.spritesheet,
            24, 0, 8, 8,
            drawPosition.x, drawPosition.y,
            8, 8
          )
        }
      }
    }

    for (const visual of visuals) {
      const drawPosition = {
        x: Math.floor(visual.position.x * CELL_DIMENSIONS.width),
        y: Math.floor(visual.position.y * CELL_DIMENSIONS.height)
      }

      if (visual.objectTypes & OBJECT_TYPES.Box) {
        this.renderContext.drawImage(
          this.spritesheet,
          16, 0, 8, 8,
          drawPosition.x, drawPosition.y,
          8, 8
        )
      } else {
        const playerSpriteSourcePosition = getPlayerSpritePosition(gameState, timestamp, visual.type)
        this.renderContext.drawImage(
          this.spritesheet,
          playerSpriteSourcePosition[0], playerSpriteSourcePosition[1], 8, 8,
          drawPosition.x - (CELL_DIMENSIONS.width / 2), drawPosition.y - (CELL_DIMENSIONS.height / 2),
          8, 8
        )
      }
    }


    // this.renderContext.fillStyle = '#ff0000'
    // this.renderContext.beginPath()
    // this.renderContext.arc(
    //   Math.floor(gameState.player.position.x * CELL_DIMENSIONS.width), Math.floor(gameState.player.position.y * CELL_DIMENSIONS.height),
    //   CELL_DIMENSIONS.height / 2,
    //   0, 2 * Math.PI
    // )
    // this.renderContext.fill()
    // this.renderContext.closePath()

    const screenAspectRatio = this.screenCanvas.clientWidth / this.screenCanvas.clientHeight
    const renderAspectRatio = gameState.level.width / gameState.level.height

    this.scaleFactor = screenAspectRatio > renderAspectRatio
      ? Math.floor(this.screenCanvas.height / this.renderCanvas.height)
      : Math.floor(this.screenCanvas.width / this.renderCanvas.width)

    const centerPosition = {
      x: Math.floor(this.screenCanvas.width / 2),
      y: Math.floor(this.screenCanvas.height / 2)
    }

    this.screenContext.drawImage(
      this.renderCanvas,
      0, 0,
      this.renderCanvas.width, this.renderCanvas.height,
      centerPosition.x - Math.floor((this.renderCanvas.width * this.scaleFactor) / 2), centerPosition.y - Math.floor((this.renderCanvas.height * this.scaleFactor) / 2),
      this.renderCanvas.width * this.scaleFactor, this.renderCanvas.height * this.scaleFactor
    )

    this.screenContext.drawImage(
      this.spritesheet,
      5 * 8, 24 * this.undoButtonPressed,
      24, 24,
      this.screenCanvas.width - (5 + 24) * this.scaleFactor * 2, 5 * this.scaleFactor,
      24 * this.scaleFactor, 24 * this.scaleFactor
    )

    this.screenContext.drawImage(
      this.spritesheet,
      8 * 8, 24 * this.restartButtonPressed,
      24, 24,
      this.screenCanvas.width - (5 + 24) * this.scaleFactor, 5 * this.scaleFactor,
      24 * this.scaleFactor, 24 * this.scaleFactor
    )

    this.screenContext.drawImage(
      this.spritesheet,
      11 * 8, 0,
      62, 15,
      this.screenCanvas.width - (5 + 62) * this.scaleFactor, this.screenCanvas.height - (5 + 15) * this.scaleFactor,
      62 * this.scaleFactor, 15 * this.scaleFactor
    )

    // const touchDpadCenterY = Math.floor(this.screenCanvas.height / 2)
    // const touchDpadCenterX = 150
 
    // this.screenContext.beginPath()
    // this.screenContext.fillStyle = '#ff000088'
    // this.screenContext.rect(0, 0, touchDpadCenterX * 2, this.screenCanvas.height)
    // this.screenContext.fill()
 
    // this.screenContext.beginPath()
    // this.screenContext.fillStyle = '#00ff0088'
    // this.screenContext.rect(Math.floor(this.screenCanvas.width / 2), 0, Math.floor(this.screenCanvas.width / 2), this.screenCanvas.height)
    // this.screenContext.fill()


    this.screenContext.restore()
    this.renderContext.restore()
  }
}

function getPlayerSpritePosition (gameState, timestamp, type) {
  const x = gameState.playerFacing === MOVEMENT.Right ? 0 : 8
  if (gameState.playerJumpingDir == null) {
    if (gameState.playerStartedMovingTimestamp == null) {
      return [x, 0]
    } else {
      let yOffset = 0
      if (type === 'push') {
        yOffset = 8 * 8
      }
      return [x, 8 + ((Math.floor((timestamp - gameState.playerStartedMovingTimestamp) / 200) % 6) * 8) + yOffset]
    }
  } else {
    return [x, 7 * 8 + (gameState.playerJumpingDir > 0 ? 8 : 0)]
  }
}

function clearCanvas (context, color) {
  context.save()
  context.fillStyle = color
  context.fillRect(0, 0, context.canvas.width, context.canvas.height)
  context.restore()
}

function updateCanvasScaling(screenContext) {
  const screenCanvas = screenContext.canvas

  screenCanvas.width = screenCanvas.clientWidth
  screenCanvas.height = screenCanvas.clientHeight

  screenContext.imageSmoothingEnabled = false
}

export default Renderer
