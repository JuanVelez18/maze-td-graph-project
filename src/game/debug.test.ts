import { describe, expect, it } from 'vitest'
import { computeFlowField } from '../graph/flow-field'
import { parseMap, TEST_MUD_COST } from '../graph/test-map'
import { bfsReplayLevel, frontierSize, maxDistance, routeCost } from './debug'
import { createGameFromGrid } from './map'
import type { GameState } from './state'
import { testRules } from './test-rules'
import { update } from './update'

const RULES = testRules({ bfsLevelsPerSecond: 2 })

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

describe('routeCost', () => {
  it('adds the cost of every cell entered on the way to the goal', () => {
    // The game routes around the mud: 4 cells of cost 1.
    const { state, at } = setup(`
      S~G
      ...
    `)
    const { grid, field } = state.world
    expect(routeCost(grid, field, at(0, 0))).toBe(4)
    expect(routeCost(grid, field, at(2, 0))).toBe(0)
  })

  it('prices the route a BFS would take, through the mud', () => {
    const { state, at } = setup(`
      S~G
      ...
    `)
    const { grid, goal } = state.world
    expect(routeCost(grid, computeFlowField(grid, goal), at(0, 0))).toBe(TEST_MUD_COST + 1)
  })

  it('is undefined for a cell with no path', () => {
    const { state, at } = setup(`
      S...G
      ###..
      .#...
    `)
    const { grid, field } = state.world
    expect(routeCost(grid, field, at(0, 2))).toBeUndefined()
  })
})

describe('frontierSize', () => {
  it('counts the cells the BFS discovers at each level', () => {
    // Level 1: the open neighbors of G. The wall below it does not count.
    const { state } = setup(`
      S...G
      ...#.
    `)
    expect(frontierSize(state.world, 0)).toBe(1)
    expect(frontierSize(state.world, 1)).toBe(2)
    // Level 2 is only (2,0): (3,1) is a wall and (4,1) is a dead end.
    expect(frontierSize(state.world, 2)).toBe(1)
    expect(frontierSize(state.world, 99)).toBe(0)
  })
})

describe('BFS replay', () => {
  const MAP = `
    S....
    ....G
  `
  const play = (state: GameState) => update(state, { kind: 'play-bfs' })[0]
  const tick = (state: GameState, dt: number) => update(state, { kind: 'tick', dt })[0]

  it('turns debug on and starts at the goal', () => {
    const { state } = setup(MAP)
    const playing = play(state)

    expect(playing.debug).toBe(true)
    expect(bfsReplayLevel(playing)).toBe(0)
  })

  it('is off until it is played', () => {
    const { state } = setup(MAP)
    expect(bfsReplayLevel(state)).toBeUndefined()
  })

  it('advances one level every 1 / bfsLevelsPerSecond seconds', () => {
    const { state } = setup(MAP)
    const playing = play(state)

    expect(bfsReplayLevel(tick(playing, 0.4))).toBe(0)
    expect(bfsReplayLevel(tick(playing, 0.5))).toBe(1)
    expect(bfsReplayLevel(tick(tick(playing, 0.75), 0.75))).toBe(3)
  })

  it('runs while paused and after losing, so it can be shown with the game frozen', () => {
    const { state } = setup(MAP)
    const paused = play({ ...state, paused: true })
    const lost = play({ ...state, phase: { kind: 'lost' } })

    expect(bfsReplayLevel(tick(paused, 1))).toBe(2)
    expect(bfsReplayLevel(tick(lost, 1))).toBe(2)
    // The game itself stays frozen.
    expect(tick(paused, 1).enemies).toEqual(paused.enemies)
  })

  it('ends after the farthest level and leaves the debug view on', () => {
    // maxDistance is 5, so the last level is shown from 2.5 s to 3 s.
    const { state } = setup(MAP)
    const playing = play(state)

    expect(bfsReplayLevel(tick(playing, 2.9))).toBe(5)
    const done = tick(playing, 3)
    expect(bfsReplayLevel(done)).toBeUndefined()
    expect(done.debug).toBe(true)
  })

  it('stops when debug is turned off', () => {
    const { state } = setup(MAP)
    const [off] = update(play(state), { kind: 'toggle-debug' })

    expect(off.debug).toBe(false)
    expect(bfsReplayLevel(off)).toBeUndefined()
  })

  it('starts over when played again', () => {
    const { state } = setup(MAP)
    const again = play(tick(play(state), 2))

    expect(bfsReplayLevel(again)).toBe(0)
  })
})
