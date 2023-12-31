const LEVEL_MAP = `
########p#################
##########################
##########################
##########################
########...###############
##..........*...####3.3###
##..........*....##.2.2.##
##...**.....###..##42.24##
##..###.........###.1D1.##
###..........#############
####.........#############
####.......*.#############
##########################
##########################
##########################
##########################
`.trim()

// const LEVEL_MAP = `
// #######┏┛┏━┓##############
// ┏━━━━┓#┃#p#┃##############
// ┃####┃#┃###┃#┏━━━━━━━━━━━┓
// ┃####┗━┛###┗━┛###########┃
// ┃#######...##############┃
// ┃#..........*...####3.3##┃
// ┃#..........*....##.2.2.#┃
// ┃#...**.....###..##42.24#┃
// ┃#..###.........###.1D1.#┃
// ┃##..........############┃
// ┃###.........┏┓##########┃
// ┃###.....*...┃┗━━━━━━━━━━┛
// ┃########┏┓##┗━━┓#########
// ┃########┃┃#####┃#########
// ┃########┃┃#####┃#########
// ┗━━━━━━━━┛┗━━━━━┛#########
// `.trim()

const LEVEL_MAP_2 = `
##┏┓####┏┓###################
┏━┛┗━━┓#┃p┗┓┗┓┏┛┏━┛┗┓┏━━━━━━┓
┃#####┃┏┛##┃.┃┗┓┃###┃┃######┃
┃#####┃┃###┃┏┛#┗┛###┃┃######┃
┃#####┗┛###┗┛.*#..##┃┃######┃
┃#######...##.*##.##┃┃######┃
┃#######....#.*..##┏┛┃######┃
┃#######....#.###.#┃┏┛######┃
┃##...*...........#┃┃##3.3##┃
┃#....*...........#┃┃#.2.2.#┃
┃#..###......**...#┃┃#42.24#┃
┃##..........###..#┃┃#.1D1.#┃
┃#.###...........##┗┛#######┃
┃#.###..........##.#########┃
┃#.###......*...*qte┏┓######┃
┃#.###┏┓#*#######l#r┛┃######┃
┃#.#..┃┃#*###┏┓##l.*.┃######┃
┃#.#.#┃┃#*.##┃┃##l.*.┃######┃
┃..*.*ll*****ll**l**.┃######┃
┗━━━━━┛┗━━━━━┛┗━━┛###┗━━━━━━┛
`.trim()

export const OBJECT_TYPES = {
  Wall: 0b00000001,
  Box: 0b00000010,
  PathUp: 0b00010000,
  PathRight: 0b00100000,
  PathDown: 0b01000000,
  PathLeft: 0b10000000,
  PillarTop: 0b000100000000,
  PillarMiddle: 0b001000000000,
  PillarBottom: 0b010000000000,
  Alcove: 0b100000000000,
  Door: 0b1000000000000,
}

export const OBJECT_GROUPS = {
  Solid: OBJECT_TYPES.Wall | OBJECT_TYPES.Box,
  Pushable: OBJECT_TYPES.Box,
  Static: OBJECT_TYPES.Wall,
  Path: OBJECT_TYPES.PathUp | OBJECT_TYPES.PathRight | OBJECT_TYPES.PathDown | OBJECT_TYPES.PathLeft,
  Decoration: OBJECT_TYPES.PillarTop | OBJECT_TYPES.PillarMiddle | OBJECT_TYPES.PillarBottom  | OBJECT_TYPES.Alcove | OBJECT_TYPES.Door
}

const OBJECT_CHARACTER_MAP = {
  '#': OBJECT_TYPES.Wall,
  '*': OBJECT_TYPES.Box,
  '┏': OBJECT_TYPES.Wall | OBJECT_TYPES.PathRight | OBJECT_TYPES.PathDown,
  '┓': OBJECT_TYPES.Wall | OBJECT_TYPES.PathLeft | OBJECT_TYPES.PathDown,
  '┗': OBJECT_TYPES.Wall | OBJECT_TYPES.PathRight | OBJECT_TYPES.PathUp,
  '┛': OBJECT_TYPES.Wall | OBJECT_TYPES.PathLeft | OBJECT_TYPES.PathUp,
  '┃': OBJECT_TYPES.Wall | OBJECT_TYPES.PathDown | OBJECT_TYPES.PathUp,
  '━': OBJECT_TYPES.Wall | OBJECT_TYPES.PathLeft | OBJECT_TYPES.PathRight,
  'p': OBJECT_TYPES.Wall | OBJECT_TYPES.PathUp,
  'l': OBJECT_TYPES.Box | OBJECT_TYPES.PathUp | OBJECT_TYPES.PathDown,
  'q': OBJECT_TYPES.Box | OBJECT_TYPES.PathRight | OBJECT_TYPES.PathDown,
  'w': OBJECT_TYPES.Box | OBJECT_TYPES.PathLeft | OBJECT_TYPES.PathUp,
  'e': OBJECT_TYPES.Box | OBJECT_TYPES.PathLeft | OBJECT_TYPES.PathDown,
  'r': OBJECT_TYPES.Box | OBJECT_TYPES.PathRight | OBJECT_TYPES.PathUp,
  't': OBJECT_TYPES.Box | OBJECT_TYPES.PathRight | OBJECT_TYPES.PathLeft,
  'e': OBJECT_TYPES.Box | OBJECT_TYPES.PathLeft | OBJECT_TYPES.PathDown,
  'r': OBJECT_TYPES.Box | OBJECT_TYPES.PathRight | OBJECT_TYPES.PathUp,
  't': OBJECT_TYPES.Box | OBJECT_TYPES.PathRight | OBJECT_TYPES.PathLeft,
  '1': OBJECT_TYPES.PillarBottom,
  '2': OBJECT_TYPES.PillarMiddle,
  '3': OBJECT_TYPES.PillarTop,
  '4': OBJECT_TYPES.Alcove,
  'D': OBJECT_TYPES.Door,
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

  getObjects(position) {
    return this.data[position.y][position.x]
  }

  clear(position) {
    this.data[position.y][position.x] = 0
  }
}

export default Level