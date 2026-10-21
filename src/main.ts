import './style.css'
import { mapConfig, rules } from './config'
import { createGame } from './game/map'
import type { GameState, Msg } from './game/state'
import { update } from './game/update'
import type { CellIndex } from './graph/grid'
import { createScene } from './render/scene'
import { createHud, type ShellEvent } from './ui/hud'

// Shell: the only mutable state lives here. Input becomes `Msg`, `update` decides, and the
// scene and HUD only display the result.
const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Missing #app element')

/** Longest step the game clock takes, so a frame after a hidden tab does not teleport enemies. */
const MAX_DT = 0.1

let state: GameState = createGame(mapConfig, rules)
let hover: CellIndex | undefined
const queue: Msg[] = []

const scene = createScene(app, state)
const hud = createHud(app)

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
 * Starts a new game. Only the shell holds mutable state, so restarting is replacing it; the
 * scene follows because it syncs by reference to `state.world`.
 */
function restart() {
  queue.length = 0
  state = createGame(mapConfig, rules)
}

/** Runs one message through the reducer, adding the measured time to recompute events. */
function dispatch(msg: Msg): readonly ShellEvent[] {
  const start = performance.now()
  const [next, events] = update(state, msg)
  const ms = performance.now() - start
  state = next
  return events.map((event) => (event.kind === 'path-recomputed' ? { ...event, ms } : event))
}

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
