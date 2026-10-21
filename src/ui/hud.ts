import { maxDistance } from '../game/debug'
import type { Event, GameState, PlacementError } from '../game/state'
import type { ConnectedGrid } from '../graph/connectivity'
import { type Key, t } from '../i18n'
import { assertNever } from '../shared/assert'

/** A core event as the shell sees it: `path-recomputed` gains the time measured by `main.ts`. */
export type ShellEvent =
  | Exclude<Event, { kind: 'path-recomputed' }>
  | { readonly kind: 'path-recomputed'; readonly visited: number; readonly ms: number }

export type Hud = {
  readonly handle: (event: ShellEvent) => void
  /** Shows the parts of the HUD that follow the state (the debug legend). Cheap to call every frame. */
  readonly render: (state: GameState) => void
}

const TOAST_MS = 2000

export function createHud(container: HTMLElement): Hud {
  const root = element('div', 'hud')
  const help = element('div', 'hud-help')
  const metrics = element('div', 'hud-metrics')
  const toast = element('div', 'hud-toast')
  help.textContent = t('help.controls')

  // Debug legend: what the heatmap colors and the arrows mean.
  const legend = element('div', 'hud-debug')
  const legendTitle = element('div', 'hud-debug-title')
  const ramp = element('div', 'hud-debug-ramp')
  const scale = element('div', 'hud-debug-scale')
  const scaleMin = element('span', '')
  const scaleMax = element('span', '')
  const arrowsNote = element('div', 'hud-debug-note')
  legendTitle.textContent = t('debug.title')
  scaleMin.textContent = '0'
  arrowsNote.textContent = t('debug.arrows')
  scale.append(scaleMin, scaleMax)
  legend.append(legendTitle, ramp, scale, arrowsNote)
  legend.hidden = true

  root.append(help, metrics, legend, toast)
  container.append(root)

  let legendWorld: ConnectedGrid | undefined

  let toastTimer: ReturnType<typeof setTimeout> | undefined

  const showToast = (text: string) => {
    toast.textContent = text
    toast.classList.add('visible')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => toast.classList.remove('visible'), TOAST_MS)
  }

  return {
    handle(event) {
      switch (event.kind) {
        case 'placement-rejected':
          showToast(t(errorKey(event.error)))
          break
        case 'enemy-reached-goal':
          // Nothing to show until the base has life (block 5).
          break
        case 'path-recomputed':
          metrics.textContent = t('metrics.bfs', {
            visited: event.visited,
            ms: event.ms.toFixed(2),
          })
          break
        default:
          assertNever(event)
      }
    },
    render(state) {
      legend.hidden = !state.debug
      // The maximum only changes with the world, so the DOM is touched only then.
      if (!state.debug || state.world === legendWorld) return
      legendWorld = state.world
      scaleMax.textContent = t('debug.steps', { max: maxDistance(state.world) })
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
    case 'blocks-path':
      return 'error.blocks-path'
    default:
      return assertNever(error)
  }
}

function element(tag: 'div' | 'span', className: string): HTMLElement {
  const el = document.createElement(tag)
  el.className = className
  return el
}
