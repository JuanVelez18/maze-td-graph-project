import { type FlowField, UNREACHABLE } from './flow-field'
import { type CellIndex, cost, type Grid, isWall, neighbors } from './grid'
import { MinHeap } from './min-heap'

/**
 * Dijkstra from `goal` over the open cells, for grids with costs (mud).
 *
 * Returns the same `FlowField` as the BFS, so enemies, connectivity and the debug view work
 * unchanged, but `distance` is the total cost of the cheapest path instead of a step count.
 * Entering a cell costs `cost(cell)`, so the graph is directed and the search runs on the
 * reversed graph: reaching neighbor `v` from `u` adds `cost(u)`, which is what an enemy on
 * `v` pays to step into `u`.
 *
 * `visited` counts settled nodes: entries taken out of the heap that were not stale.
 * If `goal` is a wall, nothing is reachable.
 */
export function computeDijkstraField(grid: Grid, goal: CellIndex): FlowField {
  const flowField = {
    distance: new Int32Array(grid.width * grid.height).fill(UNREACHABLE),
    next: new Int32Array(grid.width * grid.height).fill(UNREACHABLE),
    visited: 0,
  }
  if (isWall(grid, goal)) return flowField

  flowField.distance[goal] = 0

  const heap = new MinHeap<CellIndex>()
  heap.push(goal, 0)

  for (let entry = heap.pop(); entry !== undefined; entry = heap.pop()) {
    const { item: cell, priority } = entry
    // Lazy deletion: a cheaper path to `cell` was found after this entry was pushed.
    // Distances only go down, so an entry whose priority is above the current distance is stale.
    if (priority > (flowField.distance[cell] ?? UNREACHABLE)) continue

    flowField.visited++

    // An enemy on `neighbor` pays `cost(cell)` to step into `cell`.
    const throughCell = priority + cost(grid, cell)
    for (const neighbor of neighbors(grid, cell)) {
      const current = flowField.distance[neighbor] ?? UNREACHABLE
      if (current !== UNREACHABLE && current <= throughCell) continue

      flowField.distance[neighbor] = throughCell
      flowField.next[neighbor] = cell
      heap.push(neighbor, throughCell)
    }
  }

  return flowField
}
