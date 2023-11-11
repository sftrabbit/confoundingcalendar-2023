const spriteDimensions = {
  width: 8,
  height: 8
}

const playerPosition = {
  x: 10.5,
  y: 10.5
}

const playerVelocity = {
  x: 0,
  y: 0
}

const gravity = 0.0035

const levelMap = `
#########┗┛P┗┓#┗┓┏┛┏━┛┃#
#############┗━┓┃┗━┛G..┏
###############┗┛####..┃
#########....#######**.┃
#########.*..########┗━┛
########################
#.....#................#
#....┃#................#
#...#┗━................#
###....................#
#####..................#
#.....#..*....#........#
#....##..*........#..###
####.##..*...........*.#
########################
########################
########################
###############.......##
######┏┓#######.#####.##
######┗┛#######.......##
###############...G...##
###############.......##
################......##
########################
`.trim()

const OBJECTS = {
  Wall: 0,
}

const characterMap = {
  '#': [OBJECTS.Wall]
}

const clearColor = '#0e0e12'

window.onload = () => {
  const level = loadLevel();
  console.log(level)

  const container = document.getElementById('container')

  const screenCanvas = container.querySelector('canvas')
  const screenContext = screenCanvas.getContext('2d')

  const renderCanvas = document.createElement('canvas')

  const resizeObserver = new ResizeObserver((elements) => {
    updateCanvasScaling(screenContext)

    renderCanvas.width = level.width * spriteDimensions.width
    renderCanvas.height = level.height * spriteDimensions.height

    const renderContext = renderCanvas.getContext('2d')
    renderContext.imageSmoothingEnabled = false

    renderGame(screenContext, renderContext, level)
  })

  resizeObserver.observe(screenCanvas)

  let leftPressed = false
  let rightPressed = false

  const tick = () => {
    const renderContext = renderCanvas.getContext('2d')

    if (leftPressed) {
      playerVelocity.x = -0.04
    } else if (rightPressed) {
      playerVelocity.x = 0.04
    } else {
      if (playerVelocity.x > 0) {
        playerVelocity.x -= 0.004
        if (playerVelocity.x < 0) {
          playerVelocity.x = 0
        }
      } else if (playerVelocity.x < 0) {
        playerVelocity.x += 0.004
        if (playerVelocity.x > 0) {
          playerVelocity.x = 0
        }
      }
    }

    playerVelocity.y += gravity

    const leftProbe = {
      x: Math.floor(playerPosition.x - 0.5),
      y: Math.floor(playerPosition.y + 0.5)
    }
    const rightProbe = {
      x: Math.floor(playerPosition.x + 0.5),
      y: Math.floor(playerPosition.y + 0.5)
    }

    if (playerVelocity.y > 0 && (level.data[leftProbe.y][leftProbe.x].length > 0 || level.data[rightProbe.y][rightProbe.x].length > 0)) {
      playerVelocity.y = 0
      playerPosition.y = leftProbe.y - 0.5
    }

    playerPosition.x += playerVelocity.x
    playerPosition.y += playerVelocity.y

    renderGame(screenContext, renderContext, level)
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick)

  document.addEventListener('keydown', (event) => {
    if (event.repeat) {
      return
    }

    if (event.key == 'ArrowUp') {
      if (playerVelocity.y === 0) {
        playerVelocity.y = -0.1
      }
    }
    if (event.key == 'ArrowLeft') {
      leftPressed = true
    }
    if (event.key == 'ArrowRight') {
      rightPressed = true
    }
  })
  document.addEventListener('keyup', (event) => {
    if (event.key == 'ArrowLeft') {
      leftPressed = false
    }
    if (event.key == 'ArrowRight') {
      rightPressed = false
    }
  })
}

function loadLevel() {
  const levelData = []
  const mapRows = levelMap.split('\n')
  for (const row of mapRows) {
    const rowCharacters = Array.from(row)
    const rowData = []

    for (const c of rowCharacters) {
      if (characterMap[c] != null) {
        rowData.push(characterMap[c])
      } else {
        rowData.push([])
      }
    }
      console.log(row)

    levelData.push(rowData)
  }

  return {
    width: levelData[0].length,
    height: levelData.length,
    data: levelData
  }
}

function renderGame(screenContext, renderContext, level) {
  screenContext.save()
  renderContext.save()

  const screenCanvas = screenContext.canvas
  const renderCanvas = renderContext.canvas

  clearCanvas(screenContext, clearColor)
  clearCanvas(renderContext, clearColor)

  renderContext.fillStyle = '#ffffff'
  for (let x = 0; x < level.width; x++) {
    for (let y = 0; y < level.height; y++) {
      if (level.data[y][x].length > 0) {
        renderContext.fillRect(
          x * spriteDimensions.width, y * spriteDimensions.height,
          spriteDimensions.width, spriteDimensions.height
        )
      }
    }
  }

  renderContext.fillStyle = '#ff0000'
  renderContext.beginPath()
  renderContext.arc(
    Math.floor(playerPosition.x * spriteDimensions.width), Math.floor(playerPosition.y * spriteDimensions.height),
    spriteDimensions.height / 2,
    0, 2 * Math.PI
  )
  renderContext.fill()
  renderContext.closePath()

  const screenAspectRatio = screenCanvas.clientWidth / screenCanvas.clientHeight
  const renderAspectRatio = level.width / level.height

  const scaleFactor = screenAspectRatio > renderAspectRatio
    ? Math.floor(screenCanvas.height / renderCanvas.height)
    : Math.floor(screenCanvas.width / renderCanvas.width)

  const centerPosition = {
    x: Math.floor(screenCanvas.width / 2),
    y: Math.floor(screenCanvas.height / 2)
  }

  screenContext.drawImage(
    renderCanvas,
    0, 0,
    renderCanvas.width, renderCanvas.height,
    centerPosition.x - Math.floor((renderCanvas.width * scaleFactor) / 2), centerPosition.y - Math.floor((renderCanvas.height * scaleFactor) / 2),
    renderCanvas.width * scaleFactor, renderCanvas.height * scaleFactor
  )

  screenContext.restore()
  renderContext.restore()
}

function clearCanvas(context, color) {
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