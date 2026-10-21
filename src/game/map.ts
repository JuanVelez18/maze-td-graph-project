import type { CellCoords, MapConfig } from '../config'
import { connect } from '../graph/connectivity'
import { type CellIndex, cellAt, createGrid, type Grid } from '../graph/grid'
import type { GameMap, GameState } from './state'

/**
 * Builds the initial state from a grid that may already have walls. An invalid map is a bug
 * in the configuration, so it throws instead of returning a `Result`.
 */
export function createGameFromGrid(grid: Grid, map: GameMap): GameState {
  if (map.spawns.includes(map.goal)) throw new Error('A spawn cannot be the goal')

  const connected = connect(grid, map.goal, map.spawns)
  if (!connected.ok) throw new Error('The initial map leaves a spawn without a path to the goal')

  return { map, world: connected.value, debug: false }
}

export function createGame(config: MapConfig): GameState {
  const grid = createGrid(config.width, config.height)
  const toCell = ({ x, y }: CellCoords): CellIndex => {
    const cell = cellAt(grid, x, y)
    if (cell === undefined)
      throw new Error(`(${x}, ${y}) is outside the ${config.width}x${config.height} map`)
    return cell
  }

  return createGameFromGrid(grid, { spawns: config.spawns.map(toCell), goal: toCell(config.goal) })
}
