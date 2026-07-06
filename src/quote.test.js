import { describe, it, expect } from 'vitest'
import { findTier, nextTier, computeQuote, toggleOption } from './quote.js'
import pricing from './pricing.json'

describe('findTier 級距選擇（用實際 pricing.json 驗證）', () => {
  const cases = [
    [1, 420],
    [9, 420],
    [10, 350],
    [29, 350],
    [30, 250],
    [49, 250],
    [50, 220],
    [100, 195],
    [200, 155],
    [300, 140],
    [500, 120],
    [800, 98],
    [1000, 86],
    [2000, 79],
    [4999, 79],
    [5000, 60],
    [99999, 60],
  ]
  for (const [qty, price] of cases) {
    it(`${qty} 顆 → 單價 ${price}`, () => {
      expect(findTier(pricing.tiers, qty).unitPrice).toBe(price)
    })
  }
})

describe('nextTier 下一級距提示', () => {
  it('15 顆 → 下一級距是滿 30 顆', () => {
    expect(nextTier(pricing.tiers, 15).minQty).toBe(30)
  })

  it('已達最高級距（5000+）→ 沒有下一級', () => {
    expect(nextTier(pricing.tiers, 5000)).toBeNull()
  })
})

describe('computeQuote 試算', () => {
  it('30 顆＋紙盒＋潤滑：單顆 250+5+10=265，總計 7950', () => {
    const q = computeQuote(pricing, 30, ['paperBox', 'lube'])
    expect(q.perUnit).toBe(265)
    expect(q.total).toBe(7950)
  })

  it('1 顆無加購：420', () => {
    const q = computeQuote(pricing, 1, [])
    expect(q.perUnit).toBe(420)
    expect(q.total).toBe(420)
  })

  it('塑膠盒 +8', () => {
    expect(computeQuote(pricing, 10, ['plasticBox']).perUnit).toBe(358)
  })

  it('非法數量（0、負數、NaN、小數）安全處理', () => {
    expect(computeQuote(pricing, 0, []).qty).toBe(1)
    expect(computeQuote(pricing, -5, []).qty).toBe(1)
    expect(computeQuote(pricing, NaN, []).qty).toBe(1)
    expect(computeQuote(pricing, 30.9, []).qty).toBe(30)
  })
})

describe('toggleOption 勾選邏輯', () => {
  it('紙盒與塑膠盒互斥：勾塑膠盒會取消紙盒', () => {
    const next = toggleOption(pricing.options, ['paperBox'], 'plasticBox')
    expect(next).toContain('plasticBox')
    expect(next).not.toContain('paperBox')
  })

  it('潤滑與盒裝可以並存', () => {
    const next = toggleOption(pricing.options, ['paperBox'], 'lube')
    expect(next.sort()).toEqual(['lube', 'paperBox'])
  })

  it('再勾一次＝取消', () => {
    expect(toggleOption(pricing.options, ['lube'], 'lube')).toEqual([])
  })
})

describe('pricing.json 資料健全性（防店家改壞）', () => {
  it('級距按 minQty 遞增且單價遞減（量大更便宜）', () => {
    for (let i = 1; i < pricing.tiers.length; i++) {
      expect(pricing.tiers[i].minQty).toBeGreaterThan(pricing.tiers[i - 1].minQty)
      expect(pricing.tiers[i].unitPrice).toBeLessThan(pricing.tiers[i - 1].unitPrice)
    }
  })

  it('客服聯絡設定齊全（email 含 @、LINE 是網址）', () => {
    expect(pricing.contact.email).toContain('@')
    expect(pricing.contact.lineUrl).toMatch(/^https:\/\//)
  })

  it('必須有 1 顆起的級距，所有數字為正', () => {
    expect(pricing.tiers[0].minQty).toBe(1)
    for (const t of pricing.tiers) expect(t.unitPrice).toBeGreaterThan(0)
    for (const o of pricing.options) {
      expect(o.perUnit).toBeGreaterThanOrEqual(0)
      expect(typeof o.label).toBe('string')
    }
  })
})
