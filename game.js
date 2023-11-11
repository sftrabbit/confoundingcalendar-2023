const cellDimensions = {
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

const WALK_VELOCITY = 5.5
const FRICTION = 0.8
const GRAVITY = 50.4 /*0.0035*/

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
#....##..*#...#...#..###
####.##..*..#.#......*.#
######.#######.#########
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

    renderCanvas.width = level.width * cellDimensions.width
    renderCanvas.height = level.height * cellDimensions.height

    const renderContext = renderCanvas.getContext('2d')
    renderContext.imageSmoothingEnabled = false

    renderGame(screenContext, renderContext, level)
  })

  resizeObserver.observe(screenCanvas)

  let leftPressed = false
  let rightPressed = false

  let previousTimestamp = null

  const tick = (timestamp) => {
    if (previousTimestamp == null) {
      previousTimestamp = timestamp
      requestAnimationFrame(tick)
      return;
    }

    const deltaTime = timestamp - previousTimestamp
    previousTimestamp = timestamp

    const fps = 1000 / deltaTime
    
    const renderContext = renderCanvas.getContext('2d')

    if (leftPressed) {
      playerVelocity.x = -WALK_VELOCITY
    } else if (rightPressed) {
      playerVelocity.x = WALK_VELOCITY
    } else {
      if (playerVelocity.x > 0) {
        playerVelocity.x -= FRICTION
        if (playerVelocity.x < 0) {
          playerVelocity.x = 0
        }
      } else if (playerVelocity.x < 0) {
        playerVelocity.x += FRICTION
        if (playerVelocity.x > 0) {
          playerVelocity.x = 0
        }
      }
    }

    playerVelocity.y += GRAVITY / fps

    const projectedPlayerPosition = {
      x: playerPosition.x + playerVelocity.x / fps,
      y: playerPosition.y + playerVelocity.y / fps
    }

    // Floor probe

    const floorProbe = (probePosition) => {
      if (playerVelocity.y === 0) {
        return null
      }

      const dir = Math.sign(playerVelocity.y)

      const leftProbe = {
        x: Math.floor(probePosition.x - 0.5),
        y: Math.floor(probePosition.y + 0.5 * dir)
      }
      const rightProbe = {
        x: Math.ceil(probePosition.x + 0.5) - 1,
        y: Math.floor(probePosition.y + 0.5 * dir)
      }

      if (!(level.data[leftProbe.y][leftProbe.x].length > 0 || level.data[rightProbe.y][rightProbe.x].length > 0)) {
        return null
      }

      return Math.floor(leftProbe.y - dir) + 0.5
    }

    const sidewaysProbe = (probePosition) => {
      if (playerVelocity.x === 0) {
        return null
      }

      const dir = Math.sign(playerVelocity.x)

      const upProbe = {
        x: Math.floor(probePosition.x + 0.5 * dir),
        y: Math.floor(probePosition.y - 0.5)
      }
      const downProbe = {
        x: Math.floor(probePosition.x + 0.5 * dir),
        y: Math.ceil(probePosition.y + 0.5) - 1
      }

      if (!(level.data[upProbe.y][upProbe.x].length > 0 || level.data[downProbe.y][downProbe.x].length > 0)) {
        return null
      }

      return Math.floor(upProbe.x - dir) + 0.5
    }

    const floorCollision = floorProbe({
      x: playerPosition.x,
      y: projectedPlayerPosition.y
    })
    const sidewaysCollision = sidewaysProbe({
      x: projectedPlayerPosition.x,
      y: playerPosition.y
    })
    console.log('floor', floorCollision)
    console.log('sideways', sidewaysCollision)

    if (floorCollision) {
      playerPosition.y = floorCollision
      playerVelocity.y = 0
    }

    if (sidewaysCollision) {
      playerPosition.x = sidewaysCollision
      playerVelocity.x = 0
    }

    if (!floorCollision && !sidewaysCollision) {
      const floorCollision = floorProbe({
        x: projectedPlayerPosition.x,
        y: projectedPlayerPosition.y
      })

      if (floorCollision) {
        playerPosition.y = floorCollision
        playerVelocity.y = 0
      }
    }

    playerPosition.x += playerVelocity.x / fps
    playerPosition.y += playerVelocity.y / fps

    renderGame(screenContext, renderContext, level)
    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)

  document.addEventListener('keydown', (event) => {
    if (event.repeat) {
      return
    }

    if (event.key == 'ArrowUp') {
      if (playerVelocity.y === 0) {
        playerVelocity.y = -12
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
          x * cellDimensions.width, y * cellDimensions.height,
          cellDimensions.width, cellDimensions.height
        )
      }
    }
  }

  renderContext.fillStyle = '#ff0000'
  renderContext.beginPath()
  renderContext.arc(
    Math.floor(playerPosition.x * cellDimensions.width), Math.floor(playerPosition.y * cellDimensions.height),
    cellDimensions.height / 2,
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