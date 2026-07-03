# CLAUDE.md — 客製化魔術方塊模擬網站

每個 session 開工前先讀：**本檔 → docs/07-handoff.md（目前進度）**。其餘檔案按需要查。

## 專案一句話
客人上網把圖片貼到 3D 魔術方塊預覽並送出訂製，店家收通知、建檔、報價，可產生臨時分享連結。公開網站。詳細規格：docs/01。

## 鐵律（違反任何一條 = 這個 session 白做）
1. 密鑰絕不進程式碼、絕不 commit。放 GitHub Secrets 或 Supabase 環境變數。
2. 刪除任何東西之前先問使用者（docs/04 R3）。
3. 改既有檔案先備份；長內容寫新檔，不塞進本檔。
4. 完成的定義是 docs/04 R2 五項全過，不是「應該可以動」。
5. 技術只用 docs/02 白名單；名單外先問。
6. Session 結束前更新 docs/07-handoff.md，否則工作等於沒發生。

## 文件路由
| 要做的事 | 讀哪份 |
|---|---|
| 了解現在做到哪 | docs/07-handoff.md |
| 功能該不該做、做到什麼程度 | docs/01-project-spec.md |
| 技術選型、環境變數、repo 結構 | docs/02-architecture.md |
| 用哪個模型、何時換對話、怎麼派工 | docs/03-model-dispatch.md |
| 卡住了/該不該問使用者/算不算完成 | docs/04-judgment-rubrics.md |
| 開新任務要貼的模板 | docs/05-prompt-templates.md |
| 想改制度檔案本身 | docs/06-maintenance.md |
| 踩坑了 | 寫進 docs/09-lessons.md（格式在 docs/06） |
| 為什麼有這些規則 | docs/00-diagnosis.md、docs/08-letter.md |

## 使用者
一位，程式程度 C 級（讀得懂簡單程式碼）。對他說話用白話中文；交付必附人工驗收三步驟；品味問題給選項不給獨斷。
