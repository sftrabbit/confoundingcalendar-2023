const LEVEL_MAP = `
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
#.....#...*...#........#
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
  Wall: 0,
  Box: 1,
}

const OBJECT_CHARACTER_MAP = {
  '#': [OBJECT_TYPES.Wall],
  '*': [OBJECT_TYPES.Box]
}

class Level {
  constructor() {
    const levelData = []
    const mapRows = LEVEL_MAP.split('\n')
    for (const row of mapRows) {
      const rowCharacters = Array.from(row)
      const rowData = []

      for (const c of rowCharacters) {
        if (OBJECT_CHARACTER_MAP[c] != null) {
          const cell = []
          cell.push(...OBJECT_CHARACTER_MAP[c])
          rowData.push(cell)
        } else {
          rowData.push([])
        }
      }

      levelData.push(rowData)
    }

    this.width = levelData[0].length
    this.height = levelData.length
    this.data = levelData
  }

  hasObject(position, objectType) {
    return this.data[position.y][position.x].indexOf(objectType) !== -1
  }

  transferObject(fromPosition, toPosition, objectType) {
    this.removeObject(fromPosition, objectType)
    this.addObject(toPosition, objectType)
  }

  addObject(position, objectType) {
    const index = this.data[position.y][position.x].indexOf(objectType)
    if (index === -1) {
      this.data[position.y][position.x].push(objectType)
    }
  }

  removeObject(position, objectType) {
    const index = this.data[position.y][position.x].indexOf(objectType)
    if (index !== -1) {
      this.data[position.y][position.x].splice(index, 1)
    }
  }
}

export default Level