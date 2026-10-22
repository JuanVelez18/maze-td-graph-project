import type { ConnectedGrid } from '../graph/connectivity'
import { nextStep } from '../graph/flow-field'
import { type CellIndex, cost } from '../graph/grid'
import type { Enemy, EnemyId } from './state'

/**
 * Moves every enemy along the flow field, spending `travel` units of cost: entering a normal
 * cell takes 1 and entering mud takes its cost. Enemies that reach the goal leave the board
 * and are counted in `arrived`.
 */
export function moveEnemies(
  world: ConnectedGrid,
  enemies: readonly Enemy[],
  travel: number,
): { readonly enemies: readonly Enemy[]; readonly arrived: number } {
  const moved: Enemy[] = []
  let arrived = 0
  for (const enemy of enemies) {
    const next = walk(world, enemy, travel)
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
 * Moves `enemy` along the flow field spending `travel` units of cost, possibly across several
 * edges. An edge costs what its `to` cell costs to enter. Returns `undefined` once it reaches
 * the goal.
 */
function walk(world: ConnectedGrid, enemy: Enemy, travel: number): Enemy | undefined {
  let { from, to, progress } = enemy
  let left = travel
  while (true) {
    const edgeCost = cost(world.grid, to)
    // What is left of the current edge, in units of cost.
    const remaining = (1 - progress) * edgeCost
    if (left < remaining) return { id: enemy.id, from, to, progress: progress + left / edgeCost }
    left -= remaining
    if (to === world.goal) return undefined
    // `to` is a checked source of the connected grid, so it always has a next step.
    const next = nextStep(world.field, to)
    if (next === undefined) throw new Error('An enemy lost its path to the goal')
    from = to
    to = next
    progress = 0
  }
}
