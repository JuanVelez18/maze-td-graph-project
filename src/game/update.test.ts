import { describe, expect, it } from 'vitest'
import { isWall } from '../graph/grid'
import { parseMap } from '../graph/test-map'
import { createGame, createGameFromGrid } from './map'
import { update } from './update'

// Spawns at (0,0) and (0,2); the wall column at x = 2 leaves a single gap at (2,2).
const MAP = `
  S.#..
  ..#.G
  S....
`

const RULES = { enemySpeed: 1, spawnInterval: 1 }

function setup(text = MAP) {
  const { grid, goal, spawns, at } = parseMap(text)
  return { state: createGameFromGrid(grid, { spawns, goal }, RULES), at }
}

describe('update: place-tower', () => {
  it('places a tower on a free cell and reports the recomputed path', () => {
    const { state, at } = setup()
    const [next, events] = update(state, { kind: 'place-tower', cell: at(4, 0) })

    expect(isWall(next.world.grid, at(4, 0))).toBe(true)
    expect(isWall(state.world.grid, at(4, 0))).toBe(false)
    // 15 cells - 3 walls = 12 open cells, all reachable from the goal.
    expect(events).toEqual([{ kind: 'path-recomputed', visited: 12 }])
  })

  it.each([
    ['a spawn', 0, 0, { kind: 'is-spawn' }],
    ['the goal', 4, 1, { kind: 'is-goal' }],
    ['an existing tower', 2, 0, { kind: 'occupied' }],
  ] as const)('rejects %s and keeps the same state', (_, x, y, error) => {
    const { state, at } = setup()
    const [next, events] = update(state, { kind: 'place-tower', cell: at(x, y) })

    expect(next).toBe(state)
    expect(events).toEqual([{ kind: 'placement-rejected', error }])
  })

  it('rejects a tower that would cut the last path, listing the isolated spawns', () => {
    const { state, at } = setup()
    const [next, events] = update(state, { kind: 'place-tower', cell: at(2, 2) })

    expect(next).toBe(state)
    expect(events).toEqual([
      {
        kind: 'placement-rejected',
        error: { kind: 'blocks-path', cells: [at(0, 0), at(0, 2)] },
      },
    ])
  })
})

describe('update: sell-tower', () => {
  it('removes the tower and reports the recomputed path', () => {
    const { state, at } = setup()
    const [next, events] = update(state, { kind: 'sell-tower', cell: at(2, 0) })

    expect(isWall(next.world.grid, at(2, 0))).toBe(false)
    expect(events).toEqual([{ kind: 'path-recomputed', visited: 14 }])
  })

  it('ignores a cell without a tower', () => {
    const { state, at } = setup()
    const [next, events] = update(state, { kind: 'sell-tower', cell: at(1, 1) })

    expect(next).toBe(state)
    expect(events).toEqual([])
  })
})

describe('update: other messages', () => {
  it('toggles debug mode', () => {
    const { state } = setup()
    const [on] = update(state, { kind: 'toggle-debug' })
    const [off] = update(on, { kind: 'toggle-debug' })

    expect(on.debug).toBe(true)
    expect(off.debug).toBe(false)
  })
})

describe('createGame', () => {
  it('throws when a spawn has no path to the goal', () => {
    const { grid, goal, spawns } = parseMap(`
      S#G
    `)
    expect(() => createGameFromGrid(grid, { spawns, goal }, RULES)).toThrow()
  })

  it('throws when a configured cell is outside the map', () => {
    const config = { width: 3, height: 3, spawns: [{ x: 3, y: 0 }], goal: { x: 0, y: 0 } }
    expect(() => createGame(config, RULES)).toThrow()
  })

  it('builds an open grid without enemies from the configuration', () => {
    const state = createGame(
      { width: 3, height: 2, spawns: [{ x: 0, y: 0 }], goal: { x: 2, y: 1 } },
      RULES,
    )
    expect(state.world.field.visited).toBe(6)
    expect(state.enemies).toEqual([])
    expect(state.debug).toBe(false)
  })
})
