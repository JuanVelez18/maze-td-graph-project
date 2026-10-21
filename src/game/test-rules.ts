import type { GameRules } from '../config'

/**
 * Rules for tests: the first wave starts at once and never runs out, and the base never falls,
 * so tests about movement or towers are not disturbed by waves. Override what a test needs.
 */
export function testRules(overrides: Partial<GameRules> = {}): GameRules {
  return {
    enemySpeed: 1,
    spawnInterval: 1,
    baseLife: 1000,
    firstBreak: 0,
    waveBreak: 1,
    firstWaveSize: 1000,
    waveGrowth: 0,
    bfsLevelsPerSecond: 1,
    ...overrides,
  }
}
