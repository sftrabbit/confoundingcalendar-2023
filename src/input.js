export const MOVEMENT = {
  Up: 0b00000001,
  Right: 0b00000010,
  Down: 0b00000100,
  Left: 0b00001000,
}

class InputHandler {
  constructor () {
    this.jumpQueued = false
    this.skipFrame = false
    this.horizontalMovementStack = []

    document.addEventListener('keydown', (event) => {
      this.onKeyDown(event)
    })
    document.addEventListener('keyup', (event) => {
      this.onKeyUp(event)
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
      this.horizontalMovementStack.push(MOVEMENT.Left)
    }
    if (event.key == 'ArrowRight') {
      this.horizontalMovementStack.push(MOVEMENT.Right)
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
    if (event.key == 'b') {
      this.skipFrame = false
    }
  }

  getHorizontalMovement () {
    if (this.horizontalMovementStack.length === 0) {
      return null
    }

    return this.horizontalMovementStack[this.horizontalMovementStack.length - 1]
  }
}

export default InputHandler