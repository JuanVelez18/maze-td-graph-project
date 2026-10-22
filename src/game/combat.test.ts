import { describe, expect, it } from 'vitest'
import type { GameRules } from '../config'
import type { CellIndex } from '../graph/grid'
import { parseMap } from '../graph/test-map'
import { remainingCost, shoot, towerTargets } from './combat'
import { createGameFromGrid } from './map'
import type { Enemy, EnemyId, GameState } from './state'
import { testRules } from './test-rules'
import { update } from './update'

// Enemies walk the top row towards G; the walls on the bottom row are the towers.
const ONE_TOWER = `
  S.....G
  ...#...
`
const TWO_TOWERS = `
  S.....G
  ...##..
`

function setup(text: string, rules: Partial<GameRules> = {}) {
  const { grid, goal, spawns, at } = parseMap(text)
  const state = createGameFromGrid(grid, { spawns, goal }, testRules({ towerRange: 2, ...rules }))
  const enemy = (id: number, from: CellIndex, to: CellIndex, progress: number, hp = 1): Enemy => ({
    id: id as EnemyId,
    from,
    to,
    progress,
    hp,
  })
  return { state, at, enemy }
}

const withEnemies = (state: GameState, enemies: readonly Enemy[]): GameState => ({
  ...state,
  enemies,
  // The wave is fully spawned, so no new enemy appears during a tick.
  phase: { kind: 'spawning', remaining: 0 },
})

describe('remainingCost', () => {
  it('adds what is left of the current edge to the distance of `to`', () => {
    const { state, at, enemy } = setup(ONE_TOWER)
    // (5,0) is 1 step from the goal, and half of the edge into it is still ahead.
    expect(remainingCost(state.world, enemy(0, at(4, 0), at(5, 0), 0.5))).toBe(1.5)
  })
})

describe('towerTargets', () => {
  it('shoots the enemy closest to the goal, not the one closest to the tower', () => {
    const { state, at, enemy } = setup(ONE_TOWER)
    const nearTower = enemy(0, at(3, 0), at(4, 0), 0) // 1 cell from the tower, 3 from the goal
    const nearGoal = enemy(1, at(4, 0), at(5, 0), 0.5) // 1.8 cells from the tower, 1.5 from the goal

    expect(towerTargets(withEnemies(state, [nearTower, nearGoal]))).toEqual([
      { tower: at(3, 1), enemy: nearGoal },
    ])
  })

  it('ignores enemies out of range', () => {
    const { state, at, enemy } = setup(ONE_TOWER)
    // (0,0) is √10 ≈ 3.2 cells from the tower at (3,1).
    expect(towerTargets(withEnemies(state, [enemy(0, at(0, 0), at(1, 0), 0)]))).toEqual([])
  })

  it('picks the oldest enemy when two are equally close to the goal', () => {
    const { state, at, enemy } = setup(ONE_TOWER)
    const younger = enemy(5, at(3, 0), at(4, 0), 0)
    const older = enemy(2, at(3, 0), at(4, 0), 0)

    expect(towerTargets(withEnemies(state, [younger, older]))).toEqual([
      { tower: at(3, 1), enemy: older },
    ])
  })
})

describe('shoot', () => {
  it('adds up the damage of every tower on the same target', () => {
    const { state, at, enemy } = setup(TWO_TOWERS, { towerDps: 1 })
    const target = enemy(0, at(4, 0), at(5, 0), 0, 3)

    const [next, events] = shoot(withEnemies(state, [target]), 1)
    expect(next.enemies).toEqual([{ ...target, hp: 1 }])
    expect(events).toEqual([])
  })

  it('removes a killed enemy and pays the reward', () => {
    const { state, at, enemy } = setup(ONE_TOWER, { towerDps: 1, killReward: 3 })
    const target = enemy(0, at(4, 0), at(5, 0), 0.5)
    const far = enemy(1, at(0, 0), at(1, 0), 0)

    const [next, events] = shoot(withEnemies(state, [target, far]), 1)
    expect(next.enemies).toEqual([far])
    expect(next.money).toBe(state.money + 3)
    expect(events).toEqual([{ kind: 'enemy-killed' }])
  })
})

describe('tick: combat', () => {
  const tick = (state: GameState, dt: number) => update(state, { kind: 'tick', dt })

  it('does not count an enemy that reached the goal as a kill', () => {
    const { state, at, enemy } = setup(ONE_TOWER, { towerDps: 100, towerRange: 10 })
    const [next, events] = tick(withEnemies(state, [enemy(0, at(5, 0), at(6, 0), 0.5)]), 1)

    expect(events).toEqual([{ kind: 'enemy-reached-goal' }])
    expect(next.money).toBe(state.money)
  })

  it('ends the wave once the towers have killed every enemy', () => {
    const { state, at, enemy } = setup(ONE_TOWER, { towerDps: 10, enemySpeed: 0, waveBreak: 3 })
    const [next, events] = tick(withEnemies(state, [enemy(0, at(3, 0), at(4, 0), 0)]), 1)

    expect(events).toEqual([{ kind: 'enemy-killed' }])
    expect(next.enemies).toEqual([])
    expect(next.phase).toEqual({ kind: 'break', timer: 3 })
  })

  it('does not shoot while paused', () => {
    const { state, at, enemy } = setup(ONE_TOWER, { towerDps: 10 })
    const paused = { ...withEnemies(state, [enemy(0, at(3, 0), at(4, 0), 0)]), paused: true }
    const [next, events] = tick(paused, 1)

    expect(next).toBe(paused)
    expect(events).toEqual([])
  })
})
