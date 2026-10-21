import { describe, expect, it } from 'vitest'
import { parseMap } from '../graph/test-map'
import { maxDistance } from './debug'
import { createGameFromGrid } from './map'
import { update } from './update'

const RULES = { enemySpeed: 1, spawnInterval: 1 }

function setup(text: string) {
  const { grid, goal, spawns, at } = parseMap(text)
  return { state: createGameFromGrid(grid, { spawns, goal }, RULES), at }
}

describe('maxDistance', () => {
  it('is the distance of the farthest reachable cell', () => {
    // The farthest cell is the spawn corner: 4 right + 1 down = 5 steps.
    const { state } = setup(`
      S....
      ....G
    `)
    expect(maxDistance(state.world)).toBe(5)
  })

  it('ignores walls and open cells walled off from the goal', () => {
    // (0,2) is open but enclosed. Farthest reachable: (0,0) and (2,2), both 4 steps away.
    const { state } = setup(`
      S...G
      ###..
      .#...
    `)
    expect(maxDistance(state.world)).toBe(4)
  })

  it('grows when towers make the path longer', () => {
    const { state, at } = setup(`
      S....
      .....
      ....G
    `)
    const [next] = update(state, { kind: 'place-tower', cell: at(1, 1) })
    const [after] = update(next, { kind: 'place-tower', cell: at(1, 2) })

    expect(maxDistance(state.world)).toBe(6)
    // (0,2) now goes up to (0,0) and around the towers: 4 steps to (2,0), then 4 more.
    expect(maxDistance(after.world)).toBe(8)
  })
})
