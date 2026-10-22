/** A cell given by its coordinates, before it is validated against a grid. */
export type CellCoords = { readonly x: number; readonly y: number }

export type MapConfig = {
  readonly width: number
  readonly height: number
  readonly spawns: readonly CellCoords[]
  readonly goal: CellCoords
  /** Cells that cost `mudCost` to enter instead of 1. */
  readonly mud: readonly CellCoords[]
  readonly mudCost: number
}

export type GameRules = {
  /**
   * Enemy speed in cells per second on normal ground. Entering a cell takes as long as its
   * cost, so the weights of the graph are travel times and mud slows enemies down.
   */
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
  /** Speed of the BFS replay (debug mode), in levels per second. */
  readonly bfsLevelsPerSecond: number
  /** Money at the start of a game. */
  readonly startMoney: number
  /** Price of a tower; selling it gives the whole price back. */
  readonly towerCost: number
  /** Money for each enemy a tower kills. */
  readonly killReward: number
  /** How far a tower shoots, in cells, measured between centers. */
  readonly towerRange: number
  /** Damage per second a tower deals to its target. */
  readonly towerDps: number
  /** Life of an enemy in the first wave. */
  readonly enemyHp: number
  /** Extra life of the enemies in each wave after the first. */
  readonly enemyHpGrowth: number
}

/** An inclusive range of integers. */
export type IntRange = { readonly min: number; readonly max: number }

/** How to build a random map: the size and goal are fixed, the spawns and the mud come from a seed. */
export type MapGenConfig = {
  readonly width: number
  readonly height: number
  readonly goal: CellCoords
  /** Spawns are placed on the left edge (x = 0), on distinct rows. */
  readonly spawnCount: number
  /** Least number of rows between two spawns, so they do not share a route from the start. */
  readonly spawnGap: number
  /** Number of rectangular mud patches. */
  readonly mudPatches: IntRange
  readonly mudPatchWidth: IntRange
  readonly mudPatchHeight: IntRange
  /** Columns kept free of mud next to the left and right edges, where the spawns and goal are. */
  readonly mudMargin: number
  readonly mudCost: number
}

export const mapGenConfig: MapGenConfig = {
  width: 20,
  height: 12,
  goal: { x: 19, y: 6 },
  spawnCount: 2,
  spawnGap: 3,
  // A few patches in the middle: the cheapest routes go around them, while the BFS (which only
  // counts steps) would walk straight through.
  mudPatches: { min: 3, max: 4 },
  mudPatchWidth: { min: 2, max: 3 },
  mudPatchHeight: { min: 2, max: 4 },
  mudMargin: 3,
  mudCost: 4,
}

export const rules: GameRules = {
  enemySpeed: 2.5,
  spawnInterval: 1.2,
  baseLife: 20,
  firstBreak: 5,
  waveBreak: 4,
  firstWaveSize: 5,
  waveGrowth: 3,
  bfsLevelsPerSecond: 4,
  startMoney: 50,
  towerCost: 10,
  killReward: 3,
  towerRange: 2.5,
  towerDps: 2,
  enemyHp: 4,
  enemyHpGrowth: 2,
}
