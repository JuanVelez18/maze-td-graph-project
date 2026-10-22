import { describe, expect, it } from 'vitest'
import { createRng, randomInt } from './random'

const take = (seed: number, count: number) => {
  const rng = createRng(seed)
  return Array.from({ length: count }, rng)
}

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    expect(take(42, 10)).toEqual(take(42, 10))
  })

  it('gives different sequences for different seeds', () => {
    expect(take(1, 10)).not.toEqual(take(2, 10))
  })

  it('stays in [0, 1)', () => {
    for (const value of take(7, 1000)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('randomInt', () => {
  it('covers [min, max] with both ends included', () => {
    const rng = createRng(3)
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) seen.add(randomInt(rng, 2, 5))
    expect([...seen].sort()).toEqual([2, 3, 4, 5])
  })
})
