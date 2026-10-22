import { type CellIndex, type Grid, isWall, neighbors } from './grid'

/** Marker stored in the flow field arrays for "no value". */
export const UNREACHABLE = -1

/**
 * Result of a single BFS from the goal. It serves every enemy at once: each one only looks
 * up its current cell.
 */
export type FlowField = {
  /**
   * Distance from each cell to the goal: steps for the BFS, total cost for Dijkstra.
   * `UNREACHABLE` for walls and cells with no path.
   */
  readonly distance: Int32Array
  /** Next cell on a shortest path to the goal; `UNREACHABLE` for the goal and unreachable cells. */
  readonly next: Int32Array
  /** Nodes taken out of the queue. Reported in the metrics panel. */
  readonly visited: number
}

/** BFS from `goal` over the open cells. If `goal` is a wall, nothing is reachable. */
export function computeFlowField(grid: Grid, goal: CellIndex): FlowField {
  const flowField = {
    distance: new Int32Array(grid.width * grid.height).fill(UNREACHABLE),
    next: new Int32Array(grid.width * grid.height).fill(UNREACHABLE),
    visited: 0,
  }
  if (isWall(grid, goal)) return flowField

  flowField.distance[goal] = 0

  let frontier = [goal]
  let level = 0

  while (frontier.length > 0) {
    const nextFrontier: CellIndex[] = []

    for (const cell of frontier) {
      flowField.visited++

      neighbors(grid, cell).forEach((neighbor) => {
        const seen = flowField.distance[neighbor] !== UNREACHABLE
        if (seen) return

        flowField.distance[neighbor] = level + 1
        flowField.next[neighbor] = cell
        nextFrontier.push(neighbor)
      })
    }

    frontier = nextFrontier
    level++
  }

  return flowField
}

/** Distance (steps or cost) from `cell` to the goal, or `undefined` if there is no path. */
export function distanceTo(field: FlowField, cell: CellIndex): number | undefined {
  const distance = field.distance[cell]

  return distance === UNREACHABLE ? undefined : distance
}

/** Cell an enemy standing on `cell` should move to, or `undefined` at the goal or with no path. */
export function nextStep(field: FlowField, cell: CellIndex): CellIndex | undefined {
  const next = field.next[cell]

  return next === UNREACHABLE ? undefined : (next as CellIndex)
}
