import { describe, expect, it } from 'vitest'
import type { GameRules } from '../config'
import { isWall } from '../graph/grid'
import { parseMap } from '../graph/test-map'
import { createGameFromGrid } from './map'
import type { Event, GameState } from './state'
import { testRules } from './test-rules'
import { update } from './update'
import { enemyHp, waveSize } from './waves'

// Enemies walk the top row (2 edges from S to G); the bottom row is free for towers.
const MAP = `
  S.G
  ...
`

function setup(rules: Partial<GameRules>) {
  const { grid, goal, spawns, at } = parseMap(MAP)
  return { state: createGameFromGrid(grid, { spawns, goal }, testRules(rules)), at }
}

const tick = (state: GameState, dt: number) => update(state, { kind: 'tick', dt })

/** Runs `count` ticks of `dt` seconds and collects every event. */
function run(state: GameState, count: number, dt: number): [GameState, readonly Event[]] {
  let current = state
  const events: Event[] = []
  for (let i = 0; i < count; i++) {
    const [next, emitted] = tick(current, dt)
    current = next
    events.push(...emitted)
  }
  return [current, events]
}

describe('waves', () => {
  it('starts the first wave once the first break is over', () => {
    const { state } = setup({ firstBreak: 2, firstWaveSize: 2, enemySpeed: 0 })
    expect(state.phase).toEqual({ kind: 'break', timer: 2 })

    const [waiting, none] = tick(state, 1.5)
    expect(none).toEqual([])
    expect(waiting.enemies).toEqual([])
    expect(waiting.wave).toBe(0)

    const [started, events] = tick(waiting, 0.5)
    expect(events).toEqual([{ kind: 'wave-started', wave: 1 }])
    expect(started.wave).toBe(1)
    expect(started.enemies).toHaveLength(1)
    expect(started.phase).toEqual({ kind: 'spawning', remaining: 1 })
  })

  it('makes each wave `waveGrowth` enemies bigger than the last', () => {
    const rules = testRules({ firstWaveSize: 2, waveGrowth: 3 })
    expect([1, 2, 3].map((wave) => waveSize(rules, wave))).toEqual([2, 5, 8])
  })

  it('makes the enemies of each wave `enemyHpGrowth` tougher than the last', () => {
    const rules = testRules({ enemyHp: 4, enemyHpGrowth: 2 })
    expect([1, 2, 3].map((wave) => enemyHp(rules, wave))).toEqual([4, 6, 8])
  })

  it('spawns the enemies of a wave with that wave’s life', () => {
    const { state } = setup({ enemyHp: 4, enemyHpGrowth: 2, enemySpeed: 0 })
    const [first] = tick(state, 0)
    expect(first.enemies).toMatchObject([{ hp: 4 }])
  })

  it('spawns exactly `waveSize` enemies, even with a long wait', () => {
    const { state } = setup({ firstWaveSize: 2, enemySpeed: 0 })
    const [after] = run(state, 10, 1)

    expect(after.enemies).toHaveLength(2)
    // Every enemy appeared, but they are still on the board: the wave is not over.
    expect(after.phase).toEqual({ kind: 'spawning', remaining: 0 })
  })

  it('takes a break only after the board is empty, then starts a bigger wave', () => {
    const { state } = setup({ firstWaveSize: 2, waveGrowth: 3, waveBreak: 3 })

    // t=0: A appears. t=1: B appears. t=2: A arrives. t=3: B arrives and the board is empty.
    const [spawned] = run(state, 3, 1)
    expect(spawned.phase).toEqual({ kind: 'spawning', remaining: 0 })
    expect(spawned.enemies).toHaveLength(1)

    const [cleared, arrivals] = tick(spawned, 1)
    expect(arrivals).toEqual([{ kind: 'enemy-reached-goal' }])
    expect(cleared.enemies).toEqual([])
    expect(cleared.phase).toEqual({ kind: 'break', timer: 3 })

    const [second, events] = tick(cleared, 3)
    expect(events).toEqual([{ kind: 'wave-started', wave: 2 }])
    expect(second.phase).toEqual({ kind: 'spawning', remaining: 4 })
  })
})

describe('base life', () => {
  it('loses 1 life per enemy at the goal, and the game at 0', () => {
    const { state } = setup({ baseLife: 2 })

    // t=0: A appears. t=2: A arrives. t=3: B arrives.
    const [hit, first] = run(state, 3, 1)
    expect(first).toEqual([{ kind: 'wave-started', wave: 1 }, { kind: 'enemy-reached-goal' }])
    expect(hit.life).toBe(1)

    const [lost, events] = tick(hit, 1)
    expect(events).toEqual([{ kind: 'enemy-reached-goal' }, { kind: 'game-over', wave: 1 }])
    expect(lost.life).toBe(0)
    expect(lost.phase).toEqual({ kind: 'lost' })
  })

  it('freezes a lost game: ticks, towers and pause change nothing', () => {
    const { state, at } = setup({ baseLife: 1 })
    const [lost] = run(state, 3, 1)
    expect(lost.phase).toEqual({ kind: 'lost' })

    for (const msg of [
      { kind: 'tick', dt: 1 },
      { kind: 'place-tower', cell: at(1, 1) },
      { kind: 'sell-tower', cell: at(1, 1) },
      { kind: 'toggle-pause' },
    ] as const) {
      const [next, events] = update(lost, msg)
      expect(next).toBe(lost)
      expect(events).toEqual([])
    }

    // Debug still works, to inspect the board after losing.
    const [debug] = update(lost, { kind: 'toggle-debug' })
    expect(debug.debug).toBe(true)
  })
})

describe('pause', () => {
  it('stops the clock but still lets the player build', () => {
    const { state, at } = setup({ firstBreak: 2 })
    const [paused] = update(state, { kind: 'toggle-pause' })
    expect(paused.paused).toBe(true)

    const [same, none] = tick(paused, 5)
    expect(same).toBe(paused)
    expect(none).toEqual([])

    const [built] = update(paused, { kind: 'place-tower', cell: at(1, 1) })
    expect(isWall(built.world.grid, at(1, 1))).toBe(true)

    const [resumed] = update(built, { kind: 'toggle-pause' })
    const [moving] = tick(resumed, 1)
    expect(moving.phase).toEqual({ kind: 'break', timer: 1 })
  })
})
