# Maze TD

Tower Defense en el navegador sin camino fijo: el jugador arma un laberinto con sus torres y los enemigos recalculan en tiempo real la ruta más corta sobre un grafo que cambia con cada jugada.

Proyecto de grafos para Matemáticas para Informática II (ITM). Los algoritmos (BFS, conectividad y Dijkstra) están implementados desde cero.

## Requisitos

- [mise](https://mise.jdx.dev), que instala las versiones de Node y pnpm definidas en `mise.toml`.

## Uso

```sh
mise install
pnpm install
pnpm dev          # servidor de desarrollo
pnpm test         # tests (vitest)
pnpm check        # lint + formato (biome) y tipos (tsc)
pnpm build        # build de producción en dist/
```

## Documentación

- [`docs/TARGET.md`](docs/TARGET.md): el estado final al que aspira el proyecto, el modelo de grafo y los algoritmos.
