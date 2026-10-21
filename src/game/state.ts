import type { GameRules } from '../config'
import type { ConnectedGrid } from '../graph/connectivity'
import type { CellIndex } from '../graph/grid'
import type { Brand } from '../shared/brand'

/** The parts of the map that never change during a game. */
export type GameMap = {
  readonly spawns: readonly CellIndex[]
  readonly goal: CellIndex
}

export type EnemyId = Brand<number, 'EnemyId'>

/**
 * An enemy walks one edge at a time, from the center of `from` to the center of `to`. On
 * arrival it asks the flow field for the next cell, so a new field reroutes it at the next node.
 * It occupies both cells: no tower can be placed on them, so `to` is always open.
 */
export type Enemy = {
  readonly id: EnemyId
  readonly from: CellIndex
  readonly to: CellIndex
  /** Fraction of the edge already walked, in [0, 1). */
  readonly progress: number
}

export type GameState = {
  readonly map: GameMap
  readonly rules: GameRules
  /** The current grid with its flow field. Being a `ConnectedGrid`, every spawn reaches the goal. */
  readonly world: ConnectedGrid
  readonly enemies: readonly Enemy[]
  /** Seconds until the next enemy appears. */
  readonly spawnTimer: number
  /** Index in `map.spawns` of the spawn whose turn is next. */
  readonly nextSpawn: number
  readonly nextEnemyId: number
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
  | { readonly kind: 'enemy-on-cell' }
  /** The tower would leave these sources (spawns or enemies) without a path to the goal. */
  | { readonly kind: 'blocks-path'; readonly cells: readonly CellIndex[] }

/** Facts for the shell (UI, metrics); never commands. */
export type Event =
  | { readonly kind: 'placement-rejected'; readonly error: PlacementError }
  | { readonly kind: 'enemy-reached-goal' }
  /** `visited` comes from the BFS; the shell measures and adds the time. */
  | { readonly kind: 'path-recomputed'; readonly visited: number }
