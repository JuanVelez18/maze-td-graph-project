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

/** Where the game is in its cycle of waves. */
export type Phase =
  /** Between waves: `timer` seconds until the next one starts. */
  | { readonly kind: 'break'; readonly timer: number }
  /** A wave is on: `remaining` of its enemies have yet to appear. */
  | { readonly kind: 'spawning'; readonly remaining: number }
  /** The base ran out of life; nothing moves any more. */
  | { readonly kind: 'lost' }

export type GameState = {
  readonly map: GameMap
  readonly rules: GameRules
  /** The current grid with its flow field. Being a `ConnectedGrid`, every spawn reaches the goal. */
  readonly world: ConnectedGrid
  readonly enemies: readonly Enemy[]
  /** Seconds until the next enemy appears, while a wave is spawning. */
  readonly spawnTimer: number
  /** Index in `map.spawns` of the spawn whose turn is next. */
  readonly nextSpawn: number
  readonly nextEnemyId: number
  readonly life: number
  /** Number of the current (or last) wave; 0 before the first one. */
  readonly wave: number
  readonly phase: Phase
  readonly paused: boolean
  readonly debug: boolean
  /**
   * Debug replay of the BFS from the goal, `elapsed` seconds in. It only needs the time: the
   * level shown follows from it, and the cells of each level from the flow field distances.
   */
  readonly bfsReplay: { readonly elapsed: number } | undefined
}

export type Msg =
  | { readonly kind: 'place-tower'; readonly cell: CellIndex }
  | { readonly kind: 'sell-tower'; readonly cell: CellIndex }
  | { readonly kind: 'tick'; readonly dt: number }
  | { readonly kind: 'toggle-pause' }
  | { readonly kind: 'toggle-debug' }
  /** Turns debug on and replays the BFS level by level, from the goal. */
  | { readonly kind: 'play-bfs' }

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
  | { readonly kind: 'wave-started'; readonly wave: number }
  | { readonly kind: 'game-over'; readonly wave: number }
  /** `visited` comes from the BFS; the shell measures and adds the time. */
  | { readonly kind: 'path-recomputed'; readonly visited: number }
