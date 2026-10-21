import type { ConnectedGrid } from '../graph/connectivity'
import { assertNever } from '../shared/assert'
import { tick } from './enemies'
import type { Event, GameState, Msg } from './state'
import { sellTower, tryPlaceTower } from './towers'

/** The whole game as a pure reducer: same state and message, same result. */
export function update(state: GameState, msg: Msg): [GameState, readonly Event[]] {
  switch (msg.kind) {
    case 'place-tower': {
      const placed = tryPlaceTower(state, msg.cell)
      if (!placed.ok) return [state, [{ kind: 'placement-rejected', error: placed.error }]]
      return withWorld(state, placed.value)
    }
    case 'sell-tower': {
      const sold = sellTower(state, msg.cell)
      if (sold === undefined) return [state, []]
      return withWorld(state, sold)
    }
    case 'tick':
      return tick(state, msg.dt)
    case 'toggle-debug':
      return [{ ...state, debug: !state.debug }, []]
    default:
      return assertNever(msg)
  }
}

function withWorld(state: GameState, world: ConnectedGrid): [GameState, readonly Event[]] {
  return [{ ...state, world }, [{ kind: 'path-recomputed', visited: world.field.visited }]]
}
