export const MOVEMENT = {
  Up: 0b00000001,
  Right: 0b00000010,
  Down: 0b00000100,
  Left: 0b00001000,
}

// TODO - clear inputs when losing focus on game

const MOVEMENT_TO_KEY = {
  [MOVEMENT.Up]: 'ArrowUp',
  [MOVEMENT.Right]: 'ArrowRight',
  [MOVEMENT.Down]: 'ArrowDown',
  [MOVEMENT.Left]: 'ArrowLeft',
}

class InputHandler {
  constructor (renderer) {
    this.jumpQueued = false
    this.skipFrame = false
    this.horizontalMovementStack = []
    this.undo = false
    this.restart = false
    this.renderer = renderer
    this.movementTouches = []

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
  }

  onKeyDown (event) {
    if (event.repeat) {
      return
    }

    if (event.key == 'ArrowUp') {
      this.jumpQueued = true
    }
    if (event.key == 'ArrowLeft') {
      if (this.horizontalMovementStack.indexOf(MOVEMENT.Left) === -1) {
        this.horizontalMovementStack.push(MOVEMENT.Left)
      }
    }
    if (event.key == 'ArrowRight') {
      if (this.horizontalMovementStack.indexOf(MOVEMENT.Right) === -1) {
        this.horizontalMovementStack.push(MOVEMENT.Right)
      }
    }
    if (event.key == 'z') {
      this.undo = true
    }
    if (event.key == 'r') {
      this.restart = true
    }
    if (event.key == 'b') {
      this.skipFrame = true
    }
  }

  onKeyUp (event) {
    if (event.key == 'ArrowLeft') {
      const i = this.horizontalMovementStack.indexOf(MOVEMENT.Left)
      if (i !== -1) {
        this.horizontalMovementStack.splice(i, 1)
      }
    }
    if (event.key == 'ArrowRight') {
      const i = this.horizontalMovementStack.indexOf(MOVEMENT.Right)
      if (i !== -1) {
        this.horizontalMovementStack.splice(i, 1)
      }
    }
  }

  onTouchStart (event) {
    for (const touch of event.changedTouches) {
      if (touch.clientX >= Math.floor(this.renderer.screenCanvas.width / 2)) {
        this.jumpQueued = true
      } else {
        const direction = this.evaluateTouch(touch)
        this.onKeyDown({ key: MOVEMENT_TO_KEY[direction] })
        this.movementTouches.push({
          identifier: touch.identifier,
          direction
        })
      }
    }
  }

  onTouchEnd (event) {
    for (const touch of event.changedTouches) {
      const index = this.movementTouches.findIndex((existingTouch) => existingTouch.identifier === touch.identifier)
      if (index !== -1) {
        this.onKeyUp({ key: MOVEMENT_TO_KEY[this.movementTouches[index].direction] })
        this.movementTouches.splice(index, 1)
      }
    }
  }

  onTouchMove () {
    for (const touch of event.changedTouches) {
      const index = this.movementTouches.findIndex((existingTouch) => existingTouch.identifier === touch.identifier)
      if (index !== -1) {
        const newDirection = this.evaluateTouch(touch)
        if (newDirection !== this.movementTouches[index].direction) {
          this.onKeyUp({ key: MOVEMENT_TO_KEY[this.movementTouches[index].direction] })
          this.onKeyDown({ key: MOVEMENT_TO_KEY[newDirection] })
          this.movementTouches[index].direction = newDirection
        }
      }
    }
  }

  evaluateTouch (touch) {
    const dpadY = Math.floor(this.renderer.screenCanvas.height / 2)

    const relativeX = touch.clientX - 150
    const relativeY = touch.clientY - dpadY

    if (Math.abs(relativeX) < 30 && Math.abs(relativeY) < 30) {
      return null
    }

    if (Math.abs(relativeX) > Math.abs(relativeY)) {
      return relativeX > 0 ? MOVEMENT.Right : MOVEMENT.Left
    } else {
      return relativeY > 0 ? MOVEMENT.Down : MOVEMENT.Up
    }

    return null
  }

  getHorizontalMovement () {
    if (this.horizontalMovementStack.length === 0) {
      return null
    }

    return this.horizontalMovementStack[this.horizontalMovementStack.length - 1]
  }
}

function copyTouch({ identifier, clientX, clientY }) {
  return { identifier, clientX, clientY };
}

export default InputHandler