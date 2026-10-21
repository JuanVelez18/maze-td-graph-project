import type { ConnectedGrid } from '../graph/connectivity'
import { distanceTo } from '../graph/flow-field'
import { cellAt } from '../graph/grid'
import type { GameState } from './state'

/**
 * Largest distance from the goal to any cell it reaches: the eccentricity of the goal node.
 * The debug heatmap divides by it so the farthest cell always gets the last color.
 */
export function maxDistance(world: ConnectedGrid): number {
  const { grid, field } = world
  let max = 0
  for (let y = 0; y < grid.height; y++)
    for (let x = 0; x < grid.width; x++) {
      const cell = cellAt(grid, x, y)
      const distance = cell === undefined ? undefined : distanceTo(field, cell)
      if (distance !== undefined && distance > max) max = distance
    }
  return max
}

/**
 * Cells the BFS discovers at `level`: those at exactly that distance from the goal. A BFS
 * processes its queue level by level, so this is the frontier it holds at that point.
 */
export function frontierSize(world: ConnectedGrid, level: number): number {
  const { grid, field } = world
  let count = 0
  for (let y = 0; y < grid.height; y++)
    for (let x = 0; x < grid.width; x++) {
      const cell = cellAt(grid, x, y)
      if (cell !== undefined && distanceTo(field, cell) === level) count++
    }
  return count
}

/**
 * Level the BFS replay is showing, or `undefined` when it is not playing. Cells closer than
 * this level are already visited and the ones at this level are the frontier.
 */
export function bfsReplayLevel(state: GameState): number | undefined {
  if (state.bfsReplay === undefined) return undefined
  return Math.floor(state.bfsReplay.elapsed * state.rules.bfsLevelsPerSecond)
}

/** Moves the BFS replay `dt` seconds forward; it ends once the farthest level was shown. */
export function advanceBfsReplay(state: GameState, dt: number): GameState {
  if (state.bfsReplay === undefined) return state
  const next = { ...state, bfsReplay: { elapsed: state.bfsReplay.elapsed + dt } }
  const level = bfsReplayLevel(next) ?? 0
  return level > maxDistance(state.world) ? { ...state, bfsReplay: undefined } : next
}
