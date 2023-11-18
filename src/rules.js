import { OBJECT_TYPES } from './level'

export function applyRules(gameState, event) {
  const level = gameState.level

  if (event.type === 'push') {
    const fromPosition = {
      x: event.position.x + event.dir,
      y: event.position.y
    }

    const toPosition = {
      x: fromPosition.x + event.dir,
      y: fromPosition.y
    }

    if (level.hasObject(fromPosition, OBJECT_TYPES.Box) && !level.hasObject(toPosition, OBJECT_TYPES.Wall)) {
      level.transferObject(fromPosition, toPosition, OBJECT_TYPES.Box)
      gameState.player.position.x += event.dir
    }
  }
}