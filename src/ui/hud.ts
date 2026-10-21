import type { Event, PlacementError } from '../game/state'
import { type Key, t } from '../i18n'
import { assertNever } from '../shared/assert'

/** A core event as the shell sees it: `path-recomputed` gains the time measured by `main.ts`. */
export type ShellEvent =
  | Exclude<Event, { kind: 'path-recomputed' }>
  | { readonly kind: 'path-recomputed'; readonly visited: number; readonly ms: number }

export type Hud = { readonly handle: (event: ShellEvent) => void }

const TOAST_MS = 2000

export function createHud(container: HTMLElement): Hud {
  const root = element('div', 'hud')
  const help = element('div', 'hud-help')
  const metrics = element('div', 'hud-metrics')
  const toast = element('div', 'hud-toast')
  help.textContent = t('help.controls')
  root.append(help, metrics, toast)
  container.append(root)

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

function element(tag: 'div', className: string): HTMLElement {
  const el = document.createElement(tag)
  el.className = className
  return el
}
