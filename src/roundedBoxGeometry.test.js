import { describe, it, expect } from 'vitest'
import { createRoundedBoxGeometry } from './roundedBoxGeometry.js'

describe('createRoundedBoxGeometry 圓角方塊幾何', () => {
  const size = 0.95
  const radius = 0.08
  const geo = createRoundedBoxGeometry(size, radius)

  it('保留 6 個材質分組（六面各自指定材質的關鍵）', () => {
    expect(geo.groups).toHaveLength(6)
    const materialIndices = geo.groups.map((g) => g.materialIndex)
    expect([...new Set(materialIndices)].sort()).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('所有頂點都在原本的方塊範圍內（圓角只往內收，不外凸）', () => {
    const pos = geo.attributes.position
    const half = size / 2 + 1e-6
    for (let i = 0; i < pos.count; i++) {
      expect(Math.abs(pos.getX(i))).toBeLessThanOrEqual(half)
      expect(Math.abs(pos.getY(i))).toBeLessThanOrEqual(half)
      expect(Math.abs(pos.getZ(i))).toBeLessThanOrEqual(half)
    }
  })

  it('角落頂點確實被削圓（離中心的距離小於原本的角落）', () => {
    const pos = geo.attributes.position
    const originalCorner = Math.sqrt(3) * (size / 2)
    let maxDist = 0
    for (let i = 0; i < pos.count; i++) {
      const d = Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i))
      if (d > maxDist) maxDist = d
    }
    expect(maxDist).toBeLessThan(originalCorner - 0.01)
  })

  it('半徑 0 時退化為普通方塊（角落距離＝原本角落）', () => {
    const sharp = createRoundedBoxGeometry(size, 0)
    const pos = sharp.attributes.position
    let maxDist = 0
    for (let i = 0; i < pos.count; i++) {
      const d = Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i))
      if (d > maxDist) maxDist = d
    }
    expect(maxDist).toBeCloseTo(Math.sqrt(3) * (size / 2), 5)
  })
})
