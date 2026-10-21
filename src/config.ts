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
  /** Seconds between two enemies; the spawns take turns. */
  readonly spawnInterval: number
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
}
