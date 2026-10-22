import type { ConnectedGrid } from '../graph/connectivity'
import { distanceTo, type FlowField, nextStep } from '../graph/flow-field'
import { type CellIndex, cellAt, cost, type Grid } from '../graph/grid'
import type { GameState } from './state'

/**
 * What an enemy on `from` would pay walking to the goal by following `field`: the sum of the
 * costs of the cells it enters. `undefined` if `from` has no path. Any field works, so the
 * metrics panel can price the route a BFS picks on a grid with mud.
 */
export function routeCost(grid: Grid, field: FlowField, from: CellIndex): number | undefined {
  if (distanceTo(field, from) === undefined) return undefined
  let total = 0
  let steps = 0
  for (let next = nextStep(field, from); next !== undefined; next = nextStep(field, next)) {
    total += cost(grid, next)
    // A path never repeats a cell, so a longer walk means a broken field: a bug.
    if (++steps > grid.width * grid.height) throw new Error('The flow field has a cycle')
  }
  return total
}

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
 * Cells the search discovers at `level`: those at exactly that distance from the goal. A BFS
 * processes its queue level by level, and Dijkstra settles nodes in order of distance, so
 * this is the frontier either one holds at that point. With mud some levels are empty.
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
 * Level (distance from the goal) the replay is showing, or `undefined` when it is not playing.
 * Cells closer than this level are already visited and the ones at this level are the frontier.
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
