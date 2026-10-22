import * as THREE from 'three'
import { towerTargets } from '../game/combat'
import { bfsReplayLevel, maxDistance } from '../game/debug'
import { enemyPosition } from '../game/enemies'
import type { GameState } from '../game/state'
import { enemyHp } from '../game/waves'
import type { ConnectedGrid } from '../graph/connectivity'
import { distanceTo, nextStep } from '../graph/flow-field'
import { type CellIndex, cellAt, cellCoords, cost, type Grid, isWall } from '../graph/grid'

export type Scene = {
  /** Brings the Three.js objects in line with `state`. Never changes the state. */
  readonly render: (state: GameState, hover: CellIndex | undefined) => void
  /** Cell under a pointer position (viewport pixels), or `undefined` off the board. */
  readonly cellAtPointer: (clientX: number, clientY: number) => CellIndex | undefined
  readonly resize: () => void
}

const COLORS = {
  background: 0x0f1115,
  floor: 0x2a2f3a,
  mud: 0x7a4a24,
  spawn: 0x2ecc71,
  goal: 0xff4d4d,
  tower: 0x4da3ff,
  // White, so enemies stand out on the dark floor and on every heatmap color.
  enemy: 0xffffff,
  // An enemy turns red as it loses life.
  enemyHurt: 0xff2b2b,
  // Magenta: no other part of the board uses it, so the shots are easy to follow.
  beam: 0xff4dff,
  hover: 0xffffff,
  hoverPoor: 0xff4d4d,
  arrow: 0x111318,
  unreachable: 0x16181d,
  // BFS replay: the level being discovered. Cyan, outside the heatmap ramp.
  frontier: 0x22e5ff,
}
/**
 * Debug heatmap, from the goal (distance 0) to the farthest cell. No stop is dark, so the
 * arrows stay readable everywhere. Keep in sync with `.hud-debug-ramp` in `style.css`.
 */
const HEAT_NEAR = new THREE.Color(0xffe14d)
const HEAT_MID = new THREE.Color(0xff7a3d)
const HEAT_FAR = new THREE.Color(0x9b5cff)
/** In debug mode mud keeps a brown tint over its heat color, so it can still be told apart. */
const MUD_TINT = 0.45
/** Arrows lie just above the tiles (whose top is y = 0) so the two do not z-fight. */
const ARROW_LIFT = 0.01
const TILE_GAP = 0.08
const TILE_HEIGHT = 0.1
const TOWER_SIZE = 0.86
const TOWER_HEIGHT = 0.8
const ENEMY_SIZE = 0.45
const BEAM_WIDTH = 0.12
const RANGE_RING_WIDTH = 0.06
/** The range ring lies above the arrows, so it is never hidden under them. */
const RING_LIFT = 0.02
/** Enemies the mesh holds at first; it doubles when a frame needs more. */
const ENEMY_CAPACITY = 64
const FOV = 45
/** Angle between the camera and the vertical: small, so the board reads almost top-down. */
const TILT = THREE.MathUtils.degToRad(18)
/** Extra room around the board so it does not touch the screen edges or hide under the HUD. */
const MARGIN = 1.3

export function createScene(container: HTMLElement, initial: GameState): Scene {
  const { width, height } = initial.world.grid
  const { spawns, goal } = initial.map

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.append(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(COLORS.background)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 1.6))
  const sun = new THREE.DirectionalLight(0xffffff, 1.8)
  sun.position.set(-4, 10, 6)
  scene.add(sun)

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 500)

  // Board: grid (x, y) maps to world (x, z), centered on the origin.
  const boardInto = (x: number, y: number, target: THREE.Vector3): THREE.Vector3 =>
    target.set(x - width / 2 + 0.5, 0, y - height / 2 + 0.5)
  const cellCenterInto = (grid: Grid, cell: CellIndex, target: THREE.Vector3): THREE.Vector3 => {
    const { x, y } = cellCoords(grid, cell)
    return boardInto(x, y, target)
  }
  const cellCenter = (grid: Grid, cell: CellIndex) =>
    cellCenterInto(grid, cell, new THREE.Vector3())
  const allCells: CellIndex[] = []
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const cell = cellAt(initial.world.grid, x, y)
      if (cell !== undefined) allCells.push(cell)
    }

  // Floor: one instance per cell, colored per instance (the debug heatmap rewrites the colors).
  const tiles = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1 - TILE_GAP, TILE_HEIGHT, 1 - TILE_GAP),
    new THREE.MeshLambertMaterial(),
    allCells.length,
  )
  const matrix = new THREE.Matrix4()
  const color = new THREE.Color()
  const mudColor = new THREE.Color(COLORS.mud)
  allCells.forEach((cell, i) => {
    const center = cellCenter(initial.world.grid, cell)
    tiles.setMatrixAt(i, matrix.makeTranslation(center.x, -TILE_HEIGHT / 2, center.z))
  })
  scene.add(tiles)

  /** Heatmap color for a normalized distance `t` in [0, 1]. */
  const heatInto = (t: number, target: THREE.Color): THREE.Color =>
    t < 0.5
      ? target.lerpColors(HEAT_NEAR, HEAT_MID, t * 2)
      : target.lerpColors(HEAT_MID, HEAT_FAR, (t - 0.5) * 2)

  /** Whether a cell is shown in debug mode: always, unless the BFS replay has not reached it. */
  const revealed = (distance: number, level: number | undefined) =>
    level === undefined || distance <= level

  let tilesWorld: ConnectedGrid | undefined
  let tilesDebug: boolean | undefined
  let tilesLevel: number | undefined
  /** `level` is the BFS replay level, or `undefined` to show the whole field. */
  const syncTiles = (world: ConnectedGrid, debug: boolean, level: number | undefined) => {
    // Only a new world (a tower placed or sold), the debug toggle or the replay change the colors.
    if (world === tilesWorld && debug === tilesDebug && level === tilesLevel) return
    tilesWorld = world
    tilesDebug = debug
    tilesLevel = level
    const max = Math.max(maxDistance(world), 1)
    allCells.forEach((cell, i) => {
      const distance = distanceTo(world.field, cell)
      const mud = cost(world.grid, cell) > 1
      if (cell === goal) color.setHex(COLORS.goal)
      else if (spawns.includes(cell)) color.setHex(COLORS.spawn)
      else if (!debug) color.setHex(mud ? COLORS.mud : COLORS.floor)
      else if (distance === undefined) color.setHex(COLORS.unreachable)
      else if (distance === level) color.setHex(COLORS.frontier)
      // Same normalization as the full heatmap, so the replay ends on exactly that picture.
      else if (revealed(distance, level)) {
        heatInto(distance / max, color)
        if (mud) color.lerp(mudColor, MUD_TINT)
      } else color.setHex(mud ? COLORS.mud : COLORS.floor)
      tiles.setColorAt(i, color)
    })
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true
  }
  // Colors must exist before the first frame: the shader is compiled with or without them.
  syncTiles(initial.world, initial.debug, bfsReplayLevel(initial))

  // Flow field arrows: a flat arrow per cell, pointing at the next cell of a shortest path.
  const arrowShape = new THREE.Shape()
    .moveTo(-0.3, -0.06)
    .lineTo(0.04, -0.06)
    .lineTo(0.04, -0.18)
    .lineTo(0.32, 0)
    .lineTo(0.04, 0.18)
    .lineTo(0.04, 0.06)
    .lineTo(-0.3, 0.06)
    .closePath()
  // The shape is drawn in the XY plane pointing at +X; lay it on the floor (XZ), facing up.
  const arrowGeometry = new THREE.ShapeGeometry(arrowShape).rotateX(-Math.PI / 2)
  const arrows = new THREE.InstancedMesh(
    arrowGeometry,
    new THREE.MeshBasicMaterial({ color: COLORS.arrow }),
    allCells.length,
  )
  arrows.count = 0
  arrows.frustumCulled = false
  arrows.visible = false
  scene.add(arrows)

  const up = new THREE.Vector3(0, 1, 0)
  const rotation = new THREE.Quaternion()
  const unitScale = new THREE.Vector3(1, 1, 1)
  const arrowPosition = new THREE.Vector3()
  let arrowsWorld: ConnectedGrid | undefined
  let arrowsLevel: number | undefined
  const syncArrows = (world: ConnectedGrid, level: number | undefined) => {
    if (world === arrowsWorld && level === arrowsLevel) return
    arrowsWorld = world
    arrowsLevel = level
    let count = 0
    for (const cell of allCells) {
      const next = nextStep(world.field, cell)
      // During the replay each discovered cell points at the one that discovered it, so the
      // arrows grow the BFS tree level by level.
      if (next === undefined || !revealed(distanceTo(world.field, cell) ?? 0, level)) continue
      const a = cellCoords(world.grid, cell)
      const b = cellCoords(world.grid, next)
      // Turning +X by an angle φ around Y gives (cos φ, -sin φ) on (x, z), hence the minus.
      rotation.setFromAxisAngle(up, Math.atan2(-(b.y - a.y), b.x - a.x))
      cellCenterInto(world.grid, cell, arrowPosition).setY(ARROW_LIFT)
      arrows.setMatrixAt(count++, matrix.compose(arrowPosition, rotation, unitScale))
    }
    arrows.count = count
    arrows.instanceMatrix.needsUpdate = true
  }

  // Towers: capacity for every cell, but only `count` instances are drawn.
  const towers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(TOWER_SIZE, TOWER_HEIGHT, TOWER_SIZE),
    new THREE.MeshLambertMaterial({ color: COLORS.tower }),
    allCells.length,
  )
  towers.count = 0
  // The bounding sphere would be computed once for the first towers and then go stale.
  towers.frustumCulled = false
  scene.add(towers)

  // Enemies: their positions change every frame, so all instances are rewritten each render.
  // The material is white and each instance is tinted by its color, from white to red as it
  // loses life.
  const enemyGeometry = new THREE.BoxGeometry(ENEMY_SIZE, ENEMY_SIZE, ENEMY_SIZE)
  const enemyMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff })
  const enemyFull = new THREE.Color(COLORS.enemy)
  const enemyHurt = new THREE.Color(COLORS.enemyHurt)
  const createEnemyMesh = (capacity: number) => {
    const mesh = new THREE.InstancedMesh(enemyGeometry, enemyMaterial, capacity)
    mesh.frustumCulled = false
    // Same as the tiles: the colors must exist before the first draw.
    for (let i = 0; i < capacity; i++) mesh.setColorAt(i, enemyFull)
    scene.add(mesh)
    return mesh
  }
  let enemyMesh = createEnemyMesh(ENEMY_CAPACITY)
  const position = new THREE.Vector3()

  const syncEnemies = (state: GameState) => {
    const { enemies } = state
    const { grid } = state.world
    // An InstancedMesh cannot grow, so a bigger one replaces it (geometry and material are shared).
    if (enemies.length > enemyMesh.instanceMatrix.count) {
      scene.remove(enemyMesh)
      enemyMesh.dispose()
      enemyMesh = createEnemyMesh(Math.max(enemies.length, enemyMesh.instanceMatrix.count * 2))
    }
    // Every enemy on the board belongs to the current wave, so they all started with this life.
    const fullHp = enemyHp(state.rules, state.wave)
    enemies.forEach((enemy, i) => {
      const { x, y } = enemyPosition(grid, enemy)
      boardInto(x, y, position)
      enemyMesh.setMatrixAt(i, matrix.makeTranslation(position.x, ENEMY_SIZE / 2, position.z))
      const hurt = 1 - Math.min(enemy.hp / Math.max(fullHp, 1), 1)
      enemyMesh.setColorAt(i, color.lerpColors(enemyFull, enemyHurt, hurt))
    })
    enemyMesh.count = enemies.length
    enemyMesh.instanceMatrix.needsUpdate = true
    if (enemyMesh.instanceColor) enemyMesh.instanceColor.needsUpdate = true
  }

  // Shots: one thin box per tower with a target, stretched from the top of the tower to the
  // enemy. The box is 1 long on Z, so its matrix scales Z to the length and rotates Z onto
  // the direction of the shot.
  const beams = new THREE.InstancedMesh(
    new THREE.BoxGeometry(BEAM_WIDTH, BEAM_WIDTH, 1),
    new THREE.MeshBasicMaterial({ color: COLORS.beam }),
    allCells.length,
  )
  beams.count = 0
  beams.frustumCulled = false
  scene.add(beams)
  const forward = new THREE.Vector3(0, 0, 1)
  const beamStart = new THREE.Vector3()
  const beamEnd = new THREE.Vector3()
  const beamDirection = new THREE.Vector3()
  const beamScale = new THREE.Vector3()

  const syncBeams = (state: GameState) => {
    // A paused or lost game deals no damage, so it shows no shots.
    const shots = state.paused || state.phase.kind === 'lost' ? [] : towerTargets(state)
    const { grid } = state.world
    shots.forEach(({ tower, enemy }, i) => {
      cellCenterInto(grid, tower, beamStart).setY(TOWER_HEIGHT)
      const { x, y } = enemyPosition(grid, enemy)
      boardInto(x, y, beamEnd).setY(ENEMY_SIZE / 2)
      beamDirection.subVectors(beamEnd, beamStart)
      const length = beamDirection.length()
      rotation.setFromUnitVectors(forward, beamDirection.normalize())
      beamStart.lerp(beamEnd, 0.5)
      beams.setMatrixAt(i, matrix.compose(beamStart, rotation, beamScale.set(1, 1, length)))
    })
    beams.count = shots.length
    beams.instanceMatrix.needsUpdate = true
  }

  const hoverMaterial = new THREE.MeshBasicMaterial({
    color: COLORS.hover,
    transparent: true,
    opacity: 0.25,
  })
  const hoverMesh = new THREE.Mesh(new THREE.BoxGeometry(1, TOWER_HEIGHT + 0.04, 1), hoverMaterial)
  hoverMesh.visible = false
  scene.add(hoverMesh)

  // Range of a tower on the hovered cell: a flat ring (drawn in XY, laid on the floor like the
  // arrows) whose outer edge is the tower range.
  const rangeRing = new THREE.Mesh(
    new THREE.RingGeometry(
      initial.rules.towerRange - RANGE_RING_WIDTH,
      initial.rules.towerRange,
      64,
    ).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: COLORS.hover, transparent: true, opacity: 0.5 }),
  )
  rangeRing.visible = false
  scene.add(rangeRing)

  let lastGrid: Grid | undefined
  const syncTowers = (grid: Grid) => {
    // Grids are copy-on-write, so a new reference is the only way the walls can change.
    if (grid === lastGrid) return
    lastGrid = grid
    let count = 0
    for (const cell of allCells) {
      if (!isWall(grid, cell)) continue
      const center = cellCenter(grid, cell)
      towers.setMatrixAt(count++, matrix.makeTranslation(center.x, TOWER_HEIGHT / 2, center.z))
    }
    towers.count = count
    towers.instanceMatrix.needsUpdate = true
  }

  const resize = () => {
    const w = container.clientWidth
    const h = container.clientHeight
    renderer.setSize(w, h)
    camera.aspect = w / h
    // Distance at which the whole board fits both vertically and horizontally.
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    const distance = MARGIN * Math.max(height / 2 / tanHalf, width / 2 / (tanHalf * camera.aspect))
    camera.position.set(0, distance * Math.cos(TILT), distance * Math.sin(TILT))
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }
  resize()

  const raycaster = new THREE.Raycaster()
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const pointer = new THREE.Vector2()
  const hit = new THREE.Vector3()

  return {
    render(state, hover) {
      syncTowers(state.world.grid)
      const level = bfsReplayLevel(state)
      syncTiles(state.world, state.debug, level)
      arrows.visible = state.debug
      if (state.debug) syncArrows(state.world, level)
      syncEnemies(state)
      syncBeams(state)
      hoverMesh.visible = hover !== undefined
      rangeRing.visible = hover !== undefined
      if (hover !== undefined) {
        const center = cellCenter(state.world.grid, hover)
        hoverMesh.position.set(center.x, TOWER_HEIGHT / 2, center.z)
        rangeRing.position.set(center.x, RING_LIFT, center.z)
        // Red on a free cell the player cannot pay for; a tower there could still be sold.
        const poor = !isWall(state.world.grid, hover) && state.money < state.rules.towerCost
        hoverMaterial.color.setHex(poor ? COLORS.hoverPoor : COLORS.hover)
      }
      renderer.render(scene, camera)
    },
    cellAtPointer(clientX, clientY) {
      const rect = renderer.domElement.getBoundingClientRect()
      // Normalized device coordinates: -1..1 on both axes, with y pointing up.
      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)
      if (raycaster.ray.intersectPlane(ground, hit) === null) return undefined
      return cellAt(
        lastGrid ?? initial.world.grid,
        Math.floor(hit.x + width / 2),
        Math.floor(hit.z + height / 2),
      )
    },
    resize,
  }
}
