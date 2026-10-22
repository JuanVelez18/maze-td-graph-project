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

export const mapConfig: MapConfig = {
  width: 20,
  height: 12,
  spawns: [
    { x: 0, y: 2 },
    { x: 0, y: 9 },
  ],
  goal: { x: 19, y: 6 },
  // A band of mud across the middle, open at the top and bottom: the cheapest routes go around
  // it, while the BFS (which only counts steps) would walk straight through.
  mud: band(12, 13, 2, 9),
  mudCost: 4,
}

/** Every cell of the rectangle [x0, x1] × [y0, y1]. */
function band(x0: number, x1: number, y0: number, y1: number): CellCoords[] {
  const cells: CellCoords[] = []
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells.push({ x, y })
  return cells
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
