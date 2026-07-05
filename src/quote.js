// 費用試算的純函式層：不碰 React、不碰 DOM，計價規則全部來自 pricing.json。

/** 找出數量適用的級距（minQty ≤ qty 中最大的那個） */
export function findTier(tiers, qty) {
  let best = tiers[0]
  for (const t of tiers) {
    if (qty >= t.minQty && t.minQty >= best.minQty) best = t
  }
  return best
}

/** 下一個更便宜的級距（提示「滿 N 顆單價降為 $M」用），沒有則回傳 null */
export function nextTier(tiers, qty) {
  let next = null
  for (const t of tiers) {
    if (t.minQty > qty && (next === null || t.minQty < next.minQty)) next = t
  }
  return next
}

/**
 * 試算報價。
 * @param pricing pricing.json 的內容
 * @param qty 數量（非法輸入一律當 1）
 * @param selectedIds 已勾選的加購選項 id 陣列
 */
export function computeQuote(pricing, qty, selectedIds = []) {
  const q = Number.isFinite(qty) && qty >= 1 ? Math.floor(qty) : 1
  const tier = findTier(pricing.tiers, q)
  const selected = pricing.options.filter((o) => selectedIds.includes(o.id))
  const optionsPerUnit = selected.reduce((sum, o) => sum + o.perUnit, 0)
  const perUnit = tier.unitPrice + optionsPerUnit
  return {
    qty: q,
    tier,
    optionsPerUnit,
    perUnit,
    total: perUnit * q,
    next: nextTier(pricing.tiers, q),
  }
}

/**
 * 勾選/取消一個選項，處理互斥群組（同 exclusiveGroup 只能留一個）。
 * 回傳新的已選 id 陣列。
 */
export function toggleOption(options, selectedIds, id) {
  if (selectedIds.includes(id)) return selectedIds.filter((s) => s !== id)
  const target = options.find((o) => o.id === id)
  if (!target) return selectedIds
  const kept = target.exclusiveGroup
    ? selectedIds.filter((s) => {
        const o = options.find((x) => x.id === s)
        return !o || o.exclusiveGroup !== target.exclusiveGroup
      })
    : [...selectedIds]
  return [...kept, id]
}
