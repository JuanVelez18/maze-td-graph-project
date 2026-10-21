const es = {
  'help.controls': 'Clic izq.: torre · Clic der.: vender · D: debug',
  'error.is-spawn': 'No se puede construir sobre un spawn',
  'error.is-goal': 'No se puede construir sobre la meta',
  'error.occupied': 'Ya hay una torre en esa celda',
  'error.enemy-on-cell': 'Hay un enemigo en esa celda',
  'error.blocks-path': 'Bloquearía el camino a la meta',
  'metrics.bfs': 'BFS: {visited} nodos · {ms} ms',
}

export type Key = keyof typeof es
export type Locale = 'es' | 'en'

const en: Record<Key, string> = {
  'help.controls': 'Left click: tower · Right click: sell · D: debug',
  'error.is-spawn': 'Cannot build on a spawn',
  'error.is-goal': 'Cannot build on the goal',
  'error.occupied': 'There is already a tower there',
  'error.enemy-on-cell': 'An enemy is on that cell',
  'error.blocks-path': 'It would block the path to the goal',
  'metrics.bfs': 'BFS: {visited} nodes · {ms} ms',
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
