import { describe, expect, it } from 'vitest'
import { computeFlowField, distanceTo, nextStep } from './flow-field'
import { type CellIndex, cellAt, createGrid, type Grid, neighbors, setWall } from './grid'
import { parseMap } from './test-map'

/** Every reachable cell except the goal must point to a neighbor exactly one step closer. */
function expectValidField(grid: Grid, goal: CellIndex) {
  const field = computeFlowField(grid, goal)
  for (let i = 0; i < grid.width * grid.height; i++) {
    const cell = i as CellIndex
    const distance = distanceTo(field, cell)
    const next = nextStep(field, cell)
    if (distance === undefined || cell === goal) {
      expect(next).toBeUndefined()
      continue
    }
    expect(next).toBeDefined()
    if (next === undefined) continue
    expect(neighbors(grid, cell)).toContain(next)
    expect(distanceTo(field, next)).toBe(distance - 1)
  }
}

describe('computeFlowField', () => {
  it('gives the goal distance 0 and no next step', () => {
    const { grid, goal } = parseMap(`
      ...
      .G.
    `)
    const field = computeFlowField(grid, goal)
    expect(distanceTo(field, goal)).toBe(0)
    expect(nextStep(field, goal)).toBeUndefined()
  })

  it('matches the Manhattan distance on an open grid', () => {
    const grid = createGrid(5, 4)
    const goal = cellAt(grid, 1, 2)
    if (goal === undefined) throw new Error('unreachable')
    const field = computeFlowField(grid, goal)
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 5; x++) {
        const cell = cellAt(grid, x, y)
        if (cell === undefined) throw new Error('unreachable')
        expect(distanceTo(field, cell)).toBe(Math.abs(x - 1) + Math.abs(y - 2))
      }
    }
  })

  it('goes around walls', () => {
    const { grid, goal, spawns } = parseMap(`
      S.#G
      ..#.
      ....
    `)
    const field = computeFlowField(grid, goal)
    expect(distanceTo(field, spawns[0] as CellIndex)).toBe(7)
  })

  it('leaves walls and enclosed cells unreachable and does not visit them', () => {
    const { grid, goal, at } = parseMap(`
      .#G
      #..
      ...
    `)
    const field = computeFlowField(grid, goal)
    expect(distanceTo(field, at(1, 0))).toBeUndefined()
    expect(distanceTo(field, at(0, 0))).toBeUndefined()
    expect(nextStep(field, at(0, 0))).toBeUndefined()
    // 9 cells - 2 walls - 1 enclosed cell
    expect(field.visited).toBe(6)
  })

  it('reaches nothing when the goal is a wall', () => {
    const { grid, goal, at } = parseMap(`
      ..
      .G
    `)
    const field = computeFlowField(setWall(grid, goal, true), goal)
    expect(distanceTo(field, at(0, 0))).toBeUndefined()
    expect(field.visited).toBe(0)
  })

  it('points every reachable cell one step closer to the goal', () => {
    const { grid, goal } = parseMap(`
      S...#....
      .##.#.##.
      .#..#..#.
      .#.###.#.
      ...#G..#.
      .#.....#.
    `)
    expectValidField(grid, goal)
  })

  it('following next steps from a spawn arrives in exactly distance steps', () => {
    const { grid, goal, spawns } = parseMap(`
      S...#....
      .##.#.##.
      .#..#..#.
      .#.###.#.
      ...#G..#.
      .#.....#.
    `)
    const field = computeFlowField(grid, goal)
    let cell = spawns[0] as CellIndex
    const distance = distanceTo(field, cell)
    expect(distance).toBeDefined()
    let steps = 0
    for (let next = nextStep(field, cell); next !== undefined; next = nextStep(field, cell)) {
      cell = next
      steps++
    }
    expect(cell).toBe(goal)
    expect(steps).toBe(distance)
  })
})
