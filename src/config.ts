/** A cell given by its coordinates, before it is validated against a grid. */
export type CellCoords = { readonly x: number; readonly y: number }

export type MapConfig = {
  readonly width: number
  readonly height: number
  readonly spawns: readonly CellCoords[]
  readonly goal: CellCoords
}

export type GameRules = {
  /** Enemy speed in cells (edges) per second. */
  readonly enemySpeed: number
  /** Seconds between two enemies of a wave; the spawns take turns. */
  readonly spawnInterval: number
  /** Life of the base; each enemy that reaches the goal takes 1. */
  readonly baseLife: number
  /** Seconds before the first wave, to start building. */
  readonly firstBreak: number
  /** Seconds between a cleared wave and the next one. */
  readonly waveBreak: number
  /** Enemies in the first wave. */
  readonly firstWaveSize: number
  /** Extra enemies in each wave after the first. */
  readonly waveGrowth: number
}

export const mapConfig: MapConfig = {
  width: 20,
  height: 12,
  spawns: [
    { x: 0, y: 2 },
    { x: 0, y: 9 },
  ],
  goal: { x: 19, y: 6 },
}

export const rules: GameRules = {
  enemySpeed: 2.5,
  spawnInterval: 1.2,
  baseLife: 20,
  firstBreak: 5,
  waveBreak: 4,
  firstWaveSize: 5,
  waveGrowth: 3,
}
