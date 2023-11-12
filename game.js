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
const GRAVITY = 50.4
const COYOTE_TIME = 0.1
const ANTICOYOTE_TIME = 0.1

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
#.....#.......#........#
#....#.##.....#...#..###
####.#......#.#......*.#
#########.####.#########
#########.##############
########################
##########.####.......##
######┏┓##.####.#####.##
######┗┛#######.......##
###############...G...##
###############.......##
################......##
########################
`.trim()

const OBJECTS = {
  Wall: 0,
  Box: 1,
}

const characterMap = {
  '#': [OBJECTS.Wall],
  '*': [OBJECTS.Box]
}

const clearColor = '#0e0e12'

let jumping = false
let skipFrame = false

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

  let lastOnGroundTimestamp = 0
  let jumpTimestamp = null

  const tick = (timestamp) => {
    if (previousTimestamp == null) {
      previousTimestamp = timestamp
      requestAnimationFrame(tick)
      return;
    }

    let deltaTime = timestamp - previousTimestamp

    if (skipFrame) {
      deltaTime *= 10
    }

    if (deltaTime > 50) {
      deltaTime = 50
    }

    previousTimestamp = timestamp

    const fps = 1000 / deltaTime
    
    const renderContext = renderCanvas.getContext('2d')

    if (jumping) {
      jumpTimestamp = timestamp
      jumping = false
    }

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

    const verticalProbe = (playerPosition, probePosition, dir) => {
      const startY = Math.floor(playerPosition.y + 0.5 * dir)
      const probeY = Math.floor(probePosition.y + 0.5 * dir)

      const leftProbeX = Math.floor(probePosition.x - 0.5)
      const rightProbeX = Math.ceil(probePosition.x + 0.5) - 1

      for (let y = startY; y != probeY + dir; y += dir) {
        if (level.data[y][leftProbeX].length > 0 || level.data[y][rightProbeX].length > 0) {
          console.log(Math.floor(y - dir) + 0.5, y, dir)
          return Math.floor(y - dir) + 0.5
        }
      }

      return null
    }

    const horizontalProbe = (playerPosition, probePosition, dir) => {
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

    const verticalCollision = verticalProbe(playerPosition, {
      x: playerPosition.x,
      y: projectedPlayerPosition.y
    }, Math.sign(playerVelocity.y))
    const leftCollision = horizontalProbe(playerPosition, {
      x: projectedPlayerPosition.x,
      y: playerPosition.y
    }, -1)
    const rightCollision = horizontalProbe(playerPosition, {
      x: projectedPlayerPosition.x,
      y: playerPosition.y
    }, 1)

    const horizontalCollision = leftCollision || rightCollision

    let onGround = playerVelocity.y >= 0 && verticalCollision

    if (verticalCollision) {
      // Leniency when colliding with ceiling/floor but there is a gap to move into
      const dir = Math.sign(playerVelocity.y)
      if (!leftPressed && !rightPressed
        && Math.abs((playerPosition.x % 1) - 0.5) < 0.1
        && level.data[Math.floor(playerPosition.y) + dir][Math.floor(playerPosition.x)].length === 0
        && level.data[Math.floor(playerPosition.y) + dir][Math.floor(playerPosition.x) + 1].length !== 0
        && level.data[Math.floor(playerPosition.y) + dir][Math.floor(playerPosition.x) - 1].length !== 0) {
        playerPosition.x = Math.floor(playerPosition.x) + 0.5
      } else {
        playerPosition.y = verticalCollision
        playerVelocity.y = 0
      }
    }

    if (horizontalCollision) {
      // Leniency when colliding with ceiling/floor but there is a gap to move into
      const dir = Math.sign(playerVelocity.x)
      if (Math.abs((playerPosition.y % 1) - 0.5) < 0.1
        && level.data[Math.floor(playerPosition.y)][Math.floor(playerPosition.x) + dir].length === 0
        && level.data[Math.floor(playerPosition.y) + 1][Math.floor(playerPosition.x) + dir].length !== 0
        && level.data[Math.floor(playerPosition.y) - 1][Math.floor(playerPosition.x) + dir].length !== 0) {
        playerPosition.y = Math.floor(playerPosition.y) + 0.5
      } else {
        playerPosition.x = horizontalCollision
        playerVelocity.x = 0
      }
    }

    // Corner check
    if (playerVelocity.x !== 0 && playerVelocity.y !== 0) {
      const horizontalMotionCollision = playerVelocity.x > 0 ? rightCollision : leftCollision

      if (!horizontalMotionCollision && !verticalCollision) {
        const verticalCollision = verticalProbe(playerPosition, {
          x: playerPosition.x,
          y: projectedPlayerPosition.y
        }, Math.sign(playerVelocity.y))

        if (verticalCollision) {
          playerPosition.y = verticalCollision
          playerVelocity.y = 0
        }

        if (playerVelocity.y >= 0 && verticalCollision) {
          onGround = true
        }
      }
    }

    if (onGround) {
      lastOnGroundTimestamp = timestamp
    }

    playerPosition.x += playerVelocity.x / fps
    playerPosition.y += playerVelocity.y / fps

    if (jumpTimestamp != null) {
      if ((timestamp - jumpTimestamp) < ANTICOYOTE_TIME * 1000) {
        const jumpUpCollision = verticalProbe(playerPosition, {
          x: playerPosition.x,
          y: playerPosition.y - 12 / fps
        }, -1)

        if (!jumpUpCollision && (onGround || (timestamp - lastOnGroundTimestamp) < COYOTE_TIME * 1000)) {
          playerVelocity.y = -12
          jumpTimestamp = null
        }
      } else {
        jumpTimestamp = null
      }
    }

    renderGame(screenContext, renderContext, level)
    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)

  document.addEventListener('keydown', (event) => {
    if (event.repeat) {
      return
    }

    if (event.key == 'ArrowUp') {
      jumping = true;
    }
    if (event.key == 'ArrowLeft') {
      leftPressed = true
    }
    if (event.key == 'ArrowRight') {
      rightPressed = true
    }
    if (event.key == 'b') {
      skipFrame = true
    }
  })
  document.addEventListener('keyup', (event) => {
    if (event.key == 'ArrowLeft') {
      leftPressed = false
    }
    if (event.key == 'ArrowRight') {
      rightPressed = false
    }
    if (event.key == 'b') {
      skipFrame = false
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

  for (let x = 0; x < level.width; x++) {
    for (let y = 0; y < level.height; y++) {
      for (const object of level.data[y][x]) {
        renderContext.fillStyle = object === OBJECTS.Wall ? '#ffffff' : '#00ff00'
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