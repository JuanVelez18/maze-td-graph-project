import type { Brand } from '../shared/brand'
import type { Result } from '../shared/result'
import type { FlowField } from './flow-field'
import type { CellIndex, Grid } from './grid'

/**
 * A grid where every source checked by `connect` reaches the goal, together with the flow
 * field that proves it. `connect` is its only constructor: no casts anywhere else.
 */
export type ConnectedGrid = Brand<
  { readonly grid: Grid; readonly goal: CellIndex; readonly field: FlowField },
  'ConnectedGrid'
>

export type Disconnected = {
  readonly kind: 'disconnected'
  /** Sources with no path to the goal, in the order they were given. */
  readonly cells: readonly CellIndex[]
}

/**
 * Runs one BFS from `goal` and checks that every source (spawns, live enemies) has a
 * distance. Connectivity falls out of the same flow field the enemies will use.
 */
export function connect(
  _grid: Grid,
  _goal: CellIndex,
  _sources: readonly CellIndex[],
): Result<ConnectedGrid, Disconnected> {
  throw new Error('TODO: connect')
}
