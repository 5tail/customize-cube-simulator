// 單層轉動引擎的純函式資料層：不碰 three.js、不碰 React。
// 狀態 = 27 顆小方塊各自的 { pos: [x,y,z] 目前位置, quat: [x,y,z,w] 目前朝向 }。
// 一步 move = { axis: 'x'|'y'|'z', layer: -1|0|1, dir: 1|-1 }（90 度轉）。

export const AXES = ['x', 'y', 'z']
export const LAYERS = [-1, 0, 1]

const AXIS_INDEX = { x: 0, y: 1, z: 2 }

const z0 = (n) => (n === 0 ? 0 : n) // 避免 -0（0 乘負數在 JS 會變 -0）

/** 位置繞軸轉 90 度（右手定則，dir=1 正轉）。輸入輸出都是整數座標。 */
export function rotatePos([x, y, z], axis, dir) {
  if (axis === 'x') return [x, z0(-dir * z), z0(dir * y)]
  if (axis === 'y') return [z0(dir * z), y, z0(-dir * x)]
  return [z0(-dir * y), z0(dir * x), z]
}

/** 繞軸 90 度的四元數 [x,y,z,w] */
export function axisQuat(axis, dir) {
  const half = (dir * Math.PI) / 4
  const s = Math.sin(half)
  const c = Math.cos(half)
  if (axis === 'x') return [s, 0, 0, c]
  if (axis === 'y') return [0, s, 0, c]
  return [0, 0, s, c]
}

/** 四元數相乘 a⊗b（先做 b 再做 a） */
export function quatMultiply(a, b) {
  const [ax, ay, az, aw] = a
  const [bx, by, bz, bw] = b
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ]
}

/** 整齊狀態：每顆小方塊在自己的原始位置、無旋轉 */
export function createSolvedState(positions) {
  return positions.map((p) => ({ pos: [...p], quat: [0, 0, 0, 1] }))
}

/** 套用一步：該層 9 顆位置與朝向一起轉，其餘不動。回傳新狀態（不改舊的）。 */
export function applyMove(state, { axis, layer, dir }) {
  const ai = AXIS_INDEX[axis]
  const q = axisQuat(axis, dir)
  return state.map((c) =>
    c.pos[ai] === layer
      ? { pos: rotatePos(c.pos, axis, dir), quat: quatMultiply(q, c.quat) }
      : c
  )
}

/**
 * 產生隨機打亂步驟。規則：不產生「立刻把上一步轉回去」的無效步。
 * rng 可注入以便測試（預設 Math.random）。
 */
export function randomScramble(count = 18, rng = Math.random) {
  const moves = []
  while (moves.length < count) {
    const move = {
      axis: AXES[Math.floor(rng() * 3)],
      layer: LAYERS[Math.floor(rng() * 3)],
      dir: rng() < 0.5 ? 1 : -1,
    }
    const prev = moves[moves.length - 1]
    if (prev && prev.axis === move.axis && prev.layer === move.layer && prev.dir === -move.dir) {
      continue
    }
    moves.push(move)
  }
  return moves
}
