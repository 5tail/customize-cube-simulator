import { describe, it, expect } from 'vitest'
import { findTier, nextTier, computeQuote, toggleOption } from './quote.js'
import pricing from './pricing.json'

// 邏輯測試一律用假資料，不依賴 pricing.json 裡的實際價格數字——
// 店家改價格是這個檔案設計上就該自由做的事，測試不能因此變紅燈。
// 真實 pricing.json 的驗證只做「結構健全性」，見檔案最下方。
const mockPricing = {
  tiers: [
    { minQty: 1, unitPrice: 100 },
    { minQty: 10, unitPrice: 80 },
    { minQty: 50, unitPrice: 60 },
  ],
  options: [
    { id: 'paper', label: '紙盒', perUnit: 5, exclusiveGroup: 'packaging' },
    { id: 'plastic', label: '塑膠盒', perUnit: 8, exclusiveGroup: 'packaging' },
    { id: 'lube', label: '潤滑', perUnit: 10 },
  ],
}

describe('findTier 級距選擇', () => {
  const cases = [
    [1, 100],
    [9, 100],
    [10, 80],
    [49, 80],
    [50, 60],
    [9999, 60],
  ]
  for (const [qty, price] of cases) {
    it(`${qty} 顆 → 單價 ${price}`, () => {
      expect(findTier(mockPricing.tiers, qty).unitPrice).toBe(price)
    })
  }
})

describe('nextTier 下一級距提示', () => {
  it('5 顆 → 下一級距是滿 10 顆', () => {
    expect(nextTier(mockPricing.tiers, 5).minQty).toBe(10)
  })

  it('已達最高級距 → 沒有下一級', () => {
    expect(nextTier(mockPricing.tiers, 50)).toBeNull()
  })
})

describe('computeQuote 試算', () => {
  it('30 顆＋紙盒＋潤滑：單顆 80+5+10=95，總計 2850', () => {
    const q = computeQuote(mockPricing, 30, ['paper', 'lube'])
    expect(q.perUnit).toBe(95)
    expect(q.total).toBe(2850)
  })

  it('1 顆無加購：100', () => {
    const q = computeQuote(mockPricing, 1, [])
    expect(q.perUnit).toBe(100)
    expect(q.total).toBe(100)
  })

  it('塑膠盒 +8', () => {
    expect(computeQuote(mockPricing, 10, ['plastic']).perUnit).toBe(88)
  })

  it('非法數量（0、負數、NaN、小數）安全處理', () => {
    expect(computeQuote(mockPricing, 0, []).qty).toBe(1)
    expect(computeQuote(mockPricing, -5, []).qty).toBe(1)
    expect(computeQuote(mockPricing, NaN, []).qty).toBe(1)
    expect(computeQuote(mockPricing, 30.9, []).qty).toBe(30)
  })
})

describe('toggleOption 勾選邏輯', () => {
  it('同群組互斥：勾塑膠盒會取消紙盒', () => {
    const next = toggleOption(mockPricing.options, ['paper'], 'plastic')
    expect(next).toContain('plastic')
    expect(next).not.toContain('paper')
  })

  it('不同群組可以並存', () => {
    const next = toggleOption(mockPricing.options, ['paper'], 'lube')
    expect(next.sort()).toEqual(['lube', 'paper'])
  })

  it('再勾一次＝取消', () => {
    expect(toggleOption(mockPricing.options, ['lube'], 'lube')).toEqual([])
  })
})

describe('pricing.json 資料健全性（防店家改壞格式，不檢查具體價格數字）', () => {
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

  it('選單外部連結（首頁/購物站/蝦皮）各有 label 與 url', () => {
    for (const key of ['home', 'shop', 'shopee']) {
      const link = pricing.links[key]
      expect(typeof link.label).toBe('string')
      expect(link.label.length).toBeGreaterThan(0)
      expect(typeof link.url).toBe('string')
      expect(link.url.length).toBeGreaterThan(0)
    }
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
