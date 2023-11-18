class GameState {
  constructor (level) {
    this.player = {
      position: {
        x: 10.5,
        y: 10.5
      },
      velocity: {
        x: 0,
        y: 0
      }
    }

    this.level = level
  }
}

export default GameState