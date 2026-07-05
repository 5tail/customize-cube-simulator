# 07 交接檔（每個 session 結束前必須更新）

> 這是 session 之間唯一的記憶。格式固定如下，最新的寫最上面，只留最近 3 個 session（更舊的移到 docs/handoff-archive.md）。

---

## Session 3 — 2026-07-05（首個 Code 網頁版 session：骨架重建＋圖片上傳貼面）

**做了什麼（第二部分：Phase 1 子任務 2「圖片上傳貼面」）**：
- 骨架 PR #1 已 merge，使用者親自驗收 Pages 網址通過（3D 方塊可順暢旋轉）。
- docs/03 模型名稱不符 → 使用者決定**先不動**（Fable 5 僅短期可用，之後再說）。
- 新增 `src/faceImages.js`（檔案驗證純函式：jpg/png、≤5MB）＋ `getFaceTile`（cubeGeometry.js，九宮格對應，依 three.js BoxGeometry UV 方向推導）。
- `App.jsx` 加左上控制面板：六面各自選圖/換圖/清除、縮圖預覽、中文錯誤訊息；手機版面板貼底部（原生 CSS，App.css）。
- `RubiksCube.jsx`：每面圖片切九宮格貼到 9 格貼紙（texture clone + offset/repeat），沒圖的面維持素色。
- 測試從 6 條增至 16 條（驗證邏輯＋九宮格對應的完整覆蓋）。
- **踩坑（已解）**：材質從無貼圖變有貼圖時 R3F 不會自動重編 shader，畫面一片灰白。解法：meshStandardMaterial 加 `key={map.uuid}` 強制重建材質。已在沙箱用 Playwright 實際上傳圖片截圖驗證六面方向全部正確。

**做了什麼（第一部分：重建 Phase 1 骨架）**：檢查發現 repo 只有制度文件、沒有程式碼，依 handoff 規格重建並開 PR：
- `package.json`（Vite + React 18 + three + @react-three/fiber + @react-three/drei + Vitest，全在 docs/02 白名單）
- `src/cubeGeometry.js` 純函式資料層（27 顆、傳統六色、內側深色）＋ `src/cubeGeometry.test.js` 6 條測試
- `src/RubiksCube.jsx`、`src/App.jsx`（OrbitControls 拖曳旋轉、關 pan）、`src/main.jsx`、`index.html`
- `vite.config.js`（`base: './'` Pages 子路徑相容）
- `.github/workflows/deploy.yml`（push main → 測試 → 建置 → 部署 Pages；PR 只測不部署）
- `.gitignore`

**目前狀態**：
- 骨架（PR #1）：已 merge、Pages 部署成功、使用者驗收通過。✅
- 圖片上傳貼面（PR #2）：已 merge，使用者在 Pages 上驗收通過。✅
- 檔案上限調整：使用者驗收後要求 5MB → **8MB**，已改（faceImages.js 常數＋docs/01/02 同步，Supabase 容量估算改為約 20–30 筆訂單）。
- 圓角方塊：使用者要求柔化 12 條外圍邊線。已實作 `src/roundedBoxGeometry.js`（自製、保留六面材質分組、零新依賴）＋ 4 條測試。**圓角半徑使用者定案 0.08**（三選一選了中等）；縫隙顏色使用者定案**淺灰 #cfcfcf**（原黑色，改 INNER_COLOR 常數）。
- 縫隙寬度：使用者要求「很近很近」→ **CUBIE_SIZE 0.95 → 0.985**（縫 0.015）。實測 0.995 與 0.985 視覺幾乎無差——剩餘縫寬主要來自 0.08 圓角形成的凹槽；若使用者還嫌寬，下一步是降圓角半徑（例 0.05），不是再縮縫。`?size=`、`?radius=` 網址參數保留供即時微調。
- **踩坑（已解）**：drei 的 `<RoundedBox>` 幾何不保留 BoxGeometry 的六面材質分組，六面各自上色/貼圖會全部亂掉（整顆變黑）。解法：自寫圓角幾何（clamp+外推標準演算法，見 roundedBoxGeometry.js 註解）。
- 縫隙縮窄（PR #5）：已 merge，使用者驗收通過。✅
- **圖片縮放/位移裁切＋網站更名（PR #6）**：已 merge。✅
  - 純函式 `computeCropWindow`／`getTileTransform`（faceImages.js）：預設 cover 式正方形裁切（**長方形照片不再拉伸變形**）；縮放 1–3 倍、左右/上下位移。UI 每面三滑桿。
  - 效能設計：換圖才重載貼圖與重建 9 格 clone；拉滑桿只改 offset/repeat（uniform），不重傳 GPU。測試 21 → 29 條。
  - 網站定名 **「小丸號客製方塊模擬器」**：index.html 分頁標題、App.jsx 畫面大標。
- **全環境更名（本次）**：把人可讀的專案名稱統一為「小丸號客製方塊模擬器」——CLAUDE.md 標題、docs/01 標題（保留描述副標）、README 說明句。**技術識別名 `customize-cube-simulator`（package.json/package-lock.json name、repo 名、Pages 網址）刻意不動**：ASCII slug 不能放中文，且與 repo／Pages 網址綁定，改了無益有風險。
- bundle 975KB（three.js 本體大），沿用 Session 1 判斷暫不處理。
- docs/03 模型名稱與實際環境（claude-fable-5）不符：使用者已決定**先不動**。

- 全環境更名（PR #7）：已 merge。✅
- **圖片旋轉調整（本次，使用者新增需求）**：每面第 4 支滑桿「旋轉」±180°（顯示度數），用途＝六面拼接圖片對位。
  - 實作：`computeTileMatrix`（faceImages.js）直接算整個 UV 矩陣（`texture.matrixAutoUpdate = false` + 手寫 Matrix3），**像素空間繞視窗中心旋轉**——長方形圖任意角度不歪斜。測試 29 → 34 條。
  - 已 Playwright 驗證：+90 順時針、−90 逆時針、橫圖轉 90 不變形。
  - 已知小限制：轉非 90 倍數角度時，正方形視窗的四個角會取樣到視窗外（ClampToEdge 邊緣延伸）；客人稍微加點縮放即可避開。列入驗收說明，不另處理。
- **規格更新（使用者 2026-07-05 書面同意）**：docs/01 Phase 1 加「旋轉 ±180°」與「打亂/復原（展示用）」；Phase 2 送件內容定案＝六面原圖＋各面設定＋最終模擬截圖（方塊以整齊狀態截圖）。

- **打亂/復原（本次）**：完成。
  - `src/cubeState.js` 純函式引擎：27 顆 {pos, quat} 狀態、applyMove 單層 90 度轉、randomScramble（18 步、不出現立即回轉步）；12 條測試（4 次同步回整齊、位置恆為 27 格排列、核心不動等）。測試共 46 條全綠。
  - 動畫：useFrame 逐幀轉當前層（~0.17 秒/步），完成一步才寫回邏輯狀態；打亂中按鈕 disabled 顯示「打亂中…」；復原＝清佇列＋瞬間回整齊。貼圖跟著小方塊走（Playwright 截圖驗證：打亂中/打亂後/復原三態正確）。
  - 注意：`-0` 陷阱（0 乘負數）已在 rotatePos 處理並有測試。
- **路線大改（使用者 2026-07-05 書面定案）**：**不做站內送件**。客人「一鍵截圖＋自行傳圖檔給店家」。原 Phase 2–4（Supabase/Resend 送件、店家後台、分享頁）整包暫緩，docs/01 已改（新 Phase 2 = 一鍵截圖＋費用試算）。

- **新 Phase 2 完成（本次）：一鍵截圖＋費用試算**。
  - `src/pricing.json`：12 個數量級距（1→$420 … 5000→$60）＋3 個勾選選項（紙盒+5／塑膠盒+8／潤滑+10，紙盒與塑膠盒設 exclusiveGroup 互斥）。店家改價=GitHub 網頁改這個檔（README 已加 30 秒教學；測試含級距遞增遞減的健全性檢查，改壞會紅燈擋住）。
  - `src/quote.js` 純函式：findTier/nextTier/computeQuote/toggleOption；測試 28 條（含 17 個級距邊界）。總測試 74 條全綠。
  - UI：面板下方「訂做費用試算」：數量輸入＋勾選項＋單價/總計＋「滿 N 顆降價」提示。
  - 一鍵截圖：「截圖下載」按鈕（Canvas 開 `preserveDrawingBuffer: true`），canvas.toBlob → 下載「小丸號方塊模擬_日期.png」，內容=純 3D 畫面。
  - 注意：無頭測試瀏覽器回報的下載檔名固定為 "download"（對照組已證實是環境限制），真實瀏覽器檔名正常。

**下一步**：
1. 使用者 merge 本 PR → Pages 驗收（試算數字、勾選互斥、截圖下載）。
2. **全案總驗收**：手機操作一輪（視角、選圖、四滑桿、打亂復原、試算、截圖）。全過＝**目前規格的功能全部完工**。
3. 之後只剩維護與微調；若日後訂單量大要重啟站內送件（Supabase/Resend），規格見 docs/01「已暫緩」區。

**未解問題 / 待使用者決定**：
- Supabase / Resend 帳號（Phase 2 才需要）。

**本次教訓**：R3F 材質後掛貼圖不會自動重編 shader（見上方踩坑），已用 key 重建法解決；此模式已可套用到之後所有動態換圖功能。沙箱 Playwright 截圖驗證非常有用，單元測試驗不出的視覺問題（貼圖方向、shader 沒重編）都靠它抓到。

---

## Session 2 — 2026-07-05（工作模式切換：改用 Claude Code 網頁版）

**做了什麼**：使用者（Pro 方案）決定把預設工作環境從 claude.ai 對話介面改為 **Claude Code 網頁版**（claude.ai/code，雲端沙箱，不碰本機）。經使用者同意重寫 docs/03（Code 網頁版為 A 節預設、chat 為 B 節備援）與 README（設定與日常流程改為 PR 工作流）。CLAUDE.md 刻意不動（防肥大）。

**目前狀態**：
- Session 1 產出的骨架程式碼（方塊＋測試＋deploy.yml）在模型端已實測全綠，但**可能尚未進 repo**——使用者當時尚未回報上傳與驗收結果。
- CI 綠燈、Pages 網址：**均未確認**。
- 純 GitHub 流程備忘（沿用）：使用者不用本機；repo 需 Public；Pages Source 選 GitHub Actions。
- 備份規則調整：純 GitHub 流程下 git 歷史即備份，不再要求 .bak（已寫入 docs/03 A-8）；「刪除前先問」不變。

**下一步（給下個 session，應該已是 Code 網頁版環境）**：
1. **先檢查 repo 裡有沒有程式碼**（package.json、src/、.github/workflows/deploy.yml）：
   - 若有 → 驗證：沙箱跑 `npm ci && npm test && npm run build`，然後確認 Actions 綠燈與 Pages 網址。
   - 若無 → 依下方規格重建 Phase 1 骨架（Session 1 已驗證過此設計可行）：
     - Vite + React 18 + three + @react-three/fiber + drei + Vitest（全在 docs/02 白名單）。
     - `src/cubeGeometry.js` 純函式資料層：27 顆小方塊、傳統六色、內側深色；`src/cubeGeometry.test.js` 至少 5 條測試（27 顆、核心 0 面、角塊 3 面、面中心 1 面、總貼紙 54）。
     - `src/RubiksCube.jsx` + `src/App.jsx`（OrbitControls 拖曳旋轉、關 pan）+ `src/main.jsx` + `index.html`。
     - `vite.config.js` 必須 `base: './'`（Pages 子路徑相容）。
     - `.github/workflows/deploy.yml`：push main → 測試 → 建置 → 部署 Pages（actions/upload-pages-artifact + deploy-pages；permissions: pages/id-token）；pull_request 只測不部署。
     - 沙箱實跑 test/build 全綠才開 PR；handoff 更新（Session 3）包含在同一 PR。
   - ⚠️ 已知風險：GitHub App 權限可能擋 PR 內的 workflow 檔。若 push 被拒，PR 先不含 deploy.yml，改在 PR 描述附上完整內容，請使用者用 GitHub 網頁「Create new file」貼到 `.github/workflows/deploy.yml`。
2. 首次 Code session 順便執行 docs/06 環境核對清單第 1 項（核對可用模型名稱），發現 docs/03 寫錯就提案修正（要先問使用者）。
3. 骨架驗收全過後，下個子任務：Phase 1 圖片上傳貼面（jpg/png ≤5MB、六面各自可不同圖、純瀏覽器端）。

**未解問題 / 待使用者決定**：
- repo 是否已建立、制度檔案與程式碼是否已上傳（見上方檢查步驟）。
- Supabase / Resend 帳號（Phase 2 才需要）。

**本次教訓**：無踩坑。流程變更已落檔於 docs/03、README。

---

## Session 1 — 2026-07-04（Phase 1 子任務 1：骨架＋素色方塊＋CI＋Pages 部署，純 GitHub 流程）

**做了什麼**：建立 Vite + React 18 + three.js（@react-three/fiber + drei）骨架；可拖曳旋轉的素色 3x3 方塊（27 顆、傳統六色）；Vitest 測試 5 條（src/cubeGeometry.test.js）。使用者中途要求「不在本機跑、一切只在 GitHub 上」，因此把 GitHub Pages 部署提前併入：單一 workflow（.github/workflows/deploy.yml）＝ push 後測試 → 建置 → 自動部署。操作步驟改為 GitHub 網頁版。

**目前狀態**：模型端實測 `npm test` 5/5 綠、`npm run build` 成功；CI 綠燈與 Pages 網址待使用者操作後確認；bundle 約 975KB（three.js 本體大），暫不處理。

**下一步**：（已由 Session 2 接手改寫，見上方。）

**本次教訓**：無踩坑；「使用者不用本機」已成永久流程約束。

---

（下個 session 從這裡往上加新區塊；Session 0 已封存至 docs/handoff-archive.md）
