import type { ConnectedGrid } from '../graph/connectivity'
import { assertNever } from '../shared/assert'
import type { Event, GameState, Msg } from './state'
import { tick } from './tick'
import { sellTower, tryPlaceTower } from './towers'

/** The whole game as a pure reducer: same state and message, same result. */
export function update(state: GameState, msg: Msg): [GameState, readonly Event[]] {
  // A lost game is frozen: the board can still be inspected (debug), but not changed.
  const lost = state.phase.kind === 'lost'
  switch (msg.kind) {
    case 'place-tower': {
      if (lost) return [state, []]
      const placed = tryPlaceTower(state, msg.cell)
      if (!placed.ok) return [state, [{ kind: 'placement-rejected', error: placed.error }]]
      return withWorld({ ...state, money: state.money - state.rules.towerCost }, placed.value)
    }
    case 'sell-tower': {
      if (lost) return [state, []]
      const sold = sellTower(state, msg.cell)
      if (sold === undefined) return [state, []]
      // Full refund: the money caps the towers on the board, so reshaping the maze is free.
      return withWorld({ ...state, money: state.money + state.rules.towerCost }, sold)
    }
    case 'tick':
      return tick(state, msg.dt)
    case 'toggle-pause':
      if (lost) return [state, []]
      return [{ ...state, paused: !state.paused }, []]
    case 'toggle-debug':
      // The replay draws over the debug view, so turning debug off also stops it.
      return [{ ...state, debug: !state.debug, bfsReplay: undefined }, []]
    case 'play-bfs':
      return [{ ...state, debug: true, bfsReplay: { elapsed: 0 } }, []]
    default:
      return assertNever(msg)
  }
}

function withWorld(state: GameState, world: ConnectedGrid): [GameState, readonly Event[]] {
  return [{ ...state, world }, [{ kind: 'path-recomputed', visited: world.field.visited }]]
}
