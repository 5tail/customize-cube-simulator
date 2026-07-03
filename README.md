# 使用說明（給人看的，先讀這份）

這一包是「制度檔案」：讓 Sonnet / Opus 等模型在沒有更強模型的情況下，也能穩定地把魔術方塊模擬網站寫出來、運作、維護。程式碼還沒開始寫——這包是開工前的地基。

## 這包裡有什麼

```
CLAUDE.md                    ← 模型的入口，每個 session 先讀這個
README.md                    ← 本檔，給你看的
docs/00-diagnosis.md         ← 為什麼需要這些規則（三大風險）
docs/01-project-spec.md      ← 專案規格與分期（Phase 1–4）
docs/02-architecture.md      ← 技術選型與白名單
docs/03-model-dispatch.md    ← 模型調度：何時 Sonnet、何時 Opus、何時開新對話
docs/04-judgment-rubrics.md  ← 五個關鍵判斷的查表規則
docs/05-prompt-templates.md  ← 五種任務模板（開新任務就從這裡複製）
docs/06-maintenance.md       ← 這套制度本身怎麼更新
docs/07-handoff.md           ← 交接檔：session 之間唯一的記憶
docs/08-letter.md            ← 給未來 session 的信（重要背景與退化預防）
docs/09-lessons.md           ← 教訓紀錄（目前是空的）
```

## 第一次使用（一次性設定，約 15 分鐘）

1. 在 GitHub 開一個新 repo（建議先設 **Private**，等 Phase 1 上線前再轉 Public——GitHub Pages 免費版需要 Public repo）。
2. 把這一包解壓縮，全部放進 repo 根目錄，commit、push。
3. 在 claude.ai 開一個 **Project**（專案），把 `CLAUDE.md` 和 `docs/` 全部檔案加進 Project knowledge（專案知識）。這樣每個新對話自動看得到制度。
4. 之後所有開發對話都開在這個 Project 裡面。

## 日常使用：三個時機

### 時機 1：開始一個新任務（最常用）
開新對話，貼這段開場引導語（存起來重複用）：

```
先讀 CLAUDE.md 與 docs/07-handoff.md，用三句話覆述目前進度與下一步，
確認和我認知一致後再開始。今天的任務在下面：
（接著貼上 docs/05 對應模板，填好空）
```

模型覆述的進度如果和你認知不符 → 先修 handoff，再開工。

### 時機 2：任務做完，驗收
模型交付時必須給你：CI 綠燈截圖或連結＋「人工驗收三步驟」。你照三步驟操作。
- 模型沒給這兩樣就說完成了 → 回它一句「**R2**」（它會去讀 docs/04 R2 補齊）。
- 想更保險（動到上傳、表單、登入的程式碼時建議必做）：開一個**全新對話**，貼 docs/05 的 **T5 審查模板**讓新腦袋挑毛病。

### 時機 3：session 收尾
對話要結束前跟模型說：「收尾：更新 handoff，把改好的檔案給我 commit。」
**沒更新 handoff 就關掉對話 = 這次的進度下個 session 不知道。** 這是整套制度最不能省的一步。

## 檔案怎麼從對話進到 GitHub（你的環境沒有自動同步）
模型產出檔案後，你有兩種方式，選順手的：
- **A（推薦，電腦上）**：模型給你可下載的檔案 → 你放進本機 repo 資料夾 → `git add -A && git commit -m "訊息" && git push`。
- **B（手機/通勤）**：GitHub 網頁或 App 上直接「Add file / Edit」貼上內容 commit。⚠️ 只用來新增模型給的完整檔案，不要自己手改程式碼（原因見 docs/08 第 2 件事）。

## 模型怎麼選（超簡版，細節在 docs/03）
- 平常一律 **Sonnet**。
- 模型自己說「建議換 Opus」時、或同一個問題 Sonnet 連錯兩次時 → 開新對話用 **Opus**，並把失敗經過一起貼給它。
- 一個對話只做一件事，做完就收尾換新的。對話開始鬼打牆就是該換的訊號。

## 什麼時候會需要你本人動手（模型做不到的事）
- 註冊 Supabase、Resend、Cloudflare 帳號（Phase 2 前，模型會給逐步指引）。
- 把密鑰貼進 GitHub Secrets / Supabase 設定（模型不經手密鑰）。
- 一切刪除、付費、帳號安全相關的最終確認。
