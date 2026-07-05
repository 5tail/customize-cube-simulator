import { describe, it, expect } from 'vitest'
import { dominantAxisIndex, perpAxes, chooseRotation, snapSteps } from './dragTurn.js'

describe('dominantAxisIndex 主軸判定', () => {
  it('標準面法線', () => {
    expect(dominantAxisIndex([0, 0, 1])).toBe(2)
    expect(dominantAxisIndex([-1, 0, 0])).toBe(0)
    expect(dominantAxisIndex([0, 1, 0])).toBe(1)
  })

  it('圓角上的斜法線吸到最大分量', () => {
    expect(dominantAxisIndex([0.2, 0.1, 0.97])).toBe(2)
    expect(dominantAxisIndex([-0.8, 0.4, 0.4])).toBe(0)
  })
})

describe('perpAxes 候選旋轉軸', () => {
  it('每個面法線各有兩個垂直軸', () => {
    expect(perpAxes(2)).toEqual([0, 1]) // 前面 → 可繞 x 或 y 轉
    expect(perpAxes(0)).toEqual([1, 2])
    expect(perpAxes(1)).toEqual([0, 2])
  })
})

describe('chooseRotation 選軸與換算角度', () => {
  const candidates = [
    { axisIndex: 1, screenDir: { x: 100, y: 0 } }, // 繞 y：觸點往螢幕右移，100px/弧度
    { axisIndex: 0, screenDir: { x: 0, y: 120 } }, // 繞 x：觸點往螢幕下移，120px/弧度
  ]

  it('往右拖 → 選繞 y 軸，角度為正', () => {
    const r = chooseRotation({ x: 80, y: 5 }, candidates)
    expect(r.axisIndex).toBe(1)
    expect(r.angle).toBeCloseTo(0.8, 5) // 80px / 100px/rad
  })

  it('往上拖 → 選繞 x 軸，角度為負', () => {
    const r = chooseRotation({ x: 3, y: -60 }, candidates)
    expect(r.axisIndex).toBe(0)
    expect(r.angle).toBeCloseTo(-0.5, 5)
  })

  it('螢幕上幾乎不動的軸不可選；兩個都不可選回傳 null', () => {
    const degenerate = [{ axisIndex: 0, screenDir: { x: 0, y: 0 } }]
    expect(chooseRotation({ x: 50, y: 0 }, degenerate)).toBeNull()
  })
})

describe('snapSteps 放開吸附', () => {
  it('接近 90 度吸到 1 步；接近 0 吸回 0', () => {
    expect(snapSteps(Math.PI / 2 - 0.2)).toBe(1)
    expect(snapSteps(0.3)).toBe(0)
    expect(snapSteps(-Math.PI / 2 + 0.1)).toBe(-1)
  })

  it('45 度是分界（四捨五入）', () => {
    expect(snapSteps(Math.PI / 4 + 0.01)).toBe(1)
    expect(snapSteps(Math.PI / 4 - 0.01)).toBe(0)
  })

  it('最多 ±2 步（180 度）', () => {
    expect(snapSteps(Math.PI * 3)).toBe(2)
    expect(snapSteps(-Math.PI * 3)).toBe(-2)
  })
})
