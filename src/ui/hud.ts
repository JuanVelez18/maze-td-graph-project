import { bfsReplayLevel, frontierSize, maxDistance } from '../game/debug'
import type { Event, GameState, PlacementError } from '../game/state'
import type { ConnectedGrid } from '../graph/connectivity'
import { type Key, t } from '../i18n'
import { assertNever } from '../shared/assert'

/** How one search did on the current grid, measured by `main.ts`. */
export type SearchMetrics = {
  readonly visited: number
  /** Average time of one full run, in milliseconds. */
  readonly ms: number
  /** Total cost of the routes its flow field gives the spawns. */
  readonly routeCost: number
}

/** BFS against Dijkstra on the same grid, for the metrics panel. */
export type PathMetrics = { readonly bfs: SearchMetrics; readonly dijkstra: SearchMetrics }

/** A core event as the shell sees it: `path-recomputed` carries the metrics `main.ts` measured. */
export type ShellEvent =
  | Exclude<Event, { kind: 'path-recomputed' }>
  | { readonly kind: 'path-recomputed'; readonly metrics: PathMetrics }

export type Hud = {
  readonly handle: (event: ShellEvent) => void
  /** Shows the parts of the HUD that follow the state. Cheap to call every frame. */
  readonly render: (state: GameState) => void
  /** Shows the seed of the current map, so a good one can be replayed with `?seed=`. */
  readonly showSeed: (seed: number) => void
}

const TOAST_MS = 2000

export function createHud(container: HTMLElement): Hud {
  const root = element('div', 'hud')
  const help = element('div', 'hud-help')
  const toast = element('div', 'hud-toast')
  help.textContent = t('help.controls')

  // Metrics: a small table, BFS against Dijkstra on the current grid.
  const metrics = element('div', 'hud-metrics')
  metrics.append(
    ...['', t('metrics.nodes'), t('metrics.time'), t('metrics.route')].map((text) =>
      cell(text, 'hud-metrics-head'),
    ),
  )
  const metricsRow = (name: string) => {
    const row = { visited: cell(''), time: cell(''), route: cell('') }
    metrics.append(cell(name, 'hud-metrics-name'), row.visited, row.time, row.route)
    return row
  }
  const bfsRow = metricsRow('BFS')
  const dijkstraRow = metricsRow('Dijkstra')
  const showMetrics = (row: ReturnType<typeof metricsRow>, search: SearchMetrics) => {
    row.visited.textContent = String(search.visited)
    row.time.textContent = t('metrics.micros', { us: Math.round(search.ms * 1000) })
    row.route.textContent = String(search.routeCost)
  }
  metrics.hidden = true

  // Base life, money and wave, under the controls.
  const status = element('div', 'hud-status')
  const life = element('span', 'hud-status-life')
  const money = element('span', 'hud-status-money')
  const wave = element('span', '')
  const seed = element('span', 'hud-status-seed')
  status.append(life, money, wave, seed)

  // Big centered message while paused or after losing.
  const overlay = element('div', 'hud-overlay')
  const overlayTitle = element('div', 'hud-overlay-title')
  const overlayHint = element('div', 'hud-overlay-hint')
  overlay.append(overlayTitle, overlayHint)

  // Debug legend: what the heatmap colors and the arrows mean.
  const legend = element('div', 'hud-debug')
  const legendTitle = element('div', 'hud-debug-title')
  const ramp = element('div', 'hud-debug-ramp')
  const scale = element('div', 'hud-debug-scale')
  const scaleMin = element('span', '')
  const scaleMax = element('span', '')
  const arrowsNote = element('div', 'hud-debug-note')
  // BFS replay progress: only while it plays.
  const replay = element('div', 'hud-debug-replay')
  legendTitle.textContent = t('debug.title')
  scaleMin.textContent = '0'
  arrowsNote.textContent = t('debug.arrows')
  scale.append(scaleMin, scaleMax)
  legend.append(legendTitle, ramp, scale, arrowsNote, replay)
  legend.hidden = true

  // The overlay goes first so the panels stay readable on top of it.
  root.append(overlay, help, status, metrics, legend, toast)
  container.append(root)

  let legendWorld: ConnectedGrid | undefined
  // `render` runs every frame; these remember what is on screen to touch the DOM only on change.
  const shown = new Map<HTMLElement, string>()
  const setText = (el: HTMLElement, text: string) => {
    if (shown.get(el) === text) return
    shown.set(el, text)
    el.textContent = text
  }

  let toastTimer: ReturnType<typeof setTimeout> | undefined

  const showToast = (text: string, tone: 'error' | 'info') => {
    toast.textContent = text
    toast.classList.toggle('info', tone === 'info')
    toast.classList.add('visible')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => toast.classList.remove('visible'), TOAST_MS)
  }

  return {
    handle(event) {
      switch (event.kind) {
        case 'placement-rejected':
          showToast(t(errorKey(event.error)), 'error')
          break
        case 'enemy-reached-goal':
          // Flash the life counter; the new value itself comes from `render`.
          flash(life, 'hit')
          break
        case 'enemy-killed':
          flash(money, 'gain')
          break
        case 'wave-started':
          showToast(t('wave.started', { wave: event.wave }), 'info')
          break
        case 'game-over':
          // The overlay follows `state.phase` in `render`.
          break
        case 'path-recomputed': {
          const { bfs, dijkstra } = event.metrics
          showMetrics(bfsRow, bfs)
          showMetrics(dijkstraRow, dijkstra)
          // On mud the BFS route costs more: mark it, that is the reason to use Dijkstra.
          bfsRow.route.classList.toggle('worse', bfs.routeCost > dijkstra.routeCost)
          metrics.hidden = false
          break
        }
        default:
          assertNever(event)
      }
    },
    render(state) {
      setText(life, t('status.life', { life: state.life }))
      setText(money, t('status.money', { money: state.money, cost: state.rules.towerCost }))
      setText(
        wave,
        state.phase.kind === 'break'
          ? t('status.next', { seconds: Math.ceil(state.phase.timer) })
          : t('status.wave', { wave: state.wave }),
      )

      const lost = state.phase.kind === 'lost'
      const level = bfsReplayLevel(state)
      // The BFS replay is usually shown paused; the overlay would cover the middle of the board.
      overlay.hidden = (!lost && !state.paused) || level !== undefined
      overlay.classList.toggle('lost', lost)
      setText(overlayTitle, lost ? t('overlay.lost', { wave: state.wave }) : t('overlay.paused'))
      setText(overlayHint, lost ? t('overlay.restart') : '')

      legend.hidden = !state.debug
      replay.hidden = level === undefined
      if (level !== undefined)
        setText(
          replay,
          t('debug.replay', {
            level,
            max: maxDistance(state.world),
            frontier: frontierSize(state.world, level),
          }),
        )
      // The maximum only changes with the world, so the DOM is touched only then.
      if (!state.debug || state.world === legendWorld) return
      legendWorld = state.world
      scaleMax.textContent = t('debug.cost', { max: maxDistance(state.world) })
    },
    showSeed(value) {
      seed.textContent = t('status.seed', { seed: value })
    },
  }
}

function errorKey(error: PlacementError): Key {
  switch (error.kind) {
    case 'is-spawn':
      return 'error.is-spawn'
    case 'is-goal':
      return 'error.is-goal'
    case 'occupied':
      return 'error.occupied'
    case 'enemy-on-cell':
      return 'error.enemy-on-cell'
    case 'no-money':
      return 'error.no-money'
    case 'blocks-path':
      return 'error.blocks-path'
    default:
      return assertNever(error)
  }
}

/** Replays the CSS animation of `className` on `el`, even if it is still running. */
function flash(el: HTMLElement, className: string): void {
  el.classList.remove(className)
  void el.offsetWidth // force a reflow so the animation restarts
  el.classList.add(className)
}

function element(tag: 'div' | 'span', className: string): HTMLElement {
  const el = document.createElement(tag)
  el.className = className
  return el
}

/** A cell of the metrics table. */
function cell(text: string, className = ''): HTMLElement {
  const el = element('span', className)
  el.textContent = text
  return el
}
