import type { CellCoords, MapConfig, MapGenConfig } from '../config'
import { createRng, type Rng, randomInt } from '../shared/random'

/**
 * Builds a map from a seed: the same seed always gives the same map. Mud only changes the
 * weights of the graph and never removes a node, so it cannot disconnect a spawn: every map
 * this returns is valid.
 */
export function generateMap(gen: MapGenConfig, seed: number): MapConfig {
  const rng = createRng(seed)
  return {
    width: gen.width,
    height: gen.height,
    goal: gen.goal,
    spawns: spawnRows(rng, gen).map((y) => ({ x: 0, y })),
    mud: mudPatches(rng, gen),
    mudCost: gen.mudCost,
  }
}

/** Distinct rows, at least `spawnGap` apart, picked among the rows still allowed each time. */
function spawnRows(rng: Rng, gen: MapGenConfig): number[] {
  const rows: number[] = []
  for (let i = 0; i < gen.spawnCount; i++) {
    const allowed: number[] = []
    for (let y = 0; y < gen.height; y++)
      if (rows.every((row) => Math.abs(row - y) >= gen.spawnGap)) allowed.push(y)
    const row = allowed[randomInt(rng, 0, allowed.length - 1)]
    if (row === undefined) throw new Error(`${gen.spawnCount} spawns do not fit on the left edge`)
    rows.push(row)
  }
  return rows.sort((a, b) => a - b)
}

/** Rectangles inside the columns [mudMargin, width - 1 - mudMargin]; they may overlap. */
function mudPatches(rng: Rng, gen: MapGenConfig): CellCoords[] {
  const lastX = gen.width - 1 - gen.mudMargin
  const cells = new Map<number, CellCoords>()
  const count = randomInt(rng, gen.mudPatches.min, gen.mudPatches.max)
  for (let i = 0; i < count; i++) {
    const w = randomInt(rng, gen.mudPatchWidth.min, gen.mudPatchWidth.max)
    const h = randomInt(rng, gen.mudPatchHeight.min, gen.mudPatchHeight.max)
    const x0 = randomInt(rng, gen.mudMargin, lastX - w + 1)
    const y0 = randomInt(rng, 0, gen.height - h)
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) cells.set(y * gen.width + x, { x, y })
  }
  return [...cells.values()]
}
