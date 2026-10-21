import { advanceBfsReplay } from './debug'
import { moveEnemies } from './enemies'
import type { Event, GameState } from './state'
import { advanceWaves } from './waves'

/**
 * Advances the game clock by `dt` seconds: enemies walk, each one that reaches the goal takes
 * 1 life from the base, and then the wave cycle moves on. Nothing moves while paused or lost,
 * except the BFS replay, so it can be shown on a frozen board.
 */
export function tick(previous: GameState, dt: number): [GameState, readonly Event[]] {
  const state = advanceBfsReplay(previous, dt)
  if (state.paused || state.phase.kind === 'lost') return [state, []]

  const { enemies, arrived } = moveEnemies(state.world, state.enemies, state.rules.enemySpeed * dt)
  const events: Event[] = Array.from({ length: arrived }, () => ({ kind: 'enemy-reached-goal' }))
  const life = state.life - arrived

  if (life <= 0) {
    events.push({ kind: 'game-over', wave: state.wave })
    return [{ ...state, enemies, life: 0, phase: { kind: 'lost' } }, events]
  }

  const [next, waveEvents] = advanceWaves({ ...state, enemies, life }, dt)
  return [next, [...events, ...waveEvents]]
}
