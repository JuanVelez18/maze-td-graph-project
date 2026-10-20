# Maze TD: estado final al que aspiramos

Tower Defense en el navegador **sin camino fijo**: el jugador arma un laberinto con sus torres y los enemigos recalculan en tiempo real la ruta más corta hacia la meta. El juego es la excusa para un problema real de grafos: **mantener la ruta más corta de muchos agentes sobre un grafo que cambia con cada jugada.**

- **Exposición:** 21/10/2026, 8:00 p.m. Virtual, compartiendo pantalla, ~6 min.
- **Entregable:** juego funcionando en el navegador + explicación oral de los conceptos de grafos. No hay informe escrito.
- **Después de la exposición:** proyecto de portafolio en GitHub, con README y demo publicada.

## 1. La experiencia final

1. Se abre el juego: una grilla vista en perspectiva casi cenital, con uno o varios spawns y una meta, cubos y colores planos de alto contraste.
2. El jugador coloca torres con el mouse. Cada torre es una pared, y los enemigos que ya están en camino **cambian de ruta en vivo**.
3. Si el jugador intenta cerrar el último camino, el juego **rechaza la jugada** y dice por qué ("bloquearía el camino", "hay un enemigo en la celda", etc.).
4. Llegan oleadas de enemigos. Los que alcanzan la meta restan vida a la base, y si la vida llega a cero se pierde la partida.
5. Las torres disparan al enemigo más cercano dentro de su rango, y hay un límite de torres o de dinero, así que armar el laberinto es un puzzle.
6. Con una tecla se activa el **modo debug**, que muestra el grafo detrás del juego:
   - **Heatmap:** cada celda coloreada según su distancia a la meta.
   - **Flechas del flow field:** hacia dónde da el siguiente paso un enemigo en cada celda.
   - **Animación del BFS:** la expansión desde la meta, nivel por nivel.
7. Hay **celdas de lodo** que cuestan más de atravesar. Con ellas, el juego usa **Dijkstra** en vez de BFS, y un **panel de métricas** compara los dos algoritmos: nodos visitados y tiempo de recálculo.
8. La interfaz está en **español e inglés**.
9. Una **demo guionizada** reproduce una partida grabada, de forma exacta y determinista, como respaldo para la exposición.

## 2. Modelado como grafo

| Elemento | Representación |
|---|---|
| Nodo | Celda transitable de una grilla W×H (tamaño configurable) |
| Arista | Conexión entre celdas vecinas en 4 direcciones |
| Peso | Costo de **entrar** a una celda: 1 por defecto, mayor en lodo |
| Tipo de grafo | Sin lodo: no dirigido y no ponderado. Con lodo: como el peso es de la celda destino, `u→v` cuesta `w(v)` y `v→u` cuesta `w(u)`, así que el grafo es **dirigido y ponderado** |
| Cambio dinámico | Colocar una torre elimina un nodo (y sus aristas); venderla lo restaura |
| Memoria | Grilla implícita: `idx = y·W + x`, con vecinos calculados por índice, sin listas de adyacencia |

## 3. Algoritmos y conceptos

1. **BFS desde la meta (flow field).** Un solo recorrido calcula la distancia de cada celda a la meta y la dirección del siguiente paso. Todos los enemigos consultan ese campo. Cuesta O(V + E) por cada cambio del grafo, sin importar cuántos enemigos haya.
2. **Conectividad.** Antes de aceptar una torre se verifica que cada spawn **y cada enemigo vivo** sigan conectados con la meta. Sale del mismo BFS: una celda sin distancia asignada no tiene camino.
3. **Invariante en el tipo.** El estado del juego solo puede guardar una grilla conectada (`ConnectedGrid`), y la única forma de obtenerla es pasar la validación. La conectividad no es un `if` que se pueda olvidar.
4. **Dijkstra con pesos (lodo).** Con pesos distintos, BFS ya no da el camino más corto. Se corre Dijkstra desde la meta sobre el grafo invertido: para relajar a un vecino `v` desde `u` se usa `w(u)`, que es el costo que paga el enemigo al pasar de `v` a `u`. Con cola de prioridad (heap binario) cuesta O((V + E) log V).
5. **Comparación BFS vs Dijkstra:** nodos visitados y tiempo de recálculo, mostrados en el panel de métricas.

Todos los algoritmos están implementados desde cero, sin librerías de grafos.

## 4. Arquitectura (resumen)

Arquitectura Elm liviana. Todo el juego es un reductor puro `update(state, msg) → [state, events]`. El núcleo (`graph/` y `game/`) es TypeScript puro, se prueba con Vitest sin navegador y no conoce Three.js. El render solo proyecta el estado en la escena. El detalle técnico está en `CLAUDE.md`.

Stack: TypeScript strict, Vite, Three.js, Vitest, Biome, pnpm y mise.

## 5. Fuera de alcance

Modelos 3D, sonido, multijugador, guardado de partidas, A\*, benchmarks formales y librerías de programación funcional.

## 6. Criterios de éxito

- **Mínimo para la exposición:** colocar torres, ver a los enemigos recalcular la ruta, ver el rechazo de una jugada que bloquea, y modo debug con heatmap y flechas.
- **Aspiración completa:** todo lo de la sección 1.
- **Siempre:** poder explicar y defender cada algoritmo, su complejidad y por qué se eligió.

## 7. Guion de la exposición (~6 min)

1. **Contexto (30 s):** qué es el juego y por qué los grafos son el corazón del problema.
2. **Demo en vivo (2 min):** colocar torres y ver a los enemigos cambiar de ruta. Intentar bloquear el único camino y mostrar el rechazo.
3. **Modo debug (1 min):** heatmap, flechas y animación del BFS.
4. **Explicación de grafos (2 min):**
   - Cómo se modeló la grilla como grafo (nodos, aristas, pesos).
   - Por qué un solo BFS desde la meta sirve a todos los enemigos.
   - Cómo se garantiza la conectividad, y que el tipo la hace obligatoria.
   - Por qué con lodo se pasa de BFS a Dijkstra, y qué muestran las métricas.
5. **Cierre (30 s):** qué se aprendió y qué se podría extender.

## 8. Preguntas probables y respuestas cortas

- **¿Por qué BFS y no Dijkstra?** Si todas las aristas pesan 1, BFS ya da el camino más corto y es más simple y rápido. Dijkstra se justifica solo cuando hay pesos.
- **¿Por qué desde la meta y no desde cada enemigo?** Una sola búsqueda desde la meta calcula la ruta de todas las celdas, así que el costo no crece con el número de enemigos.
- **¿Qué pasa si el jugador bloquea el camino?** Antes de confirmar la torre se verifica la conectividad de spawns y enemigos vivos. Si alguno queda aislado, la jugada se rechaza.
- **¿Cuándo se recalcula?** Solo cuando cambia el grafo (torre colocada o vendida), no en cada frame.
- **¿Qué complejidad tiene?** BFS: O(V + E). Dijkstra con heap: O((V + E) log V). En una grilla E ≤ 2V, así que BFS es lineal en el número de celdas.
- **¿El grafo es dirigido?** Sin lodo no. Con lodo el peso depende de la celda a la que se entra, así que las aristas dejan de ser simétricas. Por eso Dijkstra desde la meta trabaja sobre el grafo invertido.
- **¿Qué ventaja tiene A\*?** Visita menos nodos gracias a una heurística, pero se calcula por enemigo. Con muchos enemigos, el flow field es más eficiente.
- **¿Por qué no se rompe si un enemigo queda encerrado?** Porque la validación también revisa a los enemigos vivos, y el estado no puede contener una grilla desconectada.

## 9. Riesgos y mitigación

- **Perder tiempo en lo visual:** cubos y colores planos hasta que el núcleo funcione.
- **Recalcular en cada frame:** el grafo se recalcula solo cuando cambia.
- **Enemigos atascados en los bordes de las celdas:** se mueven hacia el centro de la celda siguiente e interpolan.
- **Falla de la demo en vivo:** demo guionizada reproducible y video corto de respaldo.
- **Problemas al compartir pantalla:** alto contraste y textos grandes, y probar la pantalla compartida antes de la clase.
