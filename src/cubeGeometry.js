// 純函式資料層：產生 3x3 魔術方塊的 27 顆小方塊資料。
// 不碰 three.js、不碰 React，方便用 Vitest 直接測。

// 傳統六色（西方配色標準）
export const FACE_COLORS = {
  right: '#c41e3a', // +x 紅
  left: '#ff8c00', // -x 橘
  up: '#ffffff', // +y 白
  down: '#ffd500', // -y 黃
  front: '#009e60', // +z 綠
  back: '#0051ba', // -z 藍
}

// 內側面顏色＝方塊之間縫隙的顏色（使用者 2026-07-05 定案：淺灰，不要黑）
export const INNER_COLOR = '#cfcfcf'

// 面的順序對齊 three.js BoxGeometry 的材質順序：+x, -x, +y, -y, +z, -z
export const FACE_ORDER = ['right', 'left', 'up', 'down', 'front', 'back']

/**
 * 產生 27 顆小方塊。每顆包含：
 * - position: [x, y, z]，各軸 ∈ {-1, 0, 1}
 * - colors: 長度 6 的陣列，順序同 FACE_ORDER；外露面是六色之一，內側面是 INNER_COLOR
 */
export function generateCubies() {
  const cubies = []
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        cubies.push({
          position: [x, y, z],
          colors: [
            x === 1 ? FACE_COLORS.right : INNER_COLOR,
            x === -1 ? FACE_COLORS.left : INNER_COLOR,
            y === 1 ? FACE_COLORS.up : INNER_COLOR,
            y === -1 ? FACE_COLORS.down : INNER_COLOR,
            z === 1 ? FACE_COLORS.front : INNER_COLOR,
            z === -1 ? FACE_COLORS.back : INNER_COLOR,
          ],
        })
      }
    }
  }
  return cubies
}

/** 數一顆小方塊有幾面是外露彩色面（非內側深色） */
export function countStickers(cubie) {
  return cubie.colors.filter((c) => c !== INNER_COLOR).length
}

/**
 * 算出某顆小方塊在指定面上是九宮格的哪一格。
 * 回傳 { col, row }（各 0–2，col 由左到右、row 由下到上，
 * 以「正對著那一面看」的方向為準），不在那一面上則回傳 null。
 *
 * col/row 的換算依 three.js BoxGeometry 各面的 UV 方向推導：
 * 每一面的貼圖 u 軸即該面視角的「右」、v 軸即「上」。
 */
export function getFaceTile(face, position) {
  const [x, y, z] = position
  switch (face) {
    case 'right':
      return x === 1 ? { col: 1 - z, row: y + 1 } : null
    case 'left':
      return x === -1 ? { col: z + 1, row: y + 1 } : null
    case 'up':
      return y === 1 ? { col: x + 1, row: 1 - z } : null
    case 'down':
      return y === -1 ? { col: x + 1, row: z + 1 } : null
    case 'front':
      return z === 1 ? { col: x + 1, row: y + 1 } : null
    case 'back':
      return z === -1 ? { col: 1 - x, row: y + 1 } : null
    default:
      return null
  }
}
