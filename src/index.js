import InputHandler, { MOVEMENT } from './input'
import GameState, { STATE } from './gameState'
import { updatePhysics, GRAVITY_CELLS_PER_SECOND_2 } from './physics'
import Renderer from './renderer'
import Level, { OBJECT_TYPES, OBJECT_GROUPS } from './level'
import { applyRules } from './rules'
import AnimationHandler from './animation'
import { initAudio } from './audio'

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const spritesheet = new Image()
    spritesheet.src = url

    spritesheet.onload = () => {
      resolve(spritesheet)
    }

    spritesheet.onerror = (event) => {
      reject(event)
    }
  })
}

window.onload = async () => {
  window.oncontextmenu = function() { return false; }

  const level = new Level()
  const gameState = new GameState(level)

  // oscillatorNode.start()

  const spritesheet = await loadImage('spritesheet.png')

  const audio = await initAudio()

  const animationHandler = new AnimationHandler()

  const containerElement = document.getElementById('container')
  const renderer = new Renderer(containerElement, gameState, animationHandler, audio, spritesheet)

  const inputHandler = new InputHandler(renderer)

  let previousTimestamp = null

  const undoStack = []

  let nextFrameEvent = null

  let needDpadPrompt = true
  let needJumpPrompt = true

  let hideDpadPromptTimestamp = null
  let hideJumpPromptTimestamp = null

  let requiredMovementPresses = 0
  let requiredJumpPresses = 0

  let introMovements = [
    MOVEMENT.Left, MOVEMENT.Down, MOVEMENT.Down, MOVEMENT.Down, MOVEMENT.Left, MOVEMENT.Left,
    MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Left,
    MOVEMENT.Down, MOVEMENT.Down, MOVEMENT.Down, MOVEMENT.Down, MOVEMENT.Down, MOVEMENT.Down, MOVEMENT.Down,
    MOVEMENT.Down, MOVEMENT.Down, MOVEMENT.Down, MOVEMENT.Down, MOVEMENT.Down, MOVEMENT.Down, MOVEMENT.Down,
    MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right,
    MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Right, MOVEMENT.Down, MOVEMENT.Down, MOVEMENT.Down,
    MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right,
    MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Left,
    MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Right, MOVEMENT.Down,
    MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right, MOVEMENT.Right,
    MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Up,
    MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Left,
    MOVEMENT.Down, MOVEMENT.Down, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Up, MOVEMENT.Left, MOVEMENT.Left, MOVEMENT.Down
  ]

  let introMovementIndex = 0
  let nextIntroMovementTimestamp = null

  const tick = (timestamp) => {
    if (previousTimestamp != null) {
      let deltaTime = timestamp - previousTimestamp

      if (deltaTime > 50) {
        deltaTime = 50
      }

      const fps = 1000 / deltaTime

      if (gameState.gameState === STATE.Play) {
        if (needDpadPrompt) {
          needDpadPrompt = false
          renderer.showDpadPrompt = true
        }

        if (needJumpPrompt && !gameState.isPlant && gameState.lastOnGroundTimestamp !== 0) {
          needJumpPrompt = false
          renderer.showJumpPrompt = true
          requiredMovementPresses = inputHandler.movementPressCount + 5
          requiredJumpPresses = inputHandler.jumpPressCount + 3
        }

        if (!needDpadPrompt && !needJumpPrompt && renderer.showJumpPrompt) {
          if (inputHandler.jumpPressCount >= requiredJumpPresses && inputHandler.movementPressCount >= requiredMovementPresses) {
            renderer.showDpadPrompt = false
            renderer.showJumpPrompt = false
          }
        }

        if (inputHandler.restart) {
          const priorState = gameState.serialize()

          const restoreState = undoStack[0]
          gameState.deserialize(restoreState)

          undoStack.push(priorState)
          animationHandler.clear()
          inputHandler.restart = false
        }

        if (inputHandler.undoPressed) {
          if (gameState.nextUndoTimestamp == null) {
            gameState.nextUndoTimestamp = timestamp
          }

          if (timestamp >= gameState.nextUndoTimestamp) {
            gameState.successiveUndos += 1
            gameState.nextUndoTimestamp += (gameState.successiveUndos <= 2 ? 500 : ((gameState.successiveUndos <= 4) ? 350 : ((gameState.successiveUndos <= 6) ? 250 : ((gameState.successiveUndos <= 10) ? 175 : 100))))

            const restoreState = undoStack.length > 1 ? undoStack.pop() : undoStack[0]
            gameState.deserialize(restoreState)
            animationHandler.clear()
          }
        } else {
          gameState.nextUndoTimestamp = null
          gameState.successiveUndos = 0
        }

        gameState.pushHappening = null

        if (gameState.isPlant) {
          inputHandler.jumpQueued = false
        }
      } else {
        inputHandler.jumpQueued = false
        inputHandler.restart = false
        inputHandler.verticalMovementStack = []
        inputHandler.horizontalMovement = []
        inputHandler.directionalMovement = null

        if (gameState.gameState === STATE.Title) {
          if (inputHandler.initialInput) {
            audio.resume()
            gameState.introTimestamp = timestamp
            gameState.gameState = STATE.Intro
            nextIntroMovementTimestamp = timestamp + 1000
          }
        } else if (gameState.gameState === STATE.Intro) {
          if (timestamp >= nextIntroMovementTimestamp) {
            if (introMovementIndex < introMovements.length) {
              const movement = introMovements[introMovementIndex]
              nextFrameEvent = null
              inputHandler.directionalMovement = movement
              introMovementIndex += 1
              nextIntroMovementTimestamp += 70 + Math.floor((1 - (Math.min(10, introMovements.length - introMovementIndex) / 10)) * 200)
            } else {
              gameState.gameState = STATE.Play
              inputHandler.countInputs = true
              const startState = gameState.serialize()
              undoStack.push(startState)
            }
          }
        }
      }

      if (animationHandler.hasPendingTransactions() && gameState.isPlant) {
        if (inputHandler.directionalMovement != null) {
          animationHandler.clear()
        }
      }

      if (!(animationHandler.hasPendingTransactions() || gameState.dead || gameState.gameState === STATE.End)) {
        const priorGroundPosition = gameState.lastGroundPosition
        const priorGroundFacing = gameState.lastGroundFacing

        let { event, physicsChanged } = nextFrameEvent == null
          ? updatePhysics(gameState, inputHandler, audio, timestamp, fps)
          : { event: nextFrameEvent, physicsChanged: false }

        if (nextFrameEvent !== null) {
          nextFrameEvent = null
        }

        if (event != null) {
          const priorState = gameState.serialize()

          const [rulesEvent, rulesChanged, animations] = applyRules(gameState, audio, event)

          if (event.type === 'push' || event.type === 'again') {
            if (event.type === 'push') {
              gameState.shortenPushTime = false

              if (animations) {
                gameState.rightPushStartTimestamp = null
                gameState.leftPushStartTimestamp = null
                gameState.upPushStartTimestamp = null
                gameState.downPushStartTimestamp = null
              }
            }
            gameState.pushHappening = true
          }

          if (animations || (rulesEvent != null && rulesEvent.type === 'again')) {
            nextFrameEvent = { type: 'again' }
          }

          if (animations) {
            animationHandler.queueTransaction(animations)
          }

          if (rulesChanged && event.type !== 'again' && gameState.gameState === STATE.Play) {
            undoStack.push(priorState)
          }
        } else {
          if (physicsChanged) {
            const restoreState = gameState.serialize(priorGroundPosition, priorGroundFacing)
            undoStack.push(restoreState)
          }
        }
      }

      if (gameState.pushHappening == null) {
        gameState.pushHappening =
          (gameState.leftPushStartTimestamp != null && (timestamp - gameState.leftPushActualStartTimestamp) > 150) ||
          (gameState.rightPushStartTimestamp != null && (timestamp - gameState.rightPushActualStartTimestamp) > 150)
      }

      const activeTransaction = animationHandler.getActiveTransaction(timestamp)
      const transaction = activeTransaction || getStaticTransaction(gameState, timestamp)
      const [ visuals, allFinished ] = interpolateVisuals(transaction, audio, timestamp)

      if (allFinished) {
        animationHandler.stopTransaction()
      }

      const horizontalMovement = inputHandler.getHorizontalMovement()
      if (horizontalMovement == null) {
        gameState.shortenPushTime = false
      }

      let overridePushAnimation = false
      if (transaction.fall) {
        overridePushAnimation = gameState.playerFacing !== horizontalMovement
        gameState.shortenPushTime = true

        if (!overridePushAnimation) {
          const pushedPosition = {
            x: Math.floor(gameState.player.position.x + (horizontalMovement === MOVEMENT.Right ? 1 : -1)),
            y: Math.floor(gameState.player.position.y)
          }

          if (!(gameState.level.data[pushedPosition.y][pushedPosition.x] & OBJECT_GROUPS.Solid)) {
            overridePushAnimation = true
          }
        }
      }

      if (gameState.pushHappening) {
        const pushedPosition = {
          x: Math.floor(gameState.player.position.x + (horizontalMovement === MOVEMENT.Right ? 1 : -1)),
          y: Math.floor(gameState.player.position.y)
        }

        if (!(gameState.level.data[pushedPosition.y][pushedPosition.x] & OBJECT_GROUPS.Solid)) {
          overridePushAnimation = true
        }
      }

      if (activeTransaction == null && horizontalMovement !== gameState.playerFacing) {
        overridePushAnimation = true
        gameState.leftPushActualStartTimestamp = null
        gameState.rightPushActualStartTimestamp = null
      }

      renderer.render(gameState, visuals, timestamp, overridePushAnimation)
    }

    previousTimestamp = timestamp
    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}

function getStaticTransaction(gameState, timestamp) {
  const level = gameState.level

  const transaction = (gameState.isPlant || gameState.gameState === STATE.End) ? [] : [{
    fromPosition: { x: gameState.player.position.x, y: gameState.player.position.y },
    toPosition: { x: gameState.player.position.x, y: gameState.player.position.y },
    objectTypes: null,
    startTimestamp: timestamp,
    endTimestamp: Infinity,
    type: gameState.pushHappening ? 'push' : null
  }]

  for (let y = 0; y < level.data.length; y++) {
    for (let x = 0; x < level.data[0].length; x++) {
      if ((level.data[y][x] & (OBJECT_GROUPS.Pushable | OBJECT_GROUPS.Path)) === 0) {
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

  if (gameState.isPlant) {
    transaction.push({
      fromPosition: { x: gameState.plant.position.x, y: gameState.plant.position.y },
      toPosition: { x: gameState.plant.position.x, y: gameState.plant.position.y },
      objectTypes: 'plant-eye',
      startTimestamp: timestamp,
      endTimestamp: Infinity,
      type: null
    })
  }

  return transaction
}

function interpolateVisuals (activeTransaction, audio, timestamp) {
  let allFinished = true

  let playingBlockFall = false

  return [
    activeTransaction.reduce((visuals, animation) => {
      const t = Math.max(0, Math.min(1,
        (timestamp - animation.startTimestamp) / (animation.endTimestamp - animation.startTimestamp)
      ))
      const vector = {
        x: animation.toPosition.x - animation.fromPosition.x,
        y: animation.toPosition.y - animation.fromPosition.y
      }
      if (t < 1) {
        allFinished = false
      } else {
        if (animation.tween === 'gravity' && !playingBlockFall && !animation.soundPlayed) {
          audio.playSound('blockFall')
          playingBlockFall = true
          animation.soundPlayed = true
        }
      }
      if (animation.objectTypes === 'squish' && !animation.soundPlayed && timestamp >= animation.startTimestamp) {
        audio.playSound('squish')
        animation.soundPlayed = true
      } 
      const tween = animation.tween === 'gravity'
        ? (fromPosition, vector, t) => {
          const timePassed = t * animation.durationSeconds
          const distance = 0.5 * GRAVITY_CELLS_PER_SECOND_2 * timePassed * timePassed
          return fromPosition + (distance * (vector > 0))
        }
        : (animation.tween === 'fast'
          ? (fromPosition, vector, t) => fromPosition + Math.min(t * 10, 1) * vector
          : (fromPosition, vector, t) => fromPosition + t * vector
        )

      visuals.push({
        startTimestamp: animation.startTimestamp,
        endTimestamp: animation.endTimestamp,
        position: {
          x: tween(animation.fromPosition.x, vector.x, t),
          y: tween(animation.fromPosition.y, vector.y, t)
        },
        objectTypes: animation.objectTypes,
        type: animation.type
      })

      return visuals
    }, []),
    allFinished
  ]
}