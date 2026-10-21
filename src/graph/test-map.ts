import { type CellIndex, cellAt, createGrid, type Grid, setWall } from './grid'

export type TestMap = {
  readonly grid: Grid
  readonly goal: CellIndex
  readonly spawns: readonly CellIndex[]
  /** `cellAt` that throws instead of returning `undefined`, to keep tests short. */
  readonly at: (x: number, y: number) => CellIndex
}

/**
 * Builds a grid from ASCII art, one row per line: `.` open, `#` wall, `S` spawn, `G` goal.
 * Spawns are listed in reading order (left to right, top to bottom).
 */
export function parseMap(text: string): TestMap {
  const rows = text
    .trim()
    .split('\n')
    .map((row) => row.trim())
  const width = rows[0]?.length ?? 0
  let grid = createGrid(width, rows.length)

  const at = (x: number, y: number): CellIndex => {
    const cell = cellAt(grid, x, y)
    if (cell === undefined) throw new Error(`(${x}, ${y}) is outside the map`)
    return cell
  }

  let goal: CellIndex | undefined
  const spawns: CellIndex[] = []
  rows.forEach((row, y) => {
    if (row.length !== width)
      throw new Error(`Row ${y} has length ${row.length}, expected ${width}`)
    Array.from(row).forEach((char, x) => {
      const cell = at(x, y)
      if (char === '#') grid = setWall(grid, cell, true)
      else if (char === 'G') goal = cell
      else if (char === 'S') spawns.push(cell)
      else if (char !== '.') throw new Error(`Unknown map character '${char}'`)
    })
  })
  if (goal === undefined) throw new Error('Map has no goal')

  return { grid, goal, spawns, at }
}
