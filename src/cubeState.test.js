import { describe, it, expect } from 'vitest'
import {
  rotatePos,
  axisQuat,
  quatMultiply,
  createSolvedState,
  applyMove,
  randomScramble,
} from './cubeState.js'
import { generateCubies } from './cubeGeometry.js'

const positions = generateCubies().map((c) => c.position)
const key = (p) => p.join(',')

describe('rotatePos 位置旋轉', () => {
  it('繞任一軸轉 4 次回到原位', () => {
    for (const axis of ['x', 'y', 'z']) {
      let p = [1, -1, 0]
      for (let i = 0; i < 4; i++) p = rotatePos(p, axis, 1)
      expect(p).toEqual([1, -1, 0])
    }
  })

  it('正轉再反轉互相抵銷', () => {
    const p = [1, 0, -1]
    expect(rotatePos(rotatePos(p, 'y', 1), 'y', -1)).toEqual(p)
  })

  it('繞 y 軸正轉 90：前面(+z)轉到右面(+x)', () => {
    expect(rotatePos([0, 0, 1], 'y', 1)).toEqual([1, 0, 0])
  })
})

describe('applyMove 單層轉動', () => {
  it('只動該層 9 顆，其他 18 顆完全不動', () => {
    const state = createSolvedState(positions)
    const next = applyMove(state, { axis: 'y', layer: 1, dir: 1 })
    let moved = 0
    next.forEach((c, i) => {
      if (positions[i][1] === 1) {
        moved++
      } else {
        expect(c.pos).toEqual(positions[i])
        expect(c.quat).toEqual([0, 0, 0, 1])
      }
    })
    expect(moved).toBe(9)
  })

  it('同一步做 4 次回到整齊（位置全對、朝向等價於不轉）', () => {
    let state = createSolvedState(positions)
    const move = { axis: 'x', layer: -1, dir: 1 }
    for (let i = 0; i < 4; i++) state = applyMove(state, move)
    state.forEach((c, i) => {
      expect(c.pos).toEqual(positions[i])
      // 四元數轉 360 度會變成 -identity，代表同一個朝向：檢查 |w|≈1
      expect(Math.abs(c.quat[3])).toBeCloseTo(1, 10)
      expect(Math.abs(c.quat[0])).toBeCloseTo(0, 10)
      expect(Math.abs(c.quat[1])).toBeCloseTo(0, 10)
      expect(Math.abs(c.quat[2])).toBeCloseTo(0, 10)
    })
  })

  it('任意打亂後，27 個位置仍是原本 27 格的一個排列（沒有重疊、沒有跑出格子）', () => {
    let state = createSolvedState(positions)
    for (const move of randomScramble(30, () => 0.37)) {
      state = applyMove(state, move)
    }
    const occupied = new Set(state.map((c) => key(c.pos)))
    expect(occupied.size).toBe(27)
    const original = new Set(positions.map(key))
    for (const k of occupied) expect(original.has(k)).toBe(true)
  })

  it('核心（0,0,0）永遠不換格子', () => {
    const coreIndex = positions.findIndex((p) => key(p) === '0,0,0')
    let state = createSolvedState(positions)
    for (const move of randomScramble(30, () => 0.71)) {
      state = applyMove(state, move)
    }
    expect(state[coreIndex].pos).toEqual([0, 0, 0])
  })

  it('一步之後套用反向步等於沒動', () => {
    const state = createSolvedState(positions)
    const there = applyMove(state, { axis: 'z', layer: 0, dir: -1 })
    const back = applyMove(there, { axis: 'z', layer: 0, dir: 1 })
    back.forEach((c, i) => {
      expect(c.pos).toEqual(positions[i])
      expect(Math.abs(c.quat[3])).toBeCloseTo(1, 10)
    })
  })
})

describe('quatMultiply / axisQuat', () => {
  it('單位四元數乘任何 q 不變', () => {
    const q = axisQuat('y', 1)
    expect(quatMultiply([0, 0, 0, 1], q)).toEqual(q)
  })

  it('正轉乘反轉＝單位', () => {
    const q = quatMultiply(axisQuat('z', 1), axisQuat('z', -1))
    expect(q[3]).toBeCloseTo(1, 10)
    expect(q[0]).toBeCloseTo(0, 10)
  })
})

describe('randomScramble 打亂步驟', () => {
  it('長度正確、每一步都合法', () => {
    const moves = randomScramble(20, () => 0.42)
    expect(moves).toHaveLength(20)
    for (const m of moves) {
      expect(['x', 'y', 'z']).toContain(m.axis)
      expect([-1, 0, 1]).toContain(m.layer)
      expect([1, -1]).toContain(m.dir)
    }
  })

  it('不會出現「立刻轉回上一步」的浪費步', () => {
    let call = 0
    // 刻意做一個會頻繁產生互逆步的假亂數
    const rng = () => [0.1, 0.1, 0.2, 0.1, 0.1, 0.9][call++ % 6]
    const moves = randomScramble(10, rng)
    for (let i = 1; i < moves.length; i++) {
      const a = moves[i - 1]
      const b = moves[i]
      const isUndo = a.axis === b.axis && a.layer === b.layer && a.dir === -b.dir
      expect(isUndo).toBe(false)
    }
  })
})
