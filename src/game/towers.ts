import { type ConnectedGrid, connect } from '../graph/connectivity'
import { type CellIndex, isWall, setWall } from '../graph/grid'
import { err, ok, type Result } from '../shared/result'
import { occupiedCells } from './enemies'
import type { GameState, PlacementError } from './state'

/**
 * A tower is a wall: it removes `cell` and its edges from the graph. The new grid is only
 * accepted if one BFS from the goal still reaches every spawn and every live enemy.
 */
export function tryPlaceTower(
  state: GameState,
  cell: CellIndex,
): Result<ConnectedGrid, PlacementError> {
  const { spawns, goal } = state.map
  if (spawns.includes(cell)) return err({ kind: 'is-spawn' })
  if (cell === goal) return err({ kind: 'is-goal' })
  if (isWall(state.world.grid, cell)) return err({ kind: 'occupied' })
  if (state.enemies.some((enemy) => occupiedCells(enemy).includes(cell)))
    return err({ kind: 'enemy-on-cell' })

  // An enemy only needs a path from the cell it walks to; it never turns back.
  const sources = [...new Set([...spawns, ...state.enemies.map((enemy) => enemy.to)])]
  const connected = connect(setWall(state.world.grid, cell, true), goal, sources)
  if (!connected.ok) return err({ kind: 'blocks-path', cells: connected.error.cells })

  return ok(connected.value)
}

/**
 * Removes the tower on `cell`, or returns `undefined` if there is none. Opening a cell only
 * adds a node and its edges, so a connected grid stays connected.
 */
export function sellTower(state: GameState, cell: CellIndex): ConnectedGrid | undefined {
  if (!isWall(state.world.grid, cell)) return undefined

  const connected = connect(
    setWall(state.world.grid, cell, false),
    state.map.goal,
    state.map.spawns,
  )
  if (!connected.ok) throw new Error('Removing a wall disconnected the grid')

  return connected.value
}
