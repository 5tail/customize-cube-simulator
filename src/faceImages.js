// 圖片上傳的純函式層：檔案驗證與面的中文標籤。
// 不碰 DOM、不碰 three.js，方便用 Vitest 直接測。

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB（docs/01 Phase 1 規格）

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
    return { ok: false, error: '檔案過大，上限 5MB' }
  }
  return { ok: true }
}
