import type { Brand } from '../shared/brand'

/** Index of a cell in the flat layout `y * width + x`. Only meaningful for the grid it came from. */
export type CellIndex = Brand<number, 'CellIndex'>

/**
 * Implicit graph: every cell is a node, and two orthogonally adjacent open cells share an
 * edge. There are no adjacency lists; neighbors are computed from the index.
 *
 * Copy-on-write: functions that change the grid return a new one. `walls` is internal to
 * `graph/` (1 = wall, 0 = open); code outside this folder goes through the functions below.
 */
export type Grid = Brand<
  { readonly width: number; readonly height: number; readonly walls: Uint8Array },
  'Grid'
>

/** Creates a grid with every cell open. Non-positive or non-integer sizes are a bug and throw. */
export function createGrid(width: number, height: number): Grid {
  if (width <= 0 || height <= 0) throw new Error('Dimensions must be greater than zero')

  if (!Number.isInteger(width) || !Number.isInteger(height))
    throw new Error('Dimensions must be integers')

  return { width, height, walls: new Uint8Array(width * height) } as Grid
}

/** Validating constructor of `CellIndex`: `undefined` when (x, y) is outside the grid. */
export function cellAt(grid: Grid, x: number, y: number): CellIndex | undefined {
  if (x < 0 || y < 0) return undefined

  if (x >= grid.width || y >= grid.height) return undefined

  if (!Number.isInteger(x) || !Number.isInteger(y)) return undefined

  const idx = y * grid.width + x

  return idx as CellIndex
}

/** Inverse of `cellAt`. */
export function cellCoords(
  grid: Grid,
  cell: CellIndex,
): { readonly x: number; readonly y: number } {
  const y = Math.floor(cell / grid.width)
  const x = cell % grid.width

  return { x, y }
}

export function isWall(grid: Grid, cell: CellIndex): boolean {
  return grid.walls[cell] === 1
}

/** Returns a new grid with `cell` turned into a wall (or opened). The input is not mutated. */
export function setWall(grid: Grid, cell: CellIndex, wall: boolean): Grid {
  const walls = grid.walls.slice()
  walls[cell] = wall ? 1 : 0

  return { width: grid.width, height: grid.height, walls } as Grid
}

/**
 * Open cells adjacent to `cell` (4 directions), in the order up, right, down, left.
 * These are the edges of the node. Whether `cell` itself is a wall does not matter.
 */
export function neighbors(grid: Grid, cell: CellIndex): readonly CellIndex[] {
  const { x, y } = cellCoords(grid, cell)
  const nCoords: { x: number; y: number }[] = [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y },
  ]

  return nCoords
    .map((coords) => cellAt(grid, coords.x, coords.y))
    .filter((cell): cell is CellIndex => cell !== undefined && !isWall(grid, cell))
}
