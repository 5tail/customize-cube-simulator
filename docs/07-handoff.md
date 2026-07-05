# 07 交接檔（每個 session 結束前必須更新）

> 這是 session 之間唯一的記憶。格式固定如下，最新的寫最上面，只留最近 3 個 session（更舊的移到 docs/handoff-archive.md）。

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

## Session 0 — 2026-07-03（制度建立，在 claude.ai 對話介面由 Fable 5 產生）

**做了什麼**：建立整套制度檔案（docs/00–09 ＋ CLAUDE.md ＋ README）。專案程式碼尚未開始。

**目前狀態**：架構定案（docs/02）、規格定案（docs/01）。

**下一步**：（已由 Session 1、2 接手，見上方。）

**未解問題**：Supabase / Resend 帳號（Phase 2 才需要）；網站名稱、網域未定（先用 Pages 預設網址）。

**本次教訓**：無（首個 session）。

---

（下個 session 從這裡往上加新區塊）
