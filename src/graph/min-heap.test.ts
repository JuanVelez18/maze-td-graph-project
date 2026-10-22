import { describe, expect, it } from 'vitest'
import { type HeapEntry, MinHeap } from './min-heap'

/** Pops every entry, in order. */
function drain<T>(heap: MinHeap<T>): HeapEntry<T>[] {
  const entries: HeapEntry<T>[] = []
  for (let entry = heap.pop(); entry !== undefined; entry = heap.pop()) entries.push(entry)
  return entries
}

/** Deterministic pseudo-random priorities (linear congruential generator). */
function priorities(count: number, seed: number): number[] {
  const values: number[] = []
  let state = seed
  for (let i = 0; i < count; i++) {
    state = (state * 1103515245 + 12345) % 2 ** 31
    values.push(state % 100)
  }
  return values
}

describe('MinHeap', () => {
  it('starts empty', () => {
    const heap = new MinHeap<string>()
    expect(heap.size).toBe(0)
    expect(heap.pop()).toBeUndefined()
  })

  it('returns the item together with its priority', () => {
    const heap = new MinHeap<string>()
    heap.push('a', 7)
    expect(heap.pop()).toEqual({ item: 'a', priority: 7 })
  })

  it('pops in ascending priority order', () => {
    const heap = new MinHeap<string>()
    heap.push('c', 3)
    heap.push('a', 1)
    heap.push('e', 5)
    heap.push('b', 2)
    heap.push('d', 4)
    expect(drain(heap).map((entry) => entry.item)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('tracks the size through pushes and pops', () => {
    const heap = new MinHeap<number>()
    heap.push(1, 1)
    heap.push(2, 2)
    expect(heap.size).toBe(2)
    heap.pop()
    expect(heap.size).toBe(1)
    heap.pop()
    expect(heap.size).toBe(0)
    expect(heap.pop()).toBeUndefined()
    expect(heap.size).toBe(0)
  })

  it('keeps every entry with a repeated priority', () => {
    const heap = new MinHeap<string>()
    heap.push('x', 4)
    heap.push('y', 4)
    heap.push('z', 4)
    const items = drain(heap).map((entry) => entry.item)
    expect(items.sort()).toEqual(['x', 'y', 'z'])
  })

  it('keeps both copies of an item pushed twice (lazy deletion)', () => {
    // Dijkstra found node 7 at cost 9, then a cheaper path at cost 4.
    const heap = new MinHeap<number>()
    heap.push(7, 9)
    heap.push(7, 4)
    expect(drain(heap)).toEqual([
      { item: 7, priority: 4 },
      { item: 7, priority: 9 },
    ])
  })

  it('stays ordered when pushes and pops are interleaved', () => {
    const heap = new MinHeap<string>()
    heap.push('m', 5)
    heap.push('k', 3)
    expect(heap.pop()?.item).toBe('k')
    heap.push('a', 1)
    heap.push('z', 9)
    expect(heap.pop()?.item).toBe('a')
    heap.push('n', 6)
    expect(drain(heap).map((entry) => entry.item)).toEqual(['m', 'n', 'z'])
  })

  it('sorts a large input (heap sort)', () => {
    const heap = new MinHeap<number>()
    const values = priorities(1000, 42)
    values.forEach((priority, i) => {
      heap.push(i, priority)
    })

    const popped = drain(heap).map((entry) => entry.priority)
    expect(popped).toEqual([...values].sort((a, b) => a - b))
  })
})
