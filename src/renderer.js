import { OBJECT_TYPES, OBJECT_GROUPS } from './level'
import { MOVEMENT } from './input'
import { STATE } from './gameState'

const CELL_DIMENSIONS = {
  width: 8,
  height: 8
}

const CLEAR_COLOR = '#0e0e12'
const BACKGROUND_COLOR = '#a6a6bf'

class Renderer {
  constructor (containerElement, gameState, animationHandler, audio, spritesheet) {
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
    this.showTouchControls = false

    this.showDpadPrompt = false
    this.showJumpPrompt = false

    this.audio = audio
  }

  render (gameState, visuals, timestamp, overridePushAnimation) {
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
          const position = { x, y }
          const cell = gameState.level.getObjects(position)
          if (cell & OBJECT_GROUPS.Decoration) {
            const spriteX = 7 * 8
            this.renderContext.drawImage(
              this.spritesheet,
              spriteX, (cell & OBJECT_TYPES.PillarTop) ? 0 : ((cell & OBJECT_TYPES.PillarMiddle) ? 8 : (cell & OBJECT_TYPES.PillarBottom) ? 16 : ((cell & OBJECT_TYPES.Alcove) ? 24 : 32)), 8, 8,
              drawPosition.x, drawPosition.y,
              8, 8
            )
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
    }

    for (const visual of visuals) {
      const drawPosition = {
        x: Math.floor(visual.position.x * CELL_DIMENSIONS.width),
        y: Math.floor(visual.position.y * CELL_DIMENSIONS.height)
      }

      if (visual.objectTypes === 'squish') {
        const x = gameState.playerFacing === MOVEMENT.Right ? 0 : 8
        const frame = Math.floor(Math.max(0, timestamp - visual.startTimestamp) / (100 / 8))
        this.renderContext.drawImage(
          this.spritesheet,
          x, (16 + frame) * 8, 8, 8,
          drawPosition.x, drawPosition.y,
          8, 8
        )
      } else if (visual.objectTypes === 'squishgoo') {
        if (timestamp < visual.startTimestamp) {
          continue
        }
        const frame = Math.floor((timestamp - visual.startTimestamp) / (500 / 4))
        this.renderContext.drawImage(
          this.spritesheet,
          16, (1 + frame) * 8, 8, 8,
          drawPosition.x, drawPosition.y,
          8, 8
        )
      } else if (visual.objectTypes === 'plant-eye') {
        const frame = gameState.plantEyeDir === MOVEMENT.Up
          ? 0
          : (gameState.plantEyeDir === MOVEMENT.Right
            ? 1
            : (gameState.plantEyeDir === MOVEMENT.Down ? 2 : 3)
            )

        this.renderContext.drawImage(
          this.spritesheet,
          24, (5 + frame) * 8, 8, 8,
          drawPosition.x, drawPosition.y,
          8, 8
        )
      } else if (visual.objectTypes & (OBJECT_TYPES.Box | OBJECT_GROUPS.Path)) {
        if (visual.objectTypes & OBJECT_TYPES.Box) {
          this.renderContext.drawImage(
            this.spritesheet,
            16, 0, 8, 8,
            drawPosition.x, drawPosition.y,
            8, 8
          )
        }

        if (visual.objectTypes & OBJECT_GROUPS.Path) {
          for (let i = 0; i < 4; i++) {
            const objectType = 1 << (4 + i)
            if (visual.objectTypes & objectType) {
              this.renderContext.drawImage(
                this.spritesheet,
                24, 8 + (i * 8), 8, 8,
                drawPosition.x, drawPosition.y,
                8, 8
              )
            }
          }
        }
      } else if (visual.objectTypes === 'grow') {
        const spriteX = ((visual.type === MOVEMENT.Down) ? 0 : ((visual.type === MOVEMENT.Left) ? 1 : ((visual.type === MOVEMENT.Up) ? 2 : 3)))
        const frame = Math.floor((timestamp - visual.startTimestamp) / 80)
        this.renderContext.drawImage(
          this.spritesheet,
          (5 + spriteX) * 8, (6 + frame) * 8, 8, 8,
          drawPosition.x + ((visual.type === MOVEMENT.Left) ? 4 : ((visual.type === MOVEMENT.Right) ? -4 : 0)),
          drawPosition.y + ((visual.type === MOVEMENT.Down) ? -4 : ((visual.type === MOVEMENT.Up) ? 4 : 0)),
          8, 8
        )
      } else if (visual.objectTypes === 'enter') {
        const yOffset = (visual.type & (MOVEMENT.Down | MOVEMENT.Up)) ? (gameState.playerFacing === MOVEMENT.Right ? 3 : 0) : 0
        const xOffset = (visual.type === MOVEMENT.Down ? 0 : (visual.type === MOVEMENT.Up ? 1 : (visual.type === MOVEMENT.Right ? 2 : 3)))
        const frame = Math.floor((timestamp - visual.startTimestamp) / 60)
        this.renderContext.drawImage(
          this.spritesheet,
          (5 + xOffset) * 8, (10 + yOffset + frame) * 8, 8, 8,
          drawPosition.x,
          drawPosition.y,
          8, 8
        )
      } else if (visual.objectTypes === 'end') {
        const frame = Math.min(7, Math.floor((timestamp - visual.startTimestamp) / 120))
        this.renderContext.drawImage(
          this.spritesheet,
          9 * 8, frame * 8, 8, 8,
          drawPosition.x - 4,
          drawPosition.y - 4,
          8, 8
        )
      } else {
        const playerSpriteSourcePosition = getPlayerSpritePosition(gameState, timestamp, visual.type, overridePushAnimation)
        this.renderContext.drawImage(
          this.spritesheet,
          playerSpriteSourcePosition[0], playerSpriteSourcePosition[1], 8, 8,
          drawPosition.x - (CELL_DIMENSIONS.width / 2), drawPosition.y - (CELL_DIMENSIONS.height / 2),
          8, 8
        )
        if (playerSpriteSourcePosition[0] >= (5 * 8) && playerSpriteSourcePosition[1] >= 2 * 8 && playerSpriteSourcePosition[1] <= 4 * 8) {
          this.renderContext.drawImage(
            this.spritesheet,
            playerSpriteSourcePosition[0], playerSpriteSourcePosition[1] + 2 * 8, 8, 8,
            drawPosition.x - (CELL_DIMENSIONS.width / 2), drawPosition.y - (CELL_DIMENSIONS.height / 2) - CELL_DIMENSIONS.height,
            8, 8
          )
        }
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
    if (gameState.gameState === STATE.End) {
      if (timestamp > (gameState.endTimestamp + 1000)) {
        const frame = Math.min(5, Math.floor((timestamp - (gameState.endTimestamp + 1000)) / 100))
        for (let x = 0; x < gameState.level.width; x++) {
          for (let y = 0; y < gameState.level.height; y++) {
            const drawPosition = {
              x: x * CELL_DIMENSIONS.width,
              y: y * CELL_DIMENSIONS.height
            }
            this.renderContext.drawImage(
              this.spritesheet,
              10 * 8, frame * 8, 8, 8,
              drawPosition.x, drawPosition.y,
              8, 8
            )
          }
        }
      }

      if (timestamp > (gameState.endTimestamp + 2000)) {
        if (!gameState.endingSoundPlayed) {
          this.audio.playSound('end')
          gameState.endingSoundPlayed = true
        }
        this.renderContext.drawImage(
          this.spritesheet,
          2 * 8, 16 * 8, 9 * CELL_DIMENSIONS.width, 8,
          9 * CELL_DIMENSIONS.width, 8 * CELL_DIMENSIONS.width,
          9 * CELL_DIMENSIONS.width, 8
        )
      }
    } else if (gameState.gameState === STATE.Intro) {
      if (timestamp >= gameState.introTimestamp) {
        const frame = 5 - Math.min(6, Math.floor((timestamp - gameState.introTimestamp) / 100))
        if (frame >= 0) {
          for (let x = 0; x < gameState.level.width; x++) {
            for (let y = 0; y < gameState.level.height; y++) {
              const drawPosition = {
                x: x * CELL_DIMENSIONS.width,
                y: y * CELL_DIMENSIONS.height
              }
              this.renderContext.drawImage(
                this.spritesheet,
                10 * 8, frame * 8, 8, 8,
                drawPosition.x, drawPosition.y,
                8, 8
              )
            }
          }
        }
      }
    }

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

    if (gameState.gameState === STATE.Play) {
      if (this.showTouchControls) {
        this.screenContext.drawImage(
          this.spritesheet,
          2 * 8, 17 * 8 + 24 * this.undoButtonPressed,
          24, 24,
          this.screenCanvas.width - (5 + 24) * this.scaleFactor * 2, 5 * this.scaleFactor,
          24 * this.scaleFactor, 24 * this.scaleFactor
        )

        this.screenContext.drawImage(
          this.spritesheet,
          5 * 8, 17 * 8 + 24 * this.restartButtonPressed,
          24, 24,
          this.screenCanvas.width - (5 + 24) * this.scaleFactor, 5 * this.scaleFactor,
          24 * this.scaleFactor, 24 * this.scaleFactor
        )

        const dpadY = Math.floor(this.screenCanvas.height / 2)
        const dpadX = 130

        const dpadWidth = 39

        if (this.showDpadPrompt) {
          this.screenContext.drawImage(
            this.spritesheet,
            8 * 8, 20 * 8,
            dpadWidth, dpadWidth,
            dpadX - Math.floor(dpadWidth / 2) * this.scaleFactor,
            dpadY - Math.floor(dpadWidth / 2) * this.scaleFactor,
            dpadWidth * this.scaleFactor, dpadWidth * this.scaleFactor
          )
        }

        if (this.showJumpPrompt) {
          const jumpButtonWidth = 38
          const jumpButtonHeight = 15

          this.screenContext.drawImage(
            this.spritesheet,
            2 * 8, 23 * 8,
            jumpButtonWidth, jumpButtonHeight,
            this.screenCanvas.width - dpadX - Math.floor(jumpButtonWidth / 2) * this.scaleFactor,
            dpadY - Math.floor(jumpButtonHeight / 2) * this.scaleFactor,
            jumpButtonWidth * this.scaleFactor, jumpButtonHeight * this.scaleFactor
          )
        }
      } else {
        this.screenContext.drawImage(
          this.spritesheet,
          8 * 8, 17 * 8,
          64, 24,
          this.screenCanvas.width - (5 + 64) * this.scaleFactor, this.screenCanvas.height - (5 + 24) * this.scaleFactor,
          64 * this.scaleFactor, 24 * this.scaleFactor
        )
      }
    }

    if (gameState.gameState === STATE.Title) {
      clearCanvas(this.screenContext, CLEAR_COLOR)
      const textWidth = 53
      const textHeight = 10
      this.screenContext.drawImage(
        this.spritesheet,
        7 * 8, 14 * 8, textWidth, textHeight,
        this.screenCanvas.width / 2 - Math.floor(textWidth / 2) * this.scaleFactor,
        this.screenCanvas.height / 2 - Math.floor(textHeight / 2) * this.scaleFactor,
        textWidth * this.scaleFactor, textHeight * this.scaleFactor
      )
    }

    // this.screenContext.beginPath()
    // this.screenContext.fillStyle = '#ff000088'
    // this.screenContext.rect(0, 0, dpadX * 2, this.screenCanvas.height)
    // this.screenContext.fill()

    // this.screenContext.beginPath()
    // this.screenContext.fillStyle = '#00ff0088'
    // this.screenContext.rect(
    //   Math.floor(this.screenCanvas.width / 2), 0,
    //   Math.floor(this.screenCanvas.width / 2), this.screenCanvas.height
    // )
    // this.screenContext.fill()

    this.screenContext.restore()
    this.renderContext.restore()
  }
}

function getPlayerSpritePosition (gameState, timestamp, type, overridePushAnimation) {
  const x = gameState.playerFacing === MOVEMENT.Right ? 0 : 8
  if (gameState.playerJumpingDir == null) {
    if (gameState.playerStartedMovingTimestamp == null || overridePushAnimation) {
      if (gameState.downPushActualStartTimestamp != null) {
        return [5 * 8, (9 + (gameState.playerFacing === MOVEMENT.Right) * 3)* 8]
      } else if (gameState.upPushActualStartTimestamp != null) {
        return [6 * 8, (9 + (gameState.playerFacing === MOVEMENT.Right) * 3) * 8]
      } else {
        return [x, 0]
      }
    } else {
      let yOffset = 0
      if (type === 'push') {
        const halfPush =
          (gameState.leftPushStartTimestamp != null && (timestamp - gameState.leftPushActualStartTimestamp) <= 225) ||
          (gameState.rightPushStartTimestamp != null && (timestamp - gameState.rightPushActualStartTimestamp) <= 255)
        if (halfPush) {
          return [x, 8 * 15]
        }
        yOffset = 8 * 8
      }
      return [x, 8 + ((Math.floor((timestamp - gameState.playerStartedMovingTimestamp) / 200) % 6) * 8) + yOffset]
    }
  } else {
    return [x + 5 * 8, (gameState.playerJumpingDir > 0
      ? 8 + (gameState.player.velocity.y > 9 ? (gameState.player.velocity.y > 13 ? 2 : 1) : 0) * 8
      : 0
    )]
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
