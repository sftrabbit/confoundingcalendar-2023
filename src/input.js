export const MOVEMENT = {
  Up: 0b00000001,
  Right: 0b00000010,
  Down: 0b00000100,
  Left: 0b00001000,
}

// TODO - clear inputs when losing focus on game

class InputHandler {
  constructor () {
    this.jumpQueued = false
    this.skipFrame = false
    this.horizontalMovementStack = []
    this.undo = false
    this.restart = false

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

  getHorizontalMovement () {
    if (this.horizontalMovementStack.length === 0) {
      return null
    }

    return this.horizontalMovementStack[this.horizontalMovementStack.length - 1]
  }
}

export default InputHandler