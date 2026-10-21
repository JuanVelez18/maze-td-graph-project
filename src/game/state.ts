import type { ConnectedGrid } from '../graph/connectivity'
import type { CellIndex } from '../graph/grid'

/** The parts of the map that never change during a game. */
export type GameMap = {
  readonly spawns: readonly CellIndex[]
  readonly goal: CellIndex
}

export type GameState = {
  readonly map: GameMap
  /** The current grid with its flow field. Being a `ConnectedGrid`, every spawn reaches the goal. */
  readonly world: ConnectedGrid
  readonly debug: boolean
}

export type Msg =
  | { readonly kind: 'place-tower'; readonly cell: CellIndex }
  | { readonly kind: 'sell-tower'; readonly cell: CellIndex }
  | { readonly kind: 'tick'; readonly dt: number }
  | { readonly kind: 'toggle-debug' }

export type PlacementError =
  | { readonly kind: 'is-spawn' }
  | { readonly kind: 'is-goal' }
  | { readonly kind: 'occupied' }
  /** The tower would leave these sources without a path to the goal. */
  | { readonly kind: 'blocks-path'; readonly cells: readonly CellIndex[] }

/** Facts for the shell (UI, metrics); never commands. */
export type Event =
  | { readonly kind: 'placement-rejected'; readonly error: PlacementError }
  /** `visited` comes from the BFS; the shell measures and adds the time. */
  | { readonly kind: 'path-recomputed'; readonly visited: number }
