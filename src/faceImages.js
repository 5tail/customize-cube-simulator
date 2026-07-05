// 圖片上傳的純函式層：檔案驗證與面的中文標籤。
// 不碰 DOM、不碰 three.js，方便用 Vitest 直接測。

export const MAX_FILE_SIZE_MB = 8 // 使用者 2026-07-05 決定由 5MB 調高（docs/01 已同步）
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024

export const ALLOWED_TYPES = ['image/jpeg', 'image/png']

// 給 UI 用的面標籤，順序＝面板顯示順序
export const FACE_LABELS = {
  front: '前面（綠）',
  back: '後面（藍）',
  up: '上面（白）',
  down: '下面（黃）',
  right: '右面（紅）',
  left: '左面（橘）',
}

/** 縮放滑桿的範圍 */
export const MIN_SCALE = 1
export const MAX_SCALE = 3

/**
 * 算出某一面要顯示圖片的哪個範圍（UV 視窗，0–1 座標）。
 *
 * 預設（scale=1、pan 置中）＝「cover 式正方形裁切」：取圖片置中的最大
 * 正方形貼滿整面，長方形照片不會被拉伸變形。
 * scale 再往上是進一步放大；panX/panY ∈ [0,1] 是視窗在可移動餘裕內的
 * 位置（0.5 = 置中）。v 軸方向：panY 越大視窗越靠圖片上緣。
 */
export function computeCropWindow(imgW, imgH, scale = 1, panX = 0.5, panY = 0.5) {
  const s = Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE)
  const side = Math.min(imgW, imgH)
  const w = side / imgW / s
  const h = side / imgH / s
  const x = (1 - w) * Math.min(Math.max(panX, 0), 1)
  const y = (1 - h) * Math.min(Math.max(panY, 0), 1)
  return { x, y, w, h }
}

/**
 * 把面的 UV 視窗拆給九宮格的某一格，回傳該格貼圖的 offset/repeat。
 * tile 來自 cubeGeometry 的 getFaceTile（col/row ∈ 0–2，左下為 0,0）。
 */
export function getTileTransform(window, tile) {
  return {
    repeatX: window.w / 3,
    repeatY: window.h / 3,
    offsetX: window.x + (tile.col * window.w) / 3,
    offsetY: window.y + (tile.row * window.h) / 3,
  }
}

/**
 * 驗證上傳檔案。只看 type 與 size，兩者瀏覽器的 File 物件都有。
 * 回傳 { ok: true } 或 { ok: false, error: '中文錯誤訊息' }
 */
export function validateImageFile(file) {
  if (!file || typeof file.type !== 'string' || typeof file.size !== 'number') {
    return { ok: false, error: '無法讀取這個檔案' }
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: '只支援 jpg 或 png 圖片' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: `檔案過大，上限 ${MAX_FILE_SIZE_MB}MB` }
  }
  return { ok: true }
}
