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

export function loadLevel() {
  const levelData = []
  const mapRows = LEVEL_MAP.split('\n')
  for (const row of mapRows) {
    const rowCharacters = Array.from(row)
    const rowData = []

    for (const c of rowCharacters) {
      if (OBJECT_CHARACTER_MAP[c] != null) {
        rowData.push(OBJECT_CHARACTER_MAP[c])
      } else {
        rowData.push([])
      }
    }

    levelData.push(rowData)
  }

  return {
    width: levelData[0].length,
    height: levelData.length,
    data: levelData
  }
}