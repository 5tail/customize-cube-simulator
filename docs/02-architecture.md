# 02 架構決策與技術白名單

> 這份是技術選型的邊界。**白名單外的任何框架、雲服務、重大依賴，加入前必須先問使用者**，並在得到同意後把它寫進本檔再動工。修改本檔需使用者同意。

## 全景（三個服務，全部免費層）

```
[客人瀏覽器]
     │
     ▼
GitHub Pages  ←── GitHub Actions 自動建置部署 ←── GitHub repo（唯一程式碼與文件落腳點）
（靜態前端：Vite + React + Three.js）
     │  透過 Supabase JS SDK / Edge Function 呼叫
     ▼
Supabase（資料庫 Postgres + 圖片 Storage + Edge Functions + 店家登入 Auth）
     │
     ▼
Resend（寄 email 通知店家與客人）
```

## 白名單（可以直接用，不必再問）

| 用途 | 選擇 | 理由 |
|---|---|---|
| 前端建置 | Vite | 設定少、文件多 |
| UI | React 18 + 原生 CSS（或 CSS Modules） | 訓練資料最多，弱模型最不會寫錯 |
| 3D | three.js + @react-three/fiber + @react-three/drei | 方塊貼圖的標準解法 |
| 後端 | Supabase（免費層） | 不用自己寫伺服器；DB/Storage/Auth/Edge Functions 一站搞定 |
| Email | Resend（免費層，100 封/天） | API 簡單 |
| 防機器人 | Cloudflare Turnstile（免費） | 免費、無廣告、有官方 React 元件 |
| 部署 | GitHub Pages + GitHub Actions | 使用者首選 GitHub；push 即部署 |
| 測試 | Vitest（單元）＋ GitHub Actions 跑建置 | 紅綠燈驗證，見 docs/00 洞 2 |

## 明確禁止（弱模型常見的手癢方向）
- 不自架伺服器、不用 Docker/Kubernetes、不租 VPS。
- 不換框架（不用 Next.js/Vue/Svelte/Tailwind——不是它們不好，是「換」的成本與風險不值得）。
- 不引入 ORM（直接用 Supabase SDK）。
- 不用付費服務。若免費額度真的不夠，停下來問使用者，附額度數據。
- `npm install` 任何白名單外的套件前，先問使用者並說明：做什麼用、多大、有無更簡單的原生做法。

## 已知的免費層限制（誠實揭露，決策時要考慮）
- **Supabase 免費層：專案閒置約 1 週會自動暫停**，需手動喚醒。緩解：GitHub Actions 排程每 3 天 ping 一次資料庫（Phase 2 時實作，keep-alive workflow）。
- Supabase 免費層約 500MB 資料庫 / 1GB Storage。圖片 8MB×6 面×訂單量，1GB 大約撐 20–30 筆完整訂單（2026-07-05 上限由 5MB 調高至 8MB 後的估算）。緩解：已完成/取消超過 90 天的訂單圖片可清理（Phase 3 後台加一顆清理按鈕，刪除前列清單讓店家確認）。
- Resend 免費層 100 封/天，對這個量級足夠。
- GitHub Pages 是公開靜態站，**前端程式碼人人看得到**：所以任何密鑰不能出現在前端；Supabase anon key 可以公開（這是設計如此），但 RLS 必須開好。

## 環境變數清單（Phase 2 起）
| 名稱 | 放哪 | 用途 |
|---|---|---|
| VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY | GitHub Secrets → 建置時注入 | 前端連 Supabase（anon key 可公開） |
| SUPABASE_SERVICE_ROLE_KEY | 只放 Supabase Edge Function 環境變數 | 後端特權操作，**絕不進前端與 repo** |
| RESEND_API_KEY | 只放 Supabase Edge Function 環境變數 | 寄信 |
| TURNSTILE_SECRET_KEY | 只放 Supabase Edge Function 環境變數 | 驗證人機 |

## Repo 結構約定
```
/                 CLAUDE.md、README、設定檔
/docs             本制度全部文件（00–08）＋ handoff
/src              前端程式碼
/supabase         資料表 SQL migrations、Edge Functions 原始碼
/.github/workflows  CI 與部署
```
