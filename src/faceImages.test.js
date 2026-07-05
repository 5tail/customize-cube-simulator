import { describe, it, expect } from 'vitest'
import {
  validateImageFile,
  computeCropWindow,
  getTileTransform,
  computeTileMatrix,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  MAX_SCALE,
  MAX_ROTATION,
  FACE_LABELS,
} from './faceImages.js'
import { getFaceTile, FACE_ORDER, generateCubies } from './cubeGeometry.js'

describe('validateImageFile 檔案驗證', () => {
  it('接受上限內的 jpg', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: 1024 })).toEqual({ ok: true })
  })

  it('接受剛好等於上限的 png', () => {
    expect(validateImageFile({ type: 'image/png', size: MAX_FILE_SIZE })).toEqual({ ok: true })
  })

  it('上限是 8MB（使用者 2026-07-05 決定）', () => {
    expect(MAX_FILE_SIZE_MB).toBe(8)
    expect(MAX_FILE_SIZE).toBe(8 * 1024 * 1024)
  })

  it('拒絕其他圖片格式（如 gif）', () => {
    const result = validateImageFile({ type: 'image/gif', size: 1024 })
    expect(result.ok).toBe(false)
    expect(result.error).toContain('jpg')
  })

  it('拒絕超過上限的檔案，錯誤訊息含上限數字', () => {
    const result = validateImageFile({ type: 'image/png', size: MAX_FILE_SIZE + 1 })
    expect(result.ok).toBe(false)
    expect(result.error).toContain(`${MAX_FILE_SIZE_MB}MB`)
  })

  it('拒絕空值或缺欄位的輸入', () => {
    expect(validateImageFile(null).ok).toBe(false)
    expect(validateImageFile({}).ok).toBe(false)
  })
})

describe('computeCropWindow 裁切視窗', () => {
  it('正方形圖、預設值 → 顯示整張圖', () => {
    expect(computeCropWindow(500, 500)).toEqual({ x: 0, y: 0, w: 1, h: 1 })
  })

  it('橫的長方形圖 → 自動取置中正方形（修正拉伸變形）', () => {
    // 400x200：正方形邊長 200，UV 寬 = 200/400 = 0.5，水平置中
    expect(computeCropWindow(400, 200)).toEqual({ x: 0.25, y: 0, w: 0.5, h: 1 })
  })

  it('直的長方形圖 → 同理垂直置中', () => {
    expect(computeCropWindow(200, 400)).toEqual({ x: 0, y: 0.25, w: 1, h: 0.5 })
  })

  it('縮放 2 倍、置中 → 視窗變一半、留在中間', () => {
    expect(computeCropWindow(500, 500, 2)).toEqual({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 })
  })

  it('pan 推到極端也不會超出圖片範圍', () => {
    const atMax = computeCropWindow(400, 200, 2, 1, 1)
    expect(atMax.x + atMax.w).toBeCloseTo(1, 10)
    expect(atMax.y + atMax.h).toBeCloseTo(1, 10)
    const atMin = computeCropWindow(400, 200, 2, 0, 0)
    expect(atMin.x).toBe(0)
    expect(atMin.y).toBe(0)
  })

  it('scale 超出範圍會被夾回上限', () => {
    const clamped = computeCropWindow(500, 500, 99)
    expect(clamped.w).toBeCloseTo(1 / MAX_SCALE, 10)
  })
})

describe('getTileTransform 貼紙格變換', () => {
  const full = { x: 0, y: 0, w: 1, h: 1 }

  it('整張圖時，左下格＝offset 0、repeat 1/3；右上格＝offset 2/3', () => {
    expect(getTileTransform(full, { col: 0, row: 0 })).toEqual({
      repeatX: 1 / 3,
      repeatY: 1 / 3,
      offsetX: 0,
      offsetY: 0,
    })
    const topRight = getTileTransform(full, { col: 2, row: 2 })
    expect(topRight.offsetX).toBeCloseTo(2 / 3, 10)
    expect(topRight.offsetY).toBeCloseTo(2 / 3, 10)
  })

  it('九格剛好無縫拼滿整個視窗', () => {
    const win = { x: 0.25, y: 0, w: 0.5, h: 1 }
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const t = getTileTransform(win, { col, row })
        expect(t.offsetX).toBeCloseTo(win.x + (col * win.w) / 3, 10)
        expect(t.offsetX + t.repeatX).toBeLessThanOrEqual(win.x + win.w + 1e-10)
      }
    }
    const last = getTileTransform(win, { col: 2, row: 2 })
    expect(last.offsetX + last.repeatX).toBeCloseTo(win.x + win.w, 10)
    expect(last.offsetY + last.repeatY).toBeCloseTo(win.y + win.h, 10)
  })
})

describe('computeTileMatrix 含旋轉的貼紙格變換', () => {
  const apply = (m, u, v) => [m.a * u + m.b * v + m.tx, m.c * u + m.d * v + m.ty]

  it('旋轉 0 度時與 getTileTransform 完全一致', () => {
    const win = { x: 0.25, y: 0, w: 0.5, h: 1 }
    for (const tile of [{ col: 0, row: 0 }, { col: 2, row: 1 }]) {
      const m = computeTileMatrix(win, tile, 0)
      const t = getTileTransform(win, tile)
      expect(m.a).toBeCloseTo(t.repeatX, 10)
      expect(m.d).toBeCloseTo(t.repeatY, 10)
      expect(m.b).toBeCloseTo(0, 10)
      expect(m.c).toBeCloseTo(0, 10)
      expect(m.tx).toBeCloseTo(t.offsetX, 10)
      expect(m.ty).toBeCloseTo(t.offsetY, 10)
    }
  })

  it('任何角度下，面的正中央永遠取樣視窗中心（旋轉軸不跑掉）', () => {
    const win = { x: 0.1, y: 0.2, w: 0.6, h: 0.5 }
    const centerTile = { col: 1, row: 1 }
    for (const deg of [0, 45, 90, -90, 180, -180, 33]) {
      const m = computeTileMatrix(win, centerTile, deg)
      const [u, v] = apply(m, 0.5, 0.5) // 中央格的正中間＝整面正中央
      expect(u).toBeCloseTo(win.x + win.w / 2, 10)
      expect(v).toBeCloseTo(win.y + win.h / 2, 10)
    }
  })

  it('旋轉 180 度＝上下左右顛倒（角落互換）', () => {
    const win = { x: 0, y: 0, w: 1, h: 1 }
    const m0 = computeTileMatrix(win, { col: 0, row: 0 }, 0)
    const m180 = computeTileMatrix(win, { col: 2, row: 2 }, 180)
    // 整面左下角（0 度）應等於「轉 180 後右上格的右上角」取樣的點
    const p0 = apply(m0, 0, 0)
    const p180 = apply(m180, 1, 1)
    expect(p180[0]).toBeCloseTo(p0[0], 10)
    expect(p180[1]).toBeCloseTo(p0[1], 10)
  })

  it('超過 ±180 的輸入會被夾住', () => {
    const win = { x: 0, y: 0, w: 1, h: 1 }
    const m = computeTileMatrix(win, { col: 1, row: 1 }, 999)
    const mMax = computeTileMatrix(win, { col: 1, row: 1 }, MAX_ROTATION)
    expect(m.a).toBeCloseTo(mMax.a, 10)
    expect(m.b).toBeCloseTo(mMax.b, 10)
  })

  it('長方形圖（w≠h）旋轉 90 度：像素空間等距，不會歪斜', () => {
    // 視窗 UV 尺寸不同（w=0.5, h=1）但像素上是正方形。
    // 面上「往右走一格」在轉 90 度後，取樣點應沿 v 方向移動
    // 對應的像素距離 = 沿 u 方向一格的像素距離。
    const win = { x: 0.25, y: 0, w: 0.5, h: 1 }
    const m = computeTileMatrix(win, { col: 1, row: 1 }, 90)
    const [u1, v1] = apply(m, 0, 0.5)
    const [u2, v2] = apply(m, 1, 0.5)
    // 沿面 u 移動時，取樣點只沿圖片 v 移動（90 度）
    expect(u2 - u1).toBeCloseTo(0, 10)
    // 在 UV 上移動了 h/3；因 h 對應的像素數與 w 對應的像素數相同（正方形視窗），等距 ✓
    expect(Math.abs(v2 - v1)).toBeCloseTo(win.h / 3, 10)
  })
})

describe('getFaceTile 九宮格對應', () => {
  it('不在該面上的小方塊回傳 null', () => {
    expect(getFaceTile('front', [0, 0, -1])).toBeNull()
    expect(getFaceTile('front', [0, 0, 0])).toBeNull()
    expect(getFaceTile('up', [0, -1, 0])).toBeNull()
  })

  it('每個面的中心格是 col 1, row 1', () => {
    expect(getFaceTile('front', [0, 0, 1])).toEqual({ col: 1, row: 1 })
    expect(getFaceTile('back', [0, 0, -1])).toEqual({ col: 1, row: 1 })
    expect(getFaceTile('up', [0, 1, 0])).toEqual({ col: 1, row: 1 })
    expect(getFaceTile('down', [0, -1, 0])).toEqual({ col: 1, row: 1 })
    expect(getFaceTile('right', [1, 0, 0])).toEqual({ col: 1, row: 1 })
    expect(getFaceTile('left', [-1, 0, 0])).toEqual({ col: 1, row: 1 })
  })

  it('前面右上角的小方塊（1,1,1）是 col 2, row 2', () => {
    expect(getFaceTile('front', [1, 1, 1])).toEqual({ col: 2, row: 2 })
  })

  it('每一面恰好有 9 顆小方塊，且 9 格 (col,row) 不重複、涵蓋整個九宮格', () => {
    const cubies = generateCubies()
    for (const face of FACE_ORDER) {
      const tiles = cubies
        .map((c) => getFaceTile(face, c.position))
        .filter((t) => t !== null)
      expect(tiles).toHaveLength(9)
      const keys = new Set(tiles.map((t) => `${t.col},${t.row}`))
      expect(keys.size).toBe(9)
      for (const t of tiles) {
        expect(t.col).toBeGreaterThanOrEqual(0)
        expect(t.col).toBeLessThanOrEqual(2)
        expect(t.row).toBeGreaterThanOrEqual(0)
        expect(t.row).toBeLessThanOrEqual(2)
      }
    }
  })

  it('FACE_LABELS 六面齊全且與 FACE_ORDER 對得上', () => {
    expect(Object.keys(FACE_LABELS).sort()).toEqual([...FACE_ORDER].sort())
  })
})
