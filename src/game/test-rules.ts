import type { GameRules } from '../config'

/**
 * Rules for tests: the first wave starts at once and never runs out, the base never falls,
 * money never runs out and towers do not shoot, so tests about movement or towers are not
 * disturbed by waves or combat. Override what a test needs.
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
    startMoney: 1_000_000,
    towerCost: 10,
    killReward: 1,
    towerRange: 2,
    towerDps: 0,
    enemyHp: 1,
    enemyHpGrowth: 0,
    ...overrides,
  }
}
