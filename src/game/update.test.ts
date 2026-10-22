import { describe, expect, it } from 'vitest'
import { distanceTo } from '../graph/flow-field'
import { type CellIndex, cellAt, cost, isWall } from '../graph/grid'
import { parseMap } from '../graph/test-map'
import { createGame, createGameFromGrid } from './map'
import { testRules } from './test-rules'
import { update } from './update'

// Spawns at (0,0) and (0,2); the wall column at x = 2 leaves a single gap at (2,2).
const MAP = `
  S.#..
  ..#.G
  S....
`

const RULES = testRules()

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

describe('update: money', () => {
  it('charges the tower cost and gives all of it back on sale', () => {
    const { state, at } = setup()
    const [built] = update(state, { kind: 'place-tower', cell: at(4, 0) })
    expect(built.money).toBe(state.money - RULES.towerCost)

    const [sold] = update(built, { kind: 'sell-tower', cell: at(4, 0) })
    expect(sold.money).toBe(state.money)
  })

  it('rejects a tower the player cannot pay for', () => {
    const { state, at } = setup()
    const poor = { ...state, money: RULES.towerCost - 1 }
    const [next, events] = update(poor, { kind: 'place-tower', cell: at(4, 0) })

    expect(next).toBe(poor)
    expect(events).toEqual([{ kind: 'placement-rejected', error: { kind: 'no-money' } }])
  })

  it('still names the cell problem first when money is short', () => {
    const { state, at } = setup()
    const [, events] = update({ ...state, money: 0 }, { kind: 'place-tower', cell: at(0, 0) })
    expect(events).toEqual([{ kind: 'placement-rejected', error: { kind: 'is-spawn' } }])
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
    const config = {
      width: 3,
      height: 3,
      spawns: [{ x: 3, y: 0 }],
      goal: { x: 0, y: 0 },
      mud: [],
      mudCost: 4,
    }
    expect(() => createGame(config, RULES)).toThrow()
  })

  it('builds an open grid without enemies from the configuration', () => {
    const state = createGame(
      { width: 3, height: 2, spawns: [{ x: 0, y: 0 }], goal: { x: 2, y: 1 }, mud: [], mudCost: 4 },
      RULES,
    )
    expect(state.world.field.visited).toBe(6)
    expect(state.enemies).toEqual([])
    expect(state.debug).toBe(false)
  })

  it('puts mud on the configured cells', () => {
    const state = createGame(
      {
        width: 3,
        height: 2,
        spawns: [{ x: 0, y: 0 }],
        goal: { x: 2, y: 0 },
        mud: [{ x: 1, y: 0 }],
        mudCost: 4,
      },
      RULES,
    )
    const { grid, field } = state.world
    const at = (x: number, y: number): CellIndex => {
      const cell = cellAt(grid, x, y)
      if (cell === undefined) throw new Error('unreachable')
      return cell
    }
    expect(cost(grid, at(1, 0))).toBe(4)
    expect(cost(grid, at(0, 1))).toBe(1)
    // Around the mud (4 cells of cost 1) beats through it (4 + 1).
    expect(distanceTo(field, at(0, 0))).toBe(4)
  })
})
