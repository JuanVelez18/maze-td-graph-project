import { describe, expect, it } from 'vitest'
import { computeDijkstraField } from './dijkstra'
import { computeFlowField, distanceTo, nextStep } from './flow-field'
import { type CellIndex, cost, type Grid, neighbors, setWall } from './grid'
import { parseMap, TEST_MUD_COST } from './test-map'

/**
 * Checks the two conditions that together mean "every distance is the cheapest one":
 * - Consistency: each reachable cell (except the goal) points to a neighbor `next` with
 *   `distance(cell) = cost(next) + distance(next)`, so the distance is the cost of a real path.
 * - Optimality (Bellman): no neighbor offers a cheaper way, `distance(cell) <= cost(n) + distance(n)`.
 */
function expectOptimalField(grid: Grid, goal: CellIndex) {
  const field = computeDijkstraField(grid, goal)
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
    expect(distance).toBe(cost(grid, next) + (distanceTo(field, next) ?? Number.NaN))

    for (const neighbor of neighbors(grid, cell)) {
      const through = distanceTo(field, neighbor)
      if (through !== undefined)
        expect(distance).toBeLessThanOrEqual(cost(grid, neighbor) + through)
    }
  }
}

const MAZE = `
  S..~#....
  .##.#.##.
  .#~.#..#.
  .#.###~#.
  ..~#G..#.
  .#..~~.#.
`

describe('computeDijkstraField', () => {
  it('gives the goal distance 0 and no next step', () => {
    const { grid, goal } = parseMap(`
      .~.
      .G.
    `)
    const field = computeDijkstraField(grid, goal)
    expect(distanceTo(field, goal)).toBe(0)
    expect(nextStep(field, goal)).toBeUndefined()
  })

  it('gives the same distances as the BFS when there is no mud', () => {
    const { grid, goal } = parseMap(`
      S...#....
      .##.#.##.
      .#..#..#.
      .#.###.#.
      ...#G..#.
      .#.....#.
    `)
    const bfs = computeFlowField(grid, goal)
    const dijkstra = computeDijkstraField(grid, goal)
    expect(Array.from(dijkstra.distance)).toEqual(Array.from(bfs.distance))
    expect(dijkstra.visited).toBe(bfs.visited)
  })

  it('charges the cost of the cell being entered, not the one being left', () => {
    const { grid, at } = parseMap(`
      .~G
    `)
    const field = computeDijkstraField(grid, at(2, 0))
    // Leaving the mud is free: the enemy on it only pays to enter the goal.
    expect(distanceTo(field, at(1, 0))).toBe(1)
    // Entering the mud costs TEST_MUD_COST, then 1 more to enter the goal.
    expect(distanceTo(field, at(0, 0))).toBe(TEST_MUD_COST + 1)
  })

  it('goes around mud when the detour is cheaper (BFS would cross it)', () => {
    const { grid, goal, spawns, at } = parseMap(`
      S~G
      ...
    `)
    const spawn = spawns[0] as CellIndex
    const field = computeDijkstraField(grid, goal)
    // Detour: 4 cells of cost 1. Through the mud: 5 + 1 = 6.
    expect(distanceTo(field, spawn)).toBe(4)
    expect(nextStep(field, spawn)).toBe(at(0, 1))
    // The BFS only counts steps, so it takes the mud.
    expect(nextStep(computeFlowField(grid, goal), spawn)).toBe(at(1, 0))
  })

  it('crosses mud when the detour is more expensive', () => {
    const { grid, goal, spawns, at } = parseMap(`
      S~G
      .#.
      .#.
      ...
    `)
    const spawn = spawns[0] as CellIndex
    const field = computeDijkstraField(grid, goal)
    // Through the mud: 5 + 1 = 6. Detour: 8.
    expect(distanceTo(field, spawn)).toBe(TEST_MUD_COST + 1)
    expect(nextStep(field, spawn)).toBe(at(1, 0))
  })

  it('leaves walls and enclosed cells unreachable and does not visit them', () => {
    const { grid, goal, at } = parseMap(`
      .#G
      #~.
      ...
    `)
    const field = computeDijkstraField(grid, goal)
    expect(distanceTo(field, at(1, 0))).toBeUndefined()
    expect(distanceTo(field, at(0, 0))).toBeUndefined()
    expect(nextStep(field, at(0, 0))).toBeUndefined()
    // 9 cells - 2 walls - 1 enclosed cell
    expect(field.visited).toBe(6)
  })

  it('reaches nothing when the goal is a wall', () => {
    const { grid, goal, at } = parseMap(`
      ~.
      .G
    `)
    const field = computeDijkstraField(setWall(grid, goal, true), goal)
    expect(distanceTo(field, at(0, 0))).toBeUndefined()
    expect(field.visited).toBe(0)
  })

  it('settles each reachable cell once, even when it is pushed several times', () => {
    // Many equal-cost paths and mud make cells get pushed again with better costs.
    const { grid, goal } = parseMap(MAZE)
    const field = computeDijkstraField(grid, goal)
    const reachable = Array.from(field.distance).filter((distance) => distance >= 0).length
    expect(field.visited).toBe(reachable)
  })

  it('finds the cheapest distance for every cell of a maze with mud', () => {
    const { grid, goal } = parseMap(MAZE)
    expectOptimalField(grid, goal)
  })

  it('following next steps from a spawn costs exactly its distance', () => {
    const { grid, goal, spawns } = parseMap(MAZE)
    const field = computeDijkstraField(grid, goal)
    let cell = spawns[0] as CellIndex
    const distance = distanceTo(field, cell)
    expect(distance).toBeDefined()
    let paid = 0
    for (let next = nextStep(field, cell); next !== undefined; next = nextStep(field, cell)) {
      paid += cost(grid, next)
      cell = next
    }
    expect(cell).toBe(goal)
    expect(paid).toBe(distance)
  })
})
