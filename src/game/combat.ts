import type { ConnectedGrid } from '../graph/connectivity'
import { distanceTo } from '../graph/flow-field'
import { type CellIndex, cellAt, cost, isWall } from '../graph/grid'
import { enemyPosition } from './enemies'
import type { Enemy, EnemyId, Event, GameState } from './state'

/** A tower and the enemy it shoots at this moment. */
export type Shot = { readonly tower: CellIndex; readonly enemy: Enemy }

/**
 * Time `enemy` still needs to reach the goal: what is left of its current edge plus the
 * distance of `to` in the flow field. Dijkstra already computed that distance for every
 * node, so the towers know who is closest to the goal without searching again.
 */
export function remainingCost(world: ConnectedGrid, enemy: Enemy): number {
  const distance = distanceTo(world.field, enemy.to)
  // `to` is a checked source of the connected grid, so it always has a distance.
  if (distance === undefined) throw new Error('An enemy lost its path to the goal')
  return distance + (1 - enemy.progress) * cost(world.grid, enemy.to)
}

/**
 * Every tower with an enemy in range shoots the one closest to the goal (the oldest on a tie),
 * the most dangerous one. Towers are the walls of the grid. O(towers × enemies).
 */
export function towerTargets(state: GameState): readonly Shot[] {
  const { world, enemies, rules } = state
  const { grid } = world
  if (enemies.length === 0) return []

  // Computed once per enemy instead of once per tower and enemy.
  const candidates = enemies.map((enemy) => ({
    enemy,
    position: enemyPosition(grid, enemy),
    remaining: remainingCost(world, enemy),
  }))
  const rangeSquared = rules.towerRange * rules.towerRange

  const shots: Shot[] = []
  for (let y = 0; y < grid.height; y++)
    for (let x = 0; x < grid.width; x++) {
      const tower = cellAt(grid, x, y)
      if (tower === undefined || !isWall(grid, tower)) continue
      let best: (typeof candidates)[number] | undefined
      for (const candidate of candidates) {
        const dx = candidate.position.x - x
        const dy = candidate.position.y - y
        if (dx * dx + dy * dy > rangeSquared) continue
        if (
          best === undefined ||
          candidate.remaining < best.remaining ||
          (candidate.remaining === best.remaining && candidate.enemy.id < best.enemy.id)
        )
          best = candidate
      }
      if (best !== undefined) shots.push({ tower, enemy: best.enemy })
    }
  return shots
}

/**
 * Every tower deals `towerDps · dt` damage to its target. Enemies left without life leave the
 * board, and each one pays `killReward`.
 */
export function shoot(state: GameState, dt: number): [GameState, readonly Event[]] {
  const damage = state.rules.towerDps * dt
  if (damage <= 0) return [state, []]
  const shots = towerTargets(state)
  if (shots.length === 0) return [state, []]

  const taken = new Map<EnemyId, number>()
  for (const { enemy } of shots) taken.set(enemy.id, (taken.get(enemy.id) ?? 0) + damage)

  const enemies: Enemy[] = []
  let killed = 0
  for (const enemy of state.enemies) {
    const hp = enemy.hp - (taken.get(enemy.id) ?? 0)
    if (hp <= 0) killed++
    else enemies.push(hp === enemy.hp ? enemy : { ...enemy, hp })
  }

  const events: Event[] = Array.from({ length: killed }, () => ({ kind: 'enemy-killed' }))
  return [{ ...state, enemies, money: state.money + killed * state.rules.killReward }, events]
}
