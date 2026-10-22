import './style.css'
import { mapGenConfig, rules } from './config'
import { routeCost } from './game/debug'
import { createGame } from './game/map'
import { generateMap } from './game/map-gen'
import type { GameState, Msg } from './game/state'
import { update } from './game/update'
import type { ConnectedGrid } from './graph/connectivity'
import { computeDijkstraField } from './graph/dijkstra'
import { computeFlowField, type FlowField } from './graph/flow-field'
import type { CellIndex, Grid } from './graph/grid'
import { createScene } from './render/scene'
import { createHud, type PathMetrics, type SearchMetrics, type ShellEvent } from './ui/hud'

// Shell: the only mutable state lives here. Input becomes `Msg`, `update` decides, and the
// scene and HUD only display the result.
const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Missing #app element')

/** Longest step the game clock takes, so a frame after a hidden tab does not teleport enemies. */
const MAX_DT = 0.1

/** A map seed from `?seed=N`, so a demo always gets the same map. */
const urlSeed = Number.parseInt(new URLSearchParams(window.location.search).get('seed') ?? '', 10)

/**
 * The seed of the next map. Picking it is the only random choice in the game, and it happens
 * here in the shell: the core turns the seed into a map deterministically.
 */
function pickSeed(): number {
  return Number.isNaN(urlSeed) ? Math.floor(Math.random() * 2 ** 32) : urlSeed
}

let seed = pickSeed()
let state: GameState = createGame(generateMap(mapGenConfig, seed), rules)
let hover: CellIndex | undefined
const queue: Msg[] = []

const scene = createScene(app, state)
const hud = createHud(app)
hud.showSeed(seed)

const canvas = app.querySelector('canvas')
if (!canvas) throw new Error('Scene did not create a canvas')

canvas.addEventListener('pointermove', (e) => {
  hover = scene.cellAtPointer(e.clientX, e.clientY)
})
canvas.addEventListener('pointerleave', () => {
  hover = undefined
})
canvas.addEventListener('pointerdown', (e) => {
  const cell = scene.cellAtPointer(e.clientX, e.clientY)
  if (cell === undefined) return
  if (e.button === 0) queue.push({ kind: 'place-tower', cell })
  else if (e.button === 2) queue.push({ kind: 'sell-tower', cell })
})
canvas.addEventListener('contextmenu', (e) => e.preventDefault())
window.addEventListener('keydown', (e) => {
  if (e.repeat) return
  const key = e.key.toLowerCase()
  if (key === 'd') queue.push({ kind: 'toggle-debug' })
  else if (key === 'b') queue.push({ kind: 'play-bfs' })
  else if (key === 'p') queue.push({ kind: 'toggle-pause' })
  else if (key === 'r') restart()
})
window.addEventListener('resize', () => scene.resize())

/**
 * Starts a new game on a new map (the same one with `?seed=`). Only the shell holds mutable
 * state, so restarting is replacing it; the scene follows because it syncs by reference to
 * `state.world`.
 */
function restart() {
  queue.length = 0
  seed = pickSeed()
  state = createGame(generateMap(mapGenConfig, seed), rules)
  hud.showSeed(seed)
  showMetrics()
}

/** Fills the metrics panel for the current grid, before any tower changes it. */
function showMetrics() {
  hud.handle({ kind: 'path-recomputed', metrics: measure(state.world, state.map.spawns) })
}

/** Runs one message through the reducer; a recompute event gains the measured metrics. */
function dispatch(msg: Msg): readonly ShellEvent[] {
  const [next, events] = update(state, msg)
  state = next
  return events.map((event) =>
    event.kind === 'path-recomputed'
      ? { kind: 'path-recomputed', metrics: measure(state.world, state.map.spawns) }
      : event,
  )
}

/**
 * Times BFS and Dijkstra on the same grid and prices the routes each one gives the spawns.
 * The game itself only uses Dijkstra; the BFS runs here just for the comparison.
 */
function measure(world: ConnectedGrid, spawns: readonly CellIndex[]): PathMetrics {
  const { grid, goal } = world
  const search = (compute: (grid: Grid, goal: CellIndex) => FlowField): SearchMetrics => {
    const field = compute(grid, goal)
    return {
      visited: field.visited,
      ms: timePerRun(() => compute(grid, goal)),
      // Every spawn reaches the goal in a connected grid, with either search.
      routeCost: spawns.reduce((sum, spawn) => sum + (routeCost(grid, field, spawn) ?? 0), 0),
    }
  }
  return { bfs: search(computeFlowField), dijkstra: search(computeDijkstraField) }
}

/** Shortest time worth measuring: one run takes microseconds, below the timer's resolution. */
const MEASURE_MS = 4

/** Average time of `run`, repeating it until `MEASURE_MS` have passed. */
function timePerRun(run: () => void): number {
  const start = performance.now()
  let runs = 0
  let elapsed = 0
  do {
    run()
    runs++
    elapsed = performance.now() - start
  } while (elapsed < MEASURE_MS)
  return elapsed / runs
}

showMetrics()
let last = performance.now()
function frame(now: number) {
  queue.push({ kind: 'tick', dt: Math.min((now - last) / 1000, MAX_DT) })
  last = now
  for (const msg of queue.splice(0)) for (const event of dispatch(msg)) hud.handle(event)
  scene.render(state, hover)
  hud.render(state)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
