import { describe, expect, it } from 'vitest'
import { connect } from './connectivity'
import { distanceTo } from './flow-field'
import { parseMap } from './test-map'

describe('connect', () => {
  it('accepts a grid where every source reaches the goal and keeps its flow field', () => {
    const { grid, goal, spawns } = parseMap(`
      S.#G
      ..#.
      S...
    `)
    const result = connect(grid, goal, spawns)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.grid).toBe(grid)
    expect(result.value.goal).toBe(goal)
    expect(spawns.map((s) => distanceTo(result.value.field, s))).toEqual([7, 5])
  })

  it('rejects with the disconnected sources, in the order given', () => {
    const { grid, goal, spawns, at } = parseMap(`
      S#.S
      ##G.
      #...
      S#..
    `)
    // Spawns in reading order: (0,0) isolated, (3,0) connected, (0,3) isolated.
    const result = connect(grid, goal, [...spawns].reverse())

    expect(result).toEqual({
      ok: false,
      error: { kind: 'disconnected', cells: [at(0, 3), at(0, 0)] },
    })
  })

  it('rejects a source that is a wall', () => {
    const { grid, goal, at } = parseMap(`
      .#G
      ...
    `)
    const result = connect(grid, goal, [at(1, 0)])
    expect(result).toEqual({ ok: false, error: { kind: 'disconnected', cells: [at(1, 0)] } })
  })

  it('accepts when there are no sources', () => {
    const { grid, goal } = parseMap(`
      #G
    `)
    expect(connect(grid, goal, []).ok).toBe(true)
  })
})
