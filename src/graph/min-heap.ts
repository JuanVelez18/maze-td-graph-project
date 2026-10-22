/** An item taken out of the heap, together with the priority it was pushed with. */
export type HeapEntry<T> = { readonly item: T; readonly priority: number }

/**
 * Binary min-heap: a complete binary tree stored in an array, where every parent has a
 * priority less than or equal to its children's. The minimum is always at index 0.
 *
 * For the node at index `i`: parent at `(i - 1) >> 1`, children at `2i + 1` and `2i + 2`.
 *
 * There is no decrease-key: Dijkstra pushes a node again when it finds a cheaper path and
 * skips stale entries when they come out ("lazy deletion"). That is why `pop` returns the
 * priority too, so the caller can tell a stale entry from a current one.
 *
 * Mutable on purpose: it only lives inside an algorithm and never escapes it.
 */
export class MinHeap<T> {
  readonly #entries: HeapEntry<T>[] = []

  /** Number of entries in the heap, stale ones included. */
  get size(): number {
    return this.#entries.length
  }

  /** Adds `item` with `priority`. O(log n). */
  push(item: T, priority: number): void {
    this.#entries.push({ item, priority })
    this.#siftUp(this.#entries.length - 1)
  }

  /** Removes and returns the entry with the lowest priority, or `undefined` if empty. O(log n). */
  pop(): HeapEntry<T> | undefined {
    const entries = this.#entries
    const top = entries[0]
    const last = entries.pop()
    // With a single entry, `top` and `last` are the same and the heap is now empty.
    if (top === undefined || last === undefined || entries.length === 0) return top

    // Fill the hole at the root with the last leaf, then push it down to its place.
    entries[0] = last
    this.#siftDown(0)
    return top
  }

  /** Moves the entry at `index` up while it is cheaper than its parent. */
  #siftUp(index: number): void {
    let i = index
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.#priority(parent) <= this.#priority(i)) return
      this.#swap(i, parent)
      i = parent
    }
  }

  /** Moves the entry at `index` down while a child is cheaper, always swapping with the cheaper child. */
  #siftDown(index: number): void {
    const n = this.#entries.length
    let i = index
    while (true) {
      const left = 2 * i + 1
      const right = left + 1
      let smallest = i
      if (left < n && this.#priority(left) < this.#priority(smallest)) smallest = left
      if (right < n && this.#priority(right) < this.#priority(smallest)) smallest = right
      if (smallest === i) return
      this.#swap(i, smallest)
      i = smallest
    }
  }

  #priority(index: number): number {
    const entry = this.#entries[index]
    if (entry === undefined) throw new Error(`Heap index ${index} out of range`)
    return entry.priority
  }

  #swap(a: number, b: number): void {
    const entries = this.#entries
    const entryA = entries[a]
    const entryB = entries[b]
    if (entryA === undefined || entryB === undefined) throw new Error('Heap index out of range')
    entries[a] = entryB
    entries[b] = entryA
  }
}
