import { describe, expect, it } from 'vitest'
import type { GameRules } from '../config'
import { distanceTo, nextStep } from '../graph/flow-field'
import type { CellIndex } from '../graph/grid'
import { parseMap } from '../graph/test-map'
import { createGameFromGrid } from './map'
import type { Enemy, EnemyId, GameState } from './state'
import { testRules } from './test-rules'
import { update } from './update'

const OPEN = `
  S...
  ....
  ...G
`

function setup(text: string, rules: Partial<GameRules>) {
  const { grid, goal, spawns, at } = parseMap(text)
  return { state: createGameFromGrid(grid, { spawns, goal }, testRules(rules)), at }
}

const tick = (state: GameState, dt: number) => update(state, { kind: 'tick', dt })

function step(state: GameState, cell: CellIndex): CellIndex {
  const next = nextStep(state.world.field, cell)
  if (next === undefined) throw new Error('No next step')
  return next
}

describe('tick: spawning', () => {
  it('spawns the first enemy on the first tick, heading along the flow field', () => {
    const { state, at } = setup(OPEN, { enemySpeed: 1, spawnInterval: 1 })
    const [next, events] = tick(state, 0)

    expect(events).toEqual([{ kind: 'wave-started', wave: 1 }])
    expect(next.enemies).toEqual([
      { id: 0, from: at(0, 0), to: step(state, at(0, 0)), progress: 0 },
    ])
  })

  it('lets the spawns take turns, one enemy per interval', () => {
    const { state, at } = setup(
      `
        S..
        ..G
        S..
      `,
      { enemySpeed: 0, spawnInterval: 1 },
    )
    let current = state
    for (let i = 0; i < 3; i++) [current] = tick(current, i === 0 ? 0 : 1)

    expect(current.enemies.map((enemy) => [enemy.id, enemy.from])).toEqual([
      [0, at(0, 0)],
      [1, at(0, 2)],
      [2, at(0, 0)],
    ])
  })
})

describe('tick: movement', () => {
  it('walks a shortest path and leaves at the goal after `distance` cells', () => {
    const { state, at } = setup(OPEN, { enemySpeed: 1, spawnInterval: 1000 })
    expect(distanceTo(state.world.field, at(0, 0))).toBe(5)

    const [spawned] = tick(state, 0)
    // Several edges in one tick: the enemy is halfway through its last edge.
    const [almost, noEvents] = tick(spawned, 4.5)
    expect(noEvents).toEqual([])
    expect(almost.enemies).toMatchObject([{ to: at(3, 2), progress: 0.5 }])

    const [arrived, events] = tick(almost, 0.5)
    expect(arrived.enemies).toEqual([])
    expect(events).toEqual([{ kind: 'enemy-reached-goal' }])
  })

  it('takes the new route at the next cell when a tower changes the flow field', () => {
    const { state } = setup(OPEN, { enemySpeed: 1, spawnInterval: 1000 })
    const [spawned] = tick(state, 0)
    const enemy = spawned.enemies[0] as Enemy
    const blocked = step(spawned, enemy.to)

    const [walled, events] = update(spawned, { kind: 'place-tower', cell: blocked })
    expect(events).toMatchObject([{ kind: 'path-recomputed' }])

    const [moved] = tick(walled, 1)
    const after = moved.enemies[0] as Enemy
    expect(after.from).toBe(enemy.to)
    expect(after.to).not.toBe(blocked)
    expect(after.to).toBe(step(walled, enemy.to))
  })
})

describe('place-tower with live enemies', () => {
  it('rejects a tower on either cell an enemy occupies', () => {
    const { state } = setup(OPEN, { enemySpeed: 1, spawnInterval: 1000 })
    const [spawned] = tick(state, 0.5)
    const enemy = spawned.enemies[0] as Enemy

    // `from` is the spawn here, so move the enemy one edge first.
    const [moved] = tick(spawned, 1)
    const onEdge = moved.enemies[0] as Enemy
    expect(onEdge.from).toBe(enemy.to)

    for (const cell of [onEdge.from, onEdge.to]) {
      const [next, events] = update(moved, { kind: 'place-tower', cell })
      expect(next).toBe(moved)
      expect(events).toEqual([{ kind: 'placement-rejected', error: { kind: 'enemy-on-cell' } }])
    }
  })

  it('rejects a tower that would trap an enemy even if every spawn keeps its path', () => {
    // The bottom pocket only connects to the rest through (2,1).
    const { state, at } = setup(
      `
        S...G
        ##.##
        #...#
      `,
      { enemySpeed: 1, spawnInterval: 1000 },
    )
    const trapped: Enemy = { id: 0 as EnemyId, from: at(1, 2), to: at(2, 2), progress: 0.5 }
    const withEnemy = { ...state, enemies: [trapped] }

    const [next, events] = update(withEnemy, { kind: 'place-tower', cell: at(2, 1) })
    expect(next).toBe(withEnemy)
    expect(events).toEqual([
      { kind: 'placement-rejected', error: { kind: 'blocks-path', cells: [at(2, 2)] } },
    ])
  })
})
