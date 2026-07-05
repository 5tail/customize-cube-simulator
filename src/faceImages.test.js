import { describe, it, expect } from 'vitest'
import { validateImageFile, MAX_FILE_SIZE, MAX_FILE_SIZE_MB, FACE_LABELS } from './faceImages.js'
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
