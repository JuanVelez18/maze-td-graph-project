import { describe, expect, it } from 'vitest'
import { cellAt, cellCoords, createGrid, isWall, neighbors, setWall } from './grid'
import { parseMap } from './test-map'

describe('createGrid', () => {
  it('has the given size and every cell open', () => {
    const grid = createGrid(4, 3)
    expect(grid.width).toBe(4)
    expect(grid.height).toBe(3)
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 4; x++) {
        const cell = cellAt(grid, x, y)
        expect(cell).toBeDefined()
        if (cell !== undefined) expect(isWall(grid, cell)).toBe(false)
      }
    }
  })

  it.each([
    [0, 3],
    [3, 0],
    [-1, 3],
    [2.5, 3],
  ])('throws on invalid size %d x %d', (width, height) => {
    expect(() => createGrid(width, height)).toThrow()
  })
})

describe('cellAt', () => {
  const grid = createGrid(4, 3)

  it('uses the flat layout y * width + x', () => {
    expect(cellAt(grid, 0, 0)).toBe(0)
    expect(cellAt(grid, 3, 0)).toBe(3)
    expect(cellAt(grid, 0, 1)).toBe(4)
    expect(cellAt(grid, 3, 2)).toBe(11)
  })

  it.each([
    [-1, 0],
    [0, -1],
    [4, 0],
    [0, 3],
    [1.5, 0],
  ])('is undefined outside the grid: (%d, %d)', (x, y) => {
    expect(cellAt(grid, x, y)).toBeUndefined()
  })
})

describe('cellCoords', () => {
  it('is the inverse of cellAt', () => {
    const { grid, at } = parseMap(`
      ....
      ..G.
      ....
    `)
    expect(cellCoords(grid, at(2, 1))).toEqual({ x: 2, y: 1 })
    expect(cellCoords(grid, at(3, 2))).toEqual({ x: 3, y: 2 })
  })
})

describe('setWall', () => {
  it('returns a new grid and leaves the original untouched', () => {
    const grid = createGrid(3, 3)
    const cell = cellAt(grid, 1, 1)
    if (cell === undefined) throw new Error('unreachable')

    const walled = setWall(grid, cell, true)

    expect(walled).not.toBe(grid)
    expect(isWall(walled, cell)).toBe(true)
    expect(isWall(grid, cell)).toBe(false)
    expect(isWall(setWall(walled, cell, false), cell)).toBe(false)
  })
})

describe('neighbors', () => {
  const { grid, at } = parseMap(`
    ...
    .G#
    ...
  `)

  it('lists open neighbors in the order up, right, down, left', () => {
    expect(neighbors(grid, at(1, 2))).toEqual([at(1, 1), at(2, 2), at(0, 2)])
  })

  it('has 4 neighbors in the middle of an open area', () => {
    const open = createGrid(3, 3)
    const center = cellAt(open, 1, 1)
    if (center === undefined) throw new Error('unreachable')
    expect(neighbors(open, center)).toHaveLength(4)
  })

  it('has 2 neighbors in a corner', () => {
    expect(neighbors(grid, at(0, 0))).toEqual([at(1, 0), at(0, 1)])
  })

  it('skips walls', () => {
    expect(neighbors(grid, at(1, 1))).toEqual([at(1, 0), at(1, 2), at(0, 1)])
  })

  it('does not wrap around the row edge', () => {
    // (2, 0) and (0, 1) are consecutive indices (2 and 3) but not adjacent cells.
    expect(neighbors(grid, at(0, 1))).not.toContain(at(2, 0))
  })
})
