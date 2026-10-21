import type { ConnectedGrid } from '../graph/connectivity'
import { distanceTo } from '../graph/flow-field'
import { cellAt } from '../graph/grid'

/**
 * Largest distance from the goal to any cell it reaches: the eccentricity of the goal node.
 * The debug heatmap divides by it so the farthest cell always gets the last color.
 */
export function maxDistance(world: ConnectedGrid): number {
  const { grid, field } = world
  let max = 0
  for (let y = 0; y < grid.height; y++)
    for (let x = 0; x < grid.width; x++) {
      const cell = cellAt(grid, x, y)
      const distance = cell === undefined ? undefined : distanceTo(field, cell)
      if (distance !== undefined && distance > max) max = distance
    }
  return max
}
