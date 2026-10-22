import type { GameRules } from '../config'
import { assertNever } from '../shared/assert'
import { spawnEnemy } from './enemies'
import type { Enemy, EnemyId, Event, GameState, Phase } from './state'

/** Enemies in wave number `wave` (1-based): each wave brings `waveGrowth` more than the last. */
export function waveSize(rules: GameRules, wave: number): number {
  return rules.firstWaveSize + (wave - 1) * rules.waveGrowth
}

/** Life of each enemy in wave number `wave` (1-based): `enemyHpGrowth` more than the last. */
export function enemyHp(rules: GameRules, wave: number): number {
  return rules.enemyHp + (wave - 1) * rules.enemyHpGrowth
}

/**
 * Moves the wave cycle forward by `dt` seconds: a break counts down until the next wave starts,
 * and a wave spawns its enemies one interval apart. A wave ends, and a break begins, once all
 * of its enemies have appeared and none is left on the board.
 */
export function advanceWaves(state: GameState, dt: number): [GameState, readonly Event[]] {
  const { phase } = state
  switch (phase.kind) {
    case 'break': {
      const timer = phase.timer - dt
      if (timer > 0) return [{ ...state, phase: { kind: 'break', timer } }, []]
      const wave = state.wave + 1
      // The first enemy of the wave appears right away.
      const started = spawnDue({ ...state, wave, spawnTimer: 0 }, waveSize(state.rules, wave), 0)
      return [started, [{ kind: 'wave-started', wave }]]
    }
    case 'spawning':
      return [spawnDue(state, phase.remaining, dt), []]
    case 'lost':
      return [state, []]
    default:
      return assertNever(phase)
  }
}

/** Spawns the enemies whose time has come, out of the `remaining` ones of the current wave. */
function spawnDue(state: GameState, remaining: number, dt: number): GameState {
  const { map, rules, world } = state
  const enemies: Enemy[] = [...state.enemies]
  let { spawnTimer, nextSpawn, nextEnemyId } = state
  const hp = enemyHp(rules, state.wave)
  if (remaining > 0) spawnTimer -= dt
  while (remaining > 0 && spawnTimer <= 0) {
    const spawn = map.spawns[nextSpawn]
    if (spawn === undefined) break
    enemies.push(spawnEnemy(world, spawn, nextEnemyId as EnemyId, hp))
    nextEnemyId++
    nextSpawn = (nextSpawn + 1) % map.spawns.length
    spawnTimer += rules.spawnInterval
    remaining--
  }

  const phase: Phase =
    remaining === 0 && enemies.length === 0
      ? { kind: 'break', timer: rules.waveBreak }
      : { kind: 'spawning', remaining }
  return { ...state, enemies, spawnTimer, nextSpawn, nextEnemyId, phase }
}
