# Maze TD — guía para Claude

Tower Defense en el navegador donde los enemigos recalculan la ruta más corta sobre una grilla que cambia con cada torre. Proyecto universitario de grafos (Matemáticas para Informática II, ITM). El estado final al que aspiramos (experiencia, modelo de grafo, algoritmos, guion y preguntas de la exposición) está en `docs/TARGET.md`.

**Documentación:** vive en `docs/`. Si cambia el alcance o una decisión de producto, actualiza `docs/TARGET.md`. Las convenciones de trabajo y las decisiones técnicas van en este archivo.

## Contexto y fechas

- **Fecha límite de código:** 21/10/2026, 7:30 p.m. La exposición es a las 8:00 p.m., **virtual, compartiendo pantalla**, y dura ~6 min.
- El usuario trabaja **solo**.
- Objetivos, en orden: (1) **entender y poder defender** cada algoritmo de grafos en la exposición; (2) que el proyecto quede **presentable como portafolio** (código limpio, README, repo en GitHub).
- El usuario domina TypeScript y conoce Vite. **Three.js es nuevo para él:** explica los conceptos de Three.js la primera vez que aparezcan.

## Cómo trabajamos (reglas para Claude)

### Núcleo de grafos (`src/graph/`): el usuario escribe, Claude guía
- **Claude no escribe la implementación** de `Grid`, BFS/flow field, conectividad ni Dijkstra, salvo que el usuario lo pida explícitamente.
- Claude sí: define tipos y firmas, escribe **primero los tests de Vitest**, da **pistas graduadas** (primero la idea, luego el pseudocódigo y solo después un fragmento de código), revisa el código del usuario y señala bugs o casos borde.
- Al cerrar cada algoritmo, Claude hace 2–3 **preguntas tipo exposición** (complejidad, por qué este algoritmo y no otro, casos borde) para comprobar que el usuario lo entiende.
- Las pruebas de `src/graph/` cubren el código del usuario; sus tests no se modifican para que pasen.

### Render, UI y bucle de juego: los implementa Claude
- Three.js, raycasting, `InstancedMesh`, HUD, input, oleadas, etc. Claude escribe código legible y explica brevemente las decisiones.

### Comunicación
- **Chat en español**, explicando el *porqué* en términos de grafos (nodos, aristas, pesos, complejidad). Esto sirve para preparar la exposición.
- **Código en inglés:** identificadores, comentarios, nombres de archivo y mensajes de commit.
- Si una decisión de diseño no está aquí ni en `docs/TARGET.md`, recomienda una opción y sigue; pregunta solo si cambia el alcance o el plan.

### Memoria (engram)
- Usa engram para que no se pierdan las conclusiones de las conversaciones que no entran al repo, o que entran pero en archivos lejanos a este (razones de decisiones, alternativas descartadas, bugs y su solución, particularidades de Three.js o del entorno, estado al cerrar la sesión).
- Al inicio de una sesión, revisa en engram el contexto reciente del proyecto. Al cerrar un bloque o una sesión, guarda un resumen.
- No dupliques lo que ya dice este archivo: si una decisión es estable, va aquí, y en engram queda su contexto.

### Git
- Claude prepara un commit al cerrar cada bloque del plan (y en subpasos estables si el bloque es largo), pero **nunca commitea sin la revisión del usuario**:
  1. Al terminar, Claude resume qué cambió y en qué archivos, y propone el mensaje de commit.
  2. El usuario revisa el código.
  3. Claude hace el commit solo después de que el usuario confirme que lo revisó. Si pide cambios, se aplican y se vuelve al paso 1.
- Usa Conventional Commits en inglés (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`).
- **Sin atribución a Claude:** nada de `Co-Authored-By`, ni "Generated with Claude Code" ni nada parecido en commits, PRs o README.
- Crear el repositorio remoto en GitHub o hacer el primer push requiere confirmación del usuario.

## Stack y entorno

- El usuario desarrolla en **dos máquinas: Windows y CachyOS (Linux)**. Todo lo del repo (scripts, rutas, configuración) debe funcionar en ambas: nada de comandos o rutas propios de un sistema operativo en el código ni en los scripts de `package.json`.
- **mise** gestiona las herramientas (`mise.toml` en la raíz): Node 24 y pnpm 12. Si `pnpm` o `node` no aparecen en la shell, usa `mise exec -- <cmd>`.
- **pnpm** (nunca npm ni yarn), **Vite** (plantilla vanilla-ts, sin framework de UI), **TypeScript strict**, **Three.js**, **Vitest**, **Biome** (lint + formato).
- Usa versiones actuales de todo; no fijes versiones viejas sin motivo.
- Finales de línea LF en todo el repo (`.gitattributes`).
- **Solo en Windows:** la shell de Claude es PowerShell 5.1, donde no existen `&&` ni `||`; encadena con `;` o con `if ($?) { ... }`.

### Depuración en el navegador
- El MCP **chrome-devtools** (`.mcp.json`, paquete `chrome-devtools-mcp` en devDependencies) permite abrir el juego en Chrome y leer la consola, inspeccionar la red, medir rendimiento y tomar capturas.
- Úsalo cuando haga falta ver el juego corriendo: errores en runtime, problemas de render o FPS, o verificar un cambio visual. Levanta antes `pnpm dev`.

### Comandos
```
pnpm dev          # servidor de desarrollo
pnpm test         # vitest (watch); pnpm test --run para una sola pasada
pnpm check        # biome check --write + tsc --noEmit
pnpm build        # build de producción (dist/)
```
Antes de cada commit: `pnpm check` y `pnpm test --run` en verde.

## Arquitectura: arquitectura Elm (TEA) liviana

Todo el juego es un **reductor puro**. El navegador y Three.js son una cáscara delgada que traduce input en mensajes y dibuja el estado.

```
src/
  shared/   tipos base: Result, branded types, helpers (assertNever).
  graph/    TypeScript puro. NO importa three ni nada del DOM. Grid, flow field (BFS), conectividad, Dijkstra.
  game/     GameState, Msg, Event, update(). Puro, sin three ni DOM.
  render/   Three.js: sincroniza la escena con el GameState. Proyección, no decide nada.
  ui/       HUD y paneles en HTML/CSS; muestra el estado y reacciona a los Event.
  i18n/     textos es/en.
  config.ts tamaño de grilla, spawns, meta, velocidades, costos.
  main.ts   cáscara: input y requestAnimationFrame → Msg → update → render/ui.
```

```ts
type Msg =
  | { kind: 'place-tower'; cell: CellIndex }
  | { kind: 'sell-tower'; cell: CellIndex }
  | { kind: 'tick'; dt: number }
  | { kind: 'toggle-pause' }
  | { kind: 'toggle-debug' }
  | { kind: 'play-bfs' }

type Event =            // facts for the shell (UI, metrics); never commands
  | { kind: 'placement-rejected'; error: PlacementError }
  | { kind: 'enemy-reached-goal' }
  | { kind: 'wave-started'; wave: number }
  | { kind: 'game-over'; wave: number }
  | { kind: 'path-recomputed'; visited: number; ms: number }

function update(state: GameState, msg: Msg): [GameState, readonly Event[]]
```

- **Regla de capas:** `shared` ← `graph` ← `game` ← `render`/`ui` ← `main`. Las dependencias nunca van al revés.
- **Solo `main.ts` tiene estado mutable** (el `GameState` actual y la cola de mensajes). `render/` puede mutar objetos de Three.js, que es su trabajo, pero nunca el `GameState`.
- **El tiempo y el azar son datos:** el tiempo entra como `tick dt` y el azar viene de un generador pseudoaleatorio con semilla guardado en el `GameState`. Nada en `graph/` ni en `game/` llama a `Date.now()`, `performance.now()` ni `Math.random()`. Así una lista de `Msg` reproduce exactamente la misma partida.
- **Medir tiempos es cosa de la cáscara:** el `ms` de `path-recomputed` lo mide `main.ts` alrededor del recálculo y lo inyecta. El núcleo solo reporta conteos, como los nodos visitados.

### Principios de tipado e invariantes
- **Hacer irrepresentables los estados ilegales.** `GameState` solo guarda un `ConnectedGrid` (una grilla donde cada spawn llega a la meta). Ese tipo con marca solo se obtiene del mapa inicial validado o de `tryPlaceTower`; no hay casts a `ConnectedGrid` fuera de su constructor.
- **Branded types** para índices y valores con significado (`CellIndex`, etc.), creados solo con constructores que validan (`cellAt(grid, x, y): CellIndex | undefined`).
- **`Result<T, E>` en vez de excepciones** para fallos esperados (como rechazar una torre). Los errores son uniones discriminadas (`PlacementError`) y el `switch` sobre `kind` es exhaustivo con `assertNever`. Las excepciones se reservan para bugs.
- **`readonly` por defecto** en tipos del dominio (`readonly` en campos, `ReadonlyArray`, `ReadonlyMap`).
- **Puro por fuera, imperativo por dentro:** dentro de una función se permite mutar estructuras locales (cola del BFS, `Int32Array` de distancias), siempre que no se mute la entrada y no escape una referencia mutable. Los algoritmos clásicos se escriben de forma clásica.
- **Sin librerías funcionales** (fp-ts, Effect, Immer, etc.). Bastan TypeScript y unos pocos helpers en `shared/`.

### Grafo
- **Grilla implícita:** las celdas se indexan como `idx = y * width + x`, con arreglos planos (`Int32Array`/`Uint8Array`) para distancias, paredes y pesos. Los vecinos (4 direcciones) se calculan por índice; no hay listas de adyacencia.
- **`Grid` es un tipo opaco** con funciones de acceso, y se copia al escribir: colocar o vender una torre devuelve una grilla nueva. Como TypeScript no tiene typed arrays de solo lectura, nadie fuera de `graph/` toca los arreglos directamente.
- **Recalcular solo cuando cambia el grafo** (al colocar o vender una torre), nunca en cada `tick`.
- Los algoritmos se implementan desde cero, sin librerías de grafos.

### Pruebas
- `graph/`: tests de entrada y salida de cada algoritmo.
- `game/`: tests de reglas con la forma "dado este estado, `update(msg)` produce este estado y estos eventos", sin navegador ni Three.js.
- `render/`, `ui/` y `main.ts` no llevan tests unitarios; se prueban jugando.

## Decisiones de diseño tomadas

- **Mapa configurable** en `config.ts`: tamaño, **uno o varios spawns** y una meta. Un solo BFS desde la meta sirve a todos los spawns.
- **Colocar una torre se rechaza si:** la celda es spawn o meta, la ocupa un enemigo, o deja sin camino a la meta a algún spawn o a algún enemigo vivo. Cada caso es una variante de `PlacementError` y la UI muestra el motivo.
- **Demo reproducible:** se puede grabar una secuencia de `Msg` y reproducirla como respaldo guionizado para la exposición (bloque 9).
- Los enemigos se mueven hacia el **centro** de la siguiente celda e interpolan, para no atascarse en los bordes. Un enemigo es una arista en recorrido (`from`, `to`, `progress`) y ocupa ambas celdas; consulta el flow field solo al llegar a `to`, así que un recálculo lo desvía en el siguiente nodo. La conectividad se verifica desde el `to` de cada enemigo.
- El `dt` de cada `tick` se limita en `main.ts` (`MAX_DT`) para que una pestaña oculta no teletransporte enemigos.
- **Oleadas:** la fase del juego es una unión `Phase` (`break` con temporizador → `spawning` con enemigos por salir → `lost`). Una oleada termina, y empieza el descanso, solo cuando salieron todos sus enemigos **y** el mapa quedó vacío. Cada enemigo en la meta resta 1 de vida; con `phase = lost` el juego se congela (solo funciona el debug). Números en `config.ts`.
- **Pausa (P)** es un `Msg` (se puede construir en pausa). **Reiniciar (R)** es de la cáscara: `main.ts` reemplaza el estado con `createGame`; el reductor no guarda el mapa inicial.
- **Cámara en perspectiva casi cenital.** El raycast se hace contra el plano del suelo y se convierte a la celda.
- **Modo debug** (tecla para activarlo): heatmap de distancias + flechas del flow field. **El modo debug nunca se recorta.**
- **Animación del BFS (B):** se reproduce desde `distance` (nivel *k* = celdas con `distance ≤ k`, frontera = `distance === k`), sin instrumentar `graph/`. Vive en el `GameState` (`bfsReplay`) y avanza con `tick` aunque el juego esté en pausa o perdido; activa el debug y apagarlo la cancela.
- **Lodo y Dijkstra:** el lodo es fijo en `config.ts` (`mud`, `mudCost`); el jugador no lo coloca. El peso es el costo de **entrar** a la celda y también es tiempo: un enemigo cruza una arista en `cost(to) / enemySpeed` segundos, así que `distance` es el tiempo hasta la meta. `connect` usa siempre Dijkstra (sin lodo da lo mismo que BFS). `computeDijkstraField` devuelve el mismo `FlowField`, así que enemigos, debug y la animación (que con lodo avanza por costo) no cambian.
- **Panel de métricas:** en cada `path-recomputed`, `main.ts` corre BFS y Dijkstra sobre la grilla nueva, mide cada uno repitiéndolo durante ~4 ms (una corrida queda bajo la resolución del reloj) y calcula el costo de las rutas de los spawns con `routeCost`. Muestra nodos, µs y costo de ruta; el costo de BFS se marca en rojo si es peor. Los nodos visitados coinciden porque ambos calculan el campo completo.
- **Gameplay** en escalera, cada peldaño jugable: sandbox → vida de base + oleadas → torres con disparo instantáneo (sin proyectiles) → límite de torres o dinero.
- **i18n:** módulo propio pequeño y tipado (`t('key')`), español por defecto, con selector es/en. Migrar a LinguiJS queda como mejora para después de la exposición.
- **Deploy:** el proyecto se construye pensando en GitHub Pages (`base` configurable en Vite), pero es lo último. Si no hay tiempo, se presenta en local.
- Visual: cubos y colores planos. Fuera de alcance: modelos 3D, sonido, multijugador, guardado, A\*, benchmarks formales.

## Plan

| # | Bloque | Quién | Hecho cuando |
|---|---|---|---|
| 0 | Scaffolding: mise, Vite vanilla-ts, Vitest, Biome, git, README base; `shared/` (Result, brands) | Claude | `pnpm dev/test/check` funcionan |
| 1 | `Grid`, BFS flow field, conectividad (con tests). Claude define tipos y firmas | **Usuario** (Claude guía) | tests en verde |
| 2 | `game/` (GameState, Msg, `update`, `tryPlaceTower`) + render: grilla, cámara, raycaster, colocar/vender torres | Claude | se colocan torres con el mouse; tests de reglas en verde |
| 3 | Enemigos siguiendo el flow field en `tick`, recálculo al cambiar el grafo | Claude | cambian de ruta en vivo |
| 4 | Modo debug: heatmap + flechas | Claude | **proyecto presentable** |
| 5 | Vida de la base + oleadas simples | Claude | se puede perder |
| 6 | Animación del BFS por niveles (para la exposición) | Claude | se reproduce la expansión |
| 7 | Lodo + Dijkstra (Dijkstra lo escribe el **usuario**) + panel de métricas BFS vs Dijkstra | Usuario + Claude | pesos funcionando |
| 8 | Torres que disparan + límite de torres o dinero | Claude | se siente juego |
| 9 | Grabar y reproducir `Msg` (demo guionizada), deploy, video de respaldo, ensayo | Ambos | exposición lista |

- **Meta:** terminar los bloques 0–4 el 20/10.
- **Congelar features el 21/10 a las ~5:00 p.m.** Después solo se corrigen bugs, se graba el video de respaldo y se ensaya.
- Si algo se atrasa, se recortan los bloques 8 → 7 → 6 → 5, en ese orden. Nunca se recortan el bloque 4 ni la grabación de respaldo.
- Si la arquitectura Elm se complica en el render, se puede degradar a "núcleo funcional, cáscara imperativa" sin tocar `graph/`. Esa decisión la toma el usuario.

## Exposición

El guion y las preguntas probables están en `docs/TARGET.md`, secciones 7 y 8. Al implementar cada algoritmo, conéctalo con esas respuestas. Como la presentación es virtual, el juego debe leerse bien al compartir pantalla: alto contraste y textos grandes.
