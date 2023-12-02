export const MOVEMENT = {
  Up: 0b00000001,
  Right: 0b00000010,
  Down: 0b00000100,
  Left: 0b00001000,
}

const MOVEMENT_TO_KEY = {
  [MOVEMENT.Up]: 'ArrowUp',
  [MOVEMENT.Right]: 'ArrowRight',
  [MOVEMENT.Down]: 'ArrowDown',
  [MOVEMENT.Left]: 'ArrowLeft',
}

class InputHandler {
  constructor (renderer) {
    this.jumpQueued = false
    this.horizontalMovementStack = []
    this.verticalMovementStack = []
    this.undoPressed = false
    this.restart = false
    this.directionalMovement = null
    this.renderer = renderer
    this.movementTouches = []
    this.undoTouchId = null
    this.restartTouchId = null

    this.countInputs = false
    this.movementPressCount = 0
    this.jumpPressCount = 0

    this.initialInput = false

    document.addEventListener('keydown', (event) => {
      this.onKeyDown(event)
    })
    document.addEventListener('keyup', (event) => {
      this.onKeyUp(event)
    })

    document.addEventListener('touchstart', (event) => {
      this.onTouchStart(event)
    })
    document.addEventListener('touchend', (event) => {
      this.onTouchEnd(event)
    })
    document.addEventListener('touchcancel', (event) => {
      this.onTouchEnd(event)
    })
    document.addEventListener('touchmove', (event) => {
      this.onTouchMove(event)
    })
    document.addEventListener('click', (event) => {
      if (!this.initialInput) {
        this.initialInput = true
      }
    })

    window.onblur = () => {
      this.jumpQueued = false
      this.horizontalMovementStack = []
      this.verticalMovementStack = []
      this.undoPressed = false
      this.restart = false
      this.directionalMovement = null
      this.movementTouches = []
      this.undoTouchId = null
      this.restartTouchId = null
    }
  }

  onKeyDown (event) {
    this.renderer.showTouchControls = false

    if (!this.initialInput) {
      this.initialInput = true
    }

    if (event.repeat) {
      return
    }

    event.stopPropagation()
    event.preventDefault()

    if (event.key == 'ArrowUp' || event.key == 'w') {
      this.onJumpPress()
      this.onDirectionPress(MOVEMENT.Up)
    }
    if (event.key == 'ArrowLeft' || event.key == 'a') {
      this.onDirectionPress(MOVEMENT.Left)
    }
    if (event.key == 'ArrowRight' || event.key == 'd') {
      this.onDirectionPress(MOVEMENT.Right)
    }
    if (event.key == 'ArrowDown' || event.key == 's') {
      this.onDirectionPress(MOVEMENT.Down)
    }
    if (event.key == 'z') {
      this.undoPressed = true
    }
    if (event.key == 'r') {
      this.restart = true
    }

    return false
  }

  onKeyUp (event) {
    this.renderer.showTouchControls = false

    event.stopPropagation()
    event.preventDefault()

    if (event.key == 'ArrowUp' || event.key == 'w') {
      this.onDirectionRelease(MOVEMENT.Up)
    }
    if (event.key == 'ArrowLeft' || event.key == 'a') {
      this.onDirectionRelease(MOVEMENT.Left)
    }
    if (event.key == 'ArrowRight' || event.key == 'd') {
      this.onDirectionRelease(MOVEMENT.Right)
    }
    if (event.key == 'ArrowDown' || event.key == 's') {
      this.onDirectionRelease(MOVEMENT.Down)
    }

    if (event.key === 'z') {
      this.undoPressed = false
    }

    return false
  }

  onDirectionPress (direction) {
    if (this.countInputs) {
      this.movementPressCount += 1
    }

    if (direction === MOVEMENT.Up || direction === MOVEMENT.Down) {
      if (this.verticalMovementStack.indexOf(direction) === -1) {
        this.verticalMovementStack.push(direction)
      }
      this.directionalMovement = direction
    }

    if (direction === MOVEMENT.Left || direction === MOVEMENT.Right) {
      if (this.horizontalMovementStack.indexOf(direction) === -1) {
        this.horizontalMovementStack.push(direction)
      }
      this.directionalMovement = direction
    }
  }

  onDirectionRelease (direction) {
    if (direction === MOVEMENT.Up || direction === MOVEMENT.Down) {
        const i = this.verticalMovementStack.indexOf(direction)
        if (i !== -1) {
          this.verticalMovementStack.splice(i, 1)
        }
    }

    if (direction === MOVEMENT.Left || direction === MOVEMENT.Right) {
      const i = this.horizontalMovementStack.indexOf(direction)
      if (i !== -1) {
        this.horizontalMovementStack.splice(i, 1)
      }
    }
  }

  onJumpPress () {
    if (this.countInputs) {
      this.jumpPressCount += 1
    }
    this.jumpQueued = true
  }

  onTouchStart (event) {
    this.renderer.showTouchControls = true

    if (!this.initialInput) {
      this.initialInput = true
    }

    for (const touch of event.changedTouches) {
      if (touch.clientX >= Math.floor(this.renderer.screenCanvas.width / 2)) {
        const button = this.evaluateButtonTouch(touch)
        if (button === 0) {
          this.undoTouchId = touch.identifier
          this.renderer.undoButtonPressed = true
          this.undoPressed = true
        } else if (button === 1) {
          this.restartTouchId = touch.identifier
          this.renderer.restartButtonPressed = true
          this.restart = true
        } else {
          this.onJumpPress()
        }
      } else {
        const direction = this.evaluateMovementTouch(touch)
        this.onDirectionPress(direction)
        this.movementTouches.push({
          identifier: touch.identifier,
          direction
        })
      }
    }
  }

  onTouchEnd (event) {
    this.renderer.showTouchControls = true

    for (const touch of event.changedTouches) {
      if (touch.identifier === this.undoTouchId) {
        this.renderer.undoButtonPressed = false
        this.undoPressed = false
        this.undoTouchId = null
        continue
      }

      if (touch.identifier === this.restartTouchId) {
        this.renderer.restartButtonPressed = false
        this.restartTouchId = null
        continue
      }

      const index = this.movementTouches.findIndex((existingTouch) => existingTouch.identifier === touch.identifier)
      if (index !== -1) {
        this.onDirectionRelease(this.movementTouches[index].direction)
        this.movementTouches.splice(index, 1)
      }
    }
  }

  onTouchMove () {
    this.renderer.showTouchControls = true

    for (const touch of event.changedTouches) {
      if (touch.identifier === this.undoTouchId) {
        const button = this.evaluateButtonTouch(touch)
        if (button === 0) {
          this.renderer.undoButtonPressed = true
          this.undoPressed = true
        } else {
          this.renderer.undoButtonPressed = false
          this.undoPressed = false
        }
        continue
      }

      if (touch.identifier === this.restartTouchId) {
        const button = this.evaluateButtonTouch(touch)
        if (button === 0) {
          this.renderer.restartButtonPressed = true
        } else {
          this.renderer.restartButtonPressed = false
        }
        continue
      }

      const index = this.movementTouches.findIndex((existingTouch) => existingTouch.identifier === touch.identifier)
      if (index !== -1) {
        const newDirection = this.evaluateMovementTouch(touch)
        if (newDirection !== this.movementTouches[index].direction) {
          this.onDirectionRelease(this.movementTouches[index].direction)
          this.onDirectionPress(newDirection)
          this.movementTouches[index].direction = newDirection
        }
      }
    }
  }

  evaluateMovementTouch (touch) {
    const dpadY = Math.floor(this.renderer.screenCanvas.height / 2)

    const relativeX = touch.clientX - 130
    const relativeY = touch.clientY - dpadY

    if (Math.abs(relativeX) < 15 && Math.abs(relativeY) < 15) {
      return null
    }

    if (Math.abs(relativeX) > Math.abs(relativeY)) {
      return relativeX > 0 ? MOVEMENT.Right : MOVEMENT.Left
    } else {
      return relativeY > 0 ? MOVEMENT.Down : MOVEMENT.Up
    }

    return null
  }

  evaluateButtonTouch (touch) {
    const undoButtonX = this.renderer.screenCanvas.width - (5 + 24) * this.renderer.scaleFactor * 2
    const restartButtonX = this.renderer.screenCanvas.width - (5 + 24) * this.renderer.scaleFactor

    const buttonY = 5 * this.renderer.scaleFactor
    const buttonWidth = 24 * this.renderer.scaleFactor

    if (touch.clientY >= buttonY && touch.clientY < buttonY + buttonWidth) {
      if (touch.clientX >= undoButtonX && touch.clientX < undoButtonX + buttonWidth) {
        return 0
      } else if (touch.clientX >= restartButtonX && touch.clientX < restartButtonX + buttonWidth) {
        return 1
      }
    }

    return -1
  }

  getHorizontalMovement () {
    if (this.horizontalMovementStack.length === 0) {
      return null
    }

    return this.horizontalMovementStack[this.horizontalMovementStack.length - 1]
  }
  getVerticalMovement () {
    if (this.verticalMovementStack.length === 0) {
      return null
    }

    return this.verticalMovementStack[this.verticalMovementStack.length - 1]
  }
}

export default InputHandler