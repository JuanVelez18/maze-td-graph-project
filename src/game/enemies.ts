import type { ConnectedGrid } from '../graph/connectivity'
import { nextStep } from '../graph/flow-field'
import type { CellIndex } from '../graph/grid'
import type { Enemy, EnemyId, Event, GameState } from './state'

/** Advances the game clock by `dt` seconds: enemies walk, then new ones appear. */
export function tick(state: GameState, dt: number): [GameState, readonly Event[]] {
  const events: Event[] = []
  const walked = state.rules.enemySpeed * dt
  const enemies: Enemy[] = []
  for (const enemy of state.enemies) {
    const moved = walk(state.world, enemy, walked)
    if (moved === undefined) events.push({ kind: 'enemy-reached-goal' })
    else enemies.push(moved)
  }

  let { spawnTimer, nextSpawn, nextEnemyId } = state
  spawnTimer -= dt
  while (spawnTimer <= 0) {
    const spawn = state.map.spawns[nextSpawn]
    if (spawn === undefined) break
    enemies.push(spawnEnemy(state.world, spawn, nextEnemyId as EnemyId))
    nextEnemyId++
    nextSpawn = (nextSpawn + 1) % state.map.spawns.length
    spawnTimer += state.rules.spawnInterval
  }

  return [{ ...state, enemies, spawnTimer, nextSpawn, nextEnemyId }, events]
}

/** Cells an enemy stands on; a tower there is rejected. */
export function occupiedCells(enemy: Enemy): readonly CellIndex[] {
  return [enemy.from, enemy.to]
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

function spawnEnemy(world: ConnectedGrid, spawn: CellIndex, id: EnemyId): Enemy {
  const next = nextStep(world.field, spawn)
  if (next === undefined) throw new Error('A spawn has no path to the goal')
  return { id, from: spawn, to: next, progress: 0 }
}
