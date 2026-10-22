import { describe, expect, it } from 'vitest'
import { type MapGenConfig, mapGenConfig } from '../config'
import { createGame } from './map'
import { generateMap } from './map-gen'
import { testRules } from './test-rules'

const GEN: MapGenConfig = mapGenConfig
const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 1)

describe('generateMap', () => {
  it('builds the same map for the same seed', () => {
    expect(generateMap(GEN, 42)).toEqual(generateMap(GEN, 42))
  })

  it('builds different maps for different seeds', () => {
    const maps = new Set(SEEDS.slice(0, 20).map((seed) => JSON.stringify(generateMap(GEN, seed))))
    expect(maps.size).toBeGreaterThan(1)
  })

  it('places the spawns on distinct rows of the left edge, spawnGap apart', () => {
    for (const seed of SEEDS) {
      const { spawns } = generateMap(GEN, seed)
      expect(spawns).toHaveLength(GEN.spawnCount)
      for (const spawn of spawns) {
        expect(spawn.x).toBe(0)
        expect(spawn.y).toBeGreaterThanOrEqual(0)
        expect(spawn.y).toBeLessThan(GEN.height)
      }
      const rows = spawns.map(({ y }) => y)
      rows.slice(1).forEach((row, i) => {
        expect(row - (rows[i] ?? 0)).toBeGreaterThanOrEqual(GEN.spawnGap)
      })
    }
  })

  it('keeps the mud inside the middle columns, off the spawns and the goal', () => {
    for (const seed of SEEDS) {
      const { mud } = generateMap(GEN, seed)
      expect(mud.length).toBeGreaterThan(0)
      for (const { x, y } of mud) {
        expect(x).toBeGreaterThanOrEqual(GEN.mudMargin)
        expect(x).toBeLessThanOrEqual(GEN.width - 1 - GEN.mudMargin)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThan(GEN.height)
      }
    }
  })

  it('lists each mud cell once, even where patches overlap', () => {
    for (const seed of SEEDS) {
      const keys = generateMap(GEN, seed).mud.map(({ x, y }) => `${x},${y}`)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('always gives a playable map', () => {
    for (const seed of SEEDS)
      expect(() => createGame(generateMap(GEN, seed), testRules())).not.toThrow()
  })

  it('throws when the spawns cannot fit spawnGap apart', () => {
    expect(() => generateMap({ ...GEN, height: 4, spawnCount: 3 }, 1)).toThrow()
  })
})
