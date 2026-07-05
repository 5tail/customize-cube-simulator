// 手動撥層的純幾何邏輯：不碰 three.js、不碰 DOM，方便用 Vitest 測。
// 流程：按住方塊的某一面 → 拖曳超過閾值後，從「垂直於該面法線的兩個軸」中
// 選出與拖曳方向最一致的旋轉軸 → 拖曳距離換算旋轉角 → 放開吸到 90 度倍數。

/** 取絕對值最大的分量索引（0=x, 1=y, 2=z）。用來把圓角面的法線吸到主軸。 */
export function dominantAxisIndex(v) {
  const ax = Math.abs(v[0])
  const ay = Math.abs(v[1])
  const az = Math.abs(v[2])
  if (ax >= ay && ax >= az) return 0
  if (ay >= az) return 1
  return 2
}

/** 垂直於某軸的另外兩個軸（候選旋轉軸） */
export function perpAxes(axisIndex) {
  return [0, 1, 2].filter((i) => i !== axisIndex)
}

/**
 * 從候選旋轉軸中選出與拖曳方向最一致的一個。
 * @param drag {x,y} 拖曳向量（螢幕像素，y 向下）
 * @param candidates [{ axisIndex, screenDir: {x,y} }]
 *   screenDir = 該軸正轉時，觸點在螢幕上的移動方向與速率（像素／弧度）
 * @returns { axisIndex, angle } angle 為換算出的旋轉角（弧度，含正負）；無合法候選回傳 null
 */
export function chooseRotation(drag, candidates) {
  let best = null
  for (const c of candidates) {
    const len2 = c.screenDir.x * c.screenDir.x + c.screenDir.y * c.screenDir.y
    if (len2 < 1e-9) continue // 該軸的切向在螢幕上幾乎不動（正對鏡頭），不可選
    const dot = drag.x * c.screenDir.x + drag.y * c.screenDir.y
    const score = Math.abs(dot) / Math.sqrt(len2) // 拖曳在該方向上的像素投影量
    if (!best || score > best.score) {
      best = { axisIndex: c.axisIndex, angle: dot / len2, score }
    }
  }
  if (!best) return null
  return { axisIndex: best.axisIndex, angle: best.angle }
}

/** 放開時把角度吸到最近的 90 度倍數，限制在 ±maxSteps 步內。回傳整數步數。 */
export function snapSteps(angle, maxSteps = 2) {
  const steps = Math.round(angle / (Math.PI / 2))
  return Math.max(-maxSteps, Math.min(maxSteps, steps))
}
