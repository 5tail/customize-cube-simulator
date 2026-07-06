# 使用說明（給人看的，先讀這份）

這一包是「制度檔案」：讓 Sonnet / Opus 等模型跨 session 穩定地把「小丸號客製方塊模擬器」寫出來、運作、維護。
**工作環境（2026-07-04 起）**：Claude Code 網頁版（claude.ai/code）為主，claude.ai 對話介面為備援。你不需要在自己電腦安裝任何東西。

## 這包裡有什麼

```
CLAUDE.md                    ← 模型的入口，每個 session 先讀這個
README.md                    ← 本檔，給你看的
docs/00-diagnosis.md         ← 為什麼需要這些規則（三大風險）
docs/01-project-spec.md      ← 專案規格與分期（Phase 1–4）
docs/02-architecture.md      ← 技術選型與白名單
docs/03-model-dispatch.md    ← 模型調度：Code 網頁版怎麼用、何時換模型
docs/04-judgment-rubrics.md  ← 五個關鍵判斷的查表規則
docs/05-prompt-templates.md  ← 五種任務模板（開新任務就從這裡複製）
docs/06-maintenance.md       ← 這套制度本身怎麼更新
docs/07-handoff.md           ← 交接檔：session 之間唯一的記憶
docs/08-letter.md            ← 給未來 session 的信
docs/09-lessons.md           ← 教訓紀錄
```

## 一次性設定（約 15 分鐘，全部在瀏覽器完成）

1. GitHub 開新 repo，設 **Public**（GitHub Pages 免費版限制；目前程式碼無任何密鑰，公開無虞）。
2. 用 repo 頁「Add file → Upload files」把這包制度檔案全部放進去，commit。
3. repo 的 **Settings → Pages** → Source 選「**GitHub Actions**」。
4. 開 claude.ai/code（手機 App 也有 Code 分頁）→ 依畫面指示**連接你的 GitHub 帳號**並授權這個 repo。
5. （沿用）claude.ai 的 Project 保留作備援；handoff 更新後記得同步一份到 Project knowledge。

## 日常使用：三個時機

### 時機 1：開始一個新任務（最常用）
在 claude.ai/code 對這個 repo 開新 session，貼開場引導語＋docs/05 對應模板：

```
先讀 CLAUDE.md 與 docs/07-handoff.md，用三句話覆述目前進度與下一步，
確認和我認知一致後再開始。今天的任務在下面：
（貼上 docs/05 模板，填好空）
```

覆述的進度和你認知不符 → 先修 handoff，再開工。

### 時機 2：任務做完，驗收
Claude Code 交付的是一個 **Pull Request**，PR 必須包含：程式碼＋更新過的 handoff＋人工驗收三步驟。
1. 看 PR 上的檢查是否綠色（Actions 會自動在 PR 上跑測試）。
2. 沒問題就按 **Merge**——merge 進 main 後會自動部署到 GitHub Pages。
3. 照 PR 裡的人工驗收三步驟操作（開網址、點按鈕、看畫面）。
- 交付訊息沒附「CI 綠燈＋人工驗收三步驟」→ 回一句「**R2**」。
- 動到上傳、表單、登入的程式碼 → merge 前開**全新 Code session** 貼 docs/05 T5 模板審這個 PR。

### 時機 3：session 收尾
handoff 更新應該已包含在 PR 裡（docs/03 A-4）。若 session 中途中斷沒開成 PR，對它說：「收尾：更新 handoff，開 PR。」

## 模型怎麼選（超簡版，細節在 docs/03）
- 平常一律 **Sonnet**。
- 模型自己建議換 Opus、或同一問題連錯兩次 → 開新 session 用 Opus（`/model` 切換），把失敗經過一起貼給它。
- 一個 session 只做一件事，做完收尾換新的。

## 改價錢（不用找模型，自己 30 秒搞定）

1. 開 repo 裡的 **`src/pricing.json`** → 點右上鉛筆（Edit）。
2. 改數字：`tiers` 是數量級距（`minQty` 顆以上適用 `unitPrice` 單價）；`options` 是加購選項（`perUnit`＝每顆加價，`label`＝畫面上顯示的字）。
3. 按 **Commit changes** → 約一分鐘後網站自動更新。
4. 只改數字和文字，不要動引號、逗號、括號；改壞了測試會紅燈擋下來，不會上線。
5. **客服連結**也在同一個檔案的 `contact` 區：`email` 是客服信箱、`lineUrl` 是 LINE 官方帳號的加好友網址（LINE Official Account 後台 → 加好友工具 → 網址）。
6. **選單連結**在同一個檔案的 `links` 區（`home`/`shop`/`shopee`）：`label` 是按鈕文字、`url` 是要連去的網址，改網址直接貼上即可。

## 什麼時候需要你本人動手（模型做不到的事）
- 按 Merge（每個 PR 都要你過目才進 main）。
- GitHub repo 設定（Public/Pages）、註冊 Supabase / Resend / Cloudflare 帳號（Phase 2 前）。
- 把密鑰貼進 GitHub Secrets / Supabase 設定（模型不經手密鑰）。
- 一切刪除、付費、帳號安全相關的最終確認。

## 備援模式（Code 網頁版用不了的時候）
回到 claude.ai 對話介面照舊派工；模型給完整檔案，你用 GitHub 網頁「Add file → Upload files」上傳。規則見 docs/03 B 節。
