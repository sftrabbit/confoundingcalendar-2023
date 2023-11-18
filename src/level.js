const LEVEL_MAP = `
#########┗┛P┗┓#┗┓┏┛┏━┛┃#
#############┗━┓┃┗━┛G..┏
###############┗┛####..┃
#########....#######**.┃
#########.*..########┗━┛
########################
#.....#.....*..........#
#....┃#.....*#.........#
#...#┗━.....*..........#
###.........*..........#
#####.....*#*..........#
#.....#.*.***.#........#
#....#.########...##.###
####.#......#.#........#
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

export const OBJECT_TYPES = {
  Wall: 0b00000001,
  Box: 0b00000010,
}

export const OBJECT_GROUPS = {
  Solid: OBJECT_TYPES.Wall | OBJECT_TYPES.Box,
  Pushable: OBJECT_TYPES.Box,
  Static: OBJECT_TYPES.Wall
}

const OBJECT_CHARACTER_MAP = {
  '#': OBJECT_TYPES.Wall,
  '*': OBJECT_TYPES.Box
}

class Level {
  constructor() {
    const levelData = []
    const mapRows = LEVEL_MAP.split('\n')
    for (const row of mapRows) {
      const rowCharacters = Array.from(row)
      const rowData = []

      for (const c of rowCharacters) {
        let cell = 0
        if (OBJECT_CHARACTER_MAP[c] != null) {
          cell |= OBJECT_CHARACTER_MAP[c]
        }
        rowData.push(cell)
      }

      levelData.push(rowData)
    }

    this.width = levelData[0].length
    this.height = levelData.length
    this.data = levelData
  }

  hasObject(position, objectType) {
    return (this.data[position.y][position.x] & objectType) > 0
  }

  transferObject(fromPosition, toPosition, objectType) {
    this.removeObject(fromPosition, objectType)
    this.addObject(toPosition, objectType)
  }

  addObject(position, objectType) {
    this.data[position.y][position.x] |= objectType
  }

  removeObject(position, objectType) {
    this.data[position.y][position.x] &= ~objectType
  }

  isEmpty(position) {
    return this.data[position.y][position.x] === 0
  }
}

export default Level