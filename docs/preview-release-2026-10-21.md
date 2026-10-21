# 驗收網站更新：2026-10-21

本次將使用者確認的 v6 預覽整理至 React 與資料檔，不發布獨立 HTML、也不變更正式網域路由。

- 首頁深偽倡議由 listings.sections.initiative.content 渲染，保留原文章網址。
- 全站視覺與閱讀寬度調整；工具箱只顯示發布日期，保留自然文章段落、修復粗體標籤。
- 真實受害案例保留深色標籤、金色標題、紅燈與六秒輪播／向上滑入；可暫停與手動切換，滑鼠或鍵盤進入時暫停，減少動態偏好下不自動輪播。
- 補上 TFC 暫用 monogram favicon，未宣稱為正式識別。

驗證：30 項單元測試、9 項 SSR 測試、根路徑與 Worker 建置、離線 DOM 互動檢查。未完成實際手機與桌機視覺驗收。

發布只沿用 GitHub Actions 與 wrangler.preview.jsonc 的 workers.dev 驗收環境。保留 mock 與 noindex；正式網域仍需獨立授權。

資料維護：首頁倡議內容放在 listings，舊文章 initiativeContent 保留；修改時需同步兩者。Google Sheets settings 的 sections.initiative JSON 可保留此內容，原線上表格尚未更動，匯入前需同步。

回復：回退本次 PR 合併，重新執行原有預覽部署工作流。
