import type { CellIndex, Grid } from './grid'

/** Marker stored in the flow field arrays for "no value". */
export const UNREACHABLE = -1

/**
 * Result of a single BFS from the goal. It serves every enemy at once: each one only looks
 * up its current cell.
 */
export type FlowField = {
  /** Steps from each cell to the goal; `UNREACHABLE` for walls and cells with no path. */
  readonly distance: Int32Array
  /** Next cell on a shortest path to the goal; `UNREACHABLE` for the goal and unreachable cells. */
  readonly next: Int32Array
  /** Nodes taken out of the queue. Reported in the metrics panel. */
  readonly visited: number
}

/** BFS from `goal` over the open cells. If `goal` is a wall, nothing is reachable. */
export function computeFlowField(_grid: Grid, _goal: CellIndex): FlowField {
  throw new Error('TODO: computeFlowField')
}

/** Steps from `cell` to the goal, or `undefined` if there is no path. */
export function distanceTo(_field: FlowField, _cell: CellIndex): number | undefined {
  throw new Error('TODO: distanceTo')
}

/** Cell an enemy standing on `cell` should move to, or `undefined` at the goal or with no path. */
export function nextStep(_field: FlowField, _cell: CellIndex): CellIndex | undefined {
  throw new Error('TODO: nextStep')
}
