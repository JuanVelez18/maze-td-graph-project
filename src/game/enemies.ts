import type { ConnectedGrid } from '../graph/connectivity'
import { nextStep } from '../graph/flow-field'
import type { CellIndex } from '../graph/grid'
import type { Enemy, EnemyId } from './state'

/**
 * Moves every enemy `distance` cells along the flow field. Enemies that reach the goal leave
 * the board and are counted in `arrived`.
 */
export function moveEnemies(
  world: ConnectedGrid,
  enemies: readonly Enemy[],
  distance: number,
): { readonly enemies: readonly Enemy[]; readonly arrived: number } {
  const moved: Enemy[] = []
  let arrived = 0
  for (const enemy of enemies) {
    const next = walk(world, enemy, distance)
    if (next === undefined) arrived++
    else moved.push(next)
  }
  return { enemies: moved, arrived }
}

/** Cells an enemy stands on; a tower there is rejected. */
export function occupiedCells(enemy: Enemy): readonly CellIndex[] {
  return [enemy.from, enemy.to]
}

/** A new enemy on `spawn`, already heading to the first cell of its shortest path. */
export function spawnEnemy(world: ConnectedGrid, spawn: CellIndex, id: EnemyId): Enemy {
  const next = nextStep(world.field, spawn)
  if (next === undefined) throw new Error('A spawn has no path to the goal')
  return { id, from: spawn, to: next, progress: 0 }
}

/**
 * Moves `enemy` `distance` cells along the flow field, possibly across several edges. Returns
 * `undefined` once it reaches the goal.
 */
function walk(world: ConnectedGrid, enemy: Enemy, distance: number): Enemy | undefined {
  let { from, to } = enemy
  let progress = enemy.progress + distance
  while (progress >= 1) {
    if (to === world.goal) return undefined
    // `to` is a checked source of the connected grid, so it always has a next step.
    const next = nextStep(world.field, to)
    if (next === undefined) throw new Error('An enemy lost its path to the goal')
    from = to
    to = next
    progress -= 1
  }
  return { id: enemy.id, from, to, progress }
}
