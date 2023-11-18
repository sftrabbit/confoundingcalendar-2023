import { OBJECT_TYPES } from './level'

const CELL_DIMENSIONS = {
  width: 8,
  height: 8
}

const CLEAR_COLOR = '#0e0e12'

class Renderer {
  constructor (containerElement, gameState) {
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

      this.render(gameState)
    })

    resizeObserver.observe(this.screenCanvas)
  }

  render (gameState) {
    this.screenContext.save()
    this.renderContext.save()

    clearCanvas(this.screenContext, CLEAR_COLOR)
    clearCanvas(this.renderContext, CLEAR_COLOR)

    for (let x = 0; x < gameState.level.width; x++) {
      for (let y = 0; y < gameState.level.height; y++) {
        for (const object of gameState.level.data[y][x]) {
          this.renderContext.fillStyle = object === OBJECT_TYPES.Wall ? '#ffffff' : '#00ff00'
          this.renderContext.fillRect(
            x * CELL_DIMENSIONS.width, y * CELL_DIMENSIONS.height,
            CELL_DIMENSIONS.width, CELL_DIMENSIONS.height
          )
        }
      }
    }

    this.renderContext.fillStyle = '#ff0000'
    this.renderContext.beginPath()
    this.renderContext.arc(
      Math.floor(gameState.player.position.x * CELL_DIMENSIONS.width), Math.floor(gameState.player.position.y * CELL_DIMENSIONS.height),
      CELL_DIMENSIONS.height / 2,
      0, 2 * Math.PI
    )
    this.renderContext.fill()
    this.renderContext.closePath()

    const screenAspectRatio = this.screenCanvas.clientWidth / this.screenCanvas.clientHeight
    const renderAspectRatio = gameState.level.width / gameState.level.height

    const scaleFactor = screenAspectRatio > renderAspectRatio
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
      centerPosition.x - Math.floor((this.renderCanvas.width * scaleFactor) / 2), centerPosition.y - Math.floor((this.renderCanvas.height * scaleFactor) / 2),
      this.renderCanvas.width * scaleFactor, this.renderCanvas.height * scaleFactor
    )

    this.screenContext.restore()
    this.renderContext.restore()
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