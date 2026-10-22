const es = {
  'help.controls':
    'Clic izq.: torre · Clic der.: vender · D: debug · B: animar búsqueda · P: pausa · R: reiniciar',
  'status.life': '♥ {life}',
  'status.money': '$ {money} · torre $ {cost}',
  'status.wave': 'Oleada {wave}',
  'status.next': 'Siguiente oleada en {seconds} s',
  'wave.started': 'Oleada {wave}',
  'overlay.paused': 'Pausa',
  'overlay.lost': 'Perdiste en la oleada {wave}',
  'overlay.restart': 'R: reiniciar',
  'error.is-spawn': 'No se puede construir sobre un spawn',
  'error.is-goal': 'No se puede construir sobre la meta',
  'error.occupied': 'Ya hay una torre en esa celda',
  'error.enemy-on-cell': 'Hay un enemigo en esa celda',
  'error.no-money': 'No alcanza el dinero para otra torre',
  'error.blocks-path': 'Bloquearía el camino a la meta',
  'metrics.nodes': 'nodos',
  'metrics.time': 'tiempo',
  'metrics.route': 'costo ruta',
  'metrics.micros': '{us} µs',
  'debug.title': 'Modo debug · Dijkstra desde la meta',
  'debug.cost': 'costo {max}',
  'debug.arrows': 'Flecha = siguiente paso · marrón = lodo',
  'debug.replay': 'Costo {level} de {max} · nodos en la frontera: {frontier}',
}

export type Key = keyof typeof es
export type Locale = 'es' | 'en'

const en: Record<Key, string> = {
  'help.controls':
    'Left click: tower · Right click: sell · D: debug · B: play search · P: pause · R: restart',
  'status.life': '♥ {life}',
  'status.money': '$ {money} · tower $ {cost}',
  'status.wave': 'Wave {wave}',
  'status.next': 'Next wave in {seconds} s',
  'wave.started': 'Wave {wave}',
  'overlay.paused': 'Paused',
  'overlay.lost': 'You lost on wave {wave}',
  'overlay.restart': 'R: restart',
  'error.is-spawn': 'Cannot build on a spawn',
  'error.is-goal': 'Cannot build on the goal',
  'error.occupied': 'There is already a tower there',
  'error.enemy-on-cell': 'An enemy is on that cell',
  'error.no-money': 'Not enough money for another tower',
  'error.blocks-path': 'It would block the path to the goal',
  'metrics.nodes': 'nodes',
  'metrics.time': 'time',
  'metrics.route': 'route cost',
  'metrics.micros': '{us} µs',
  'debug.title': 'Debug mode · Dijkstra from the goal',
  'debug.cost': 'cost {max}',
  'debug.arrows': 'Arrow = next step · brown = mud',
  'debug.replay': 'Cost {level} of {max} · nodes in the frontier: {frontier}',
}

const dictionaries: Record<Locale, Record<Key, string>> = { es, en }

let locale: Locale = 'es'

export function setLocale(next: Locale): void {
  locale = next
}

/** Translates `key`, replacing each `{name}` with `params[name]`. */
export function t(key: Key, params: Readonly<Record<string, string | number>> = {}): string {
  return dictionaries[locale][key].replace(/\{(\w+)\}/g, (match, name: string) =>
    String(params[name] ?? match),
  )
}
