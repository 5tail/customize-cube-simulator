import { describe, it, expect } from 'vitest'
import { generateCubies, countStickers, INNER_COLOR } from './cubeGeometry.js'

describe('cubeGeometry', () => {
  const cubies = generateCubies()

  it('共有 27 顆小方塊', () => {
    expect(cubies).toHaveLength(27)
  })

  it('核心（0,0,0）沒有任何彩色面', () => {
    const core = cubies.find(
      (c) => c.position[0] === 0 && c.position[1] === 0 && c.position[2] === 0
    )
    expect(core).toBeDefined()
    expect(countStickers(core)).toBe(0)
  })

  it('角塊（如 1,1,1）恰有 3 個彩色面', () => {
    const corner = cubies.find(
      (c) => c.position[0] === 1 && c.position[1] === 1 && c.position[2] === 1
    )
    expect(corner).toBeDefined()
    expect(countStickers(corner)).toBe(3)
  })

  it('面中心（如 0,0,1）恰有 1 個彩色面', () => {
    const center = cubies.find(
      (c) => c.position[0] === 0 && c.position[1] === 0 && c.position[2] === 1
    )
    expect(center).toBeDefined()
    expect(countStickers(center)).toBe(1)
  })

  it('全部彩色貼紙加總為 54（6 面 × 9 格）', () => {
    const total = cubies.reduce((sum, c) => sum + countStickers(c), 0)
    expect(total).toBe(54)
  })

  it('每顆小方塊都有 6 個面顏色，且內側色只用深色', () => {
    for (const cubie of cubies) {
      expect(cubie.colors).toHaveLength(6)
      for (const color of cubie.colors) {
        expect(typeof color).toBe('string')
      }
    }
    // 位置在最外層以外的面必為內側色：抽驗核心即可
    const core = cubies.find((c) => c.position.every((v) => v === 0))
    expect(core.colors.every((c) => c === INNER_COLOR)).toBe(true)
  })
})
