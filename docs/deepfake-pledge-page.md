# 深偽倡議獨立頁

依使用者上傳的「1019深偽倡議區塊程式碼（code_artifact）.html」整合。首頁深偽專區新增倡議入口，使用既有文章路由 `/reports/deepfake-pledge`；部署後為 `/election2026/reports/deepfake-pledge`。

本次沒有發布、推送 GitHub 或修改 Google 試算表。案例與倡議文字沿用來稿，保留預覽／待編輯確認及 noindex，不視為完成來源查證。

## 版型與資料

- src/InitiativePage.tsx：專頁元件，沿用網站導覽與頁尾，使用本機 CSS 及既有字型，不載入 Tailwind CDN，也不直接執行上傳 HTML 的 script。
- data/reports/deepfake-pledge.json：新增倡議文章；initiativeContent 保存三項呼籲、三不二要、13 則案例與選填 fullTextUrl。一般文章維持原版型。
- data/listings.json：新增 slug deepfake-pledge、類型 analysis、主題深偽倡議的一筆入口資料。專區按既有新版分類規則自動顯示。
- 案例每六秒切換，支援上一則、下一則、暫停。滑鼠停留或鍵盤焦點進入時暫停，尊重減少動態偏好，並提供展開全部案例供完整閱讀。
- 原檔的「瀏覽完整倡議全文」連結只有 #，因此先不顯示該按鈕。填入 initiativeContent.fullTextUrl 的正式 HTTPS 網址後才會出現。

## 編輯方式

這篇是特殊版型，並非把 HTML 貼到 Google Docs 即會套用。它的入口標題、摘要及排列可由文章列表管理；本次特殊公約與案例內容目前由該篇 JSON 維護。其他深偽文章仍可使用原本的 Google Docs 上稿流程，並顯示一般文章版型。若用一般轉換器重新產生 deepfake-pledge.json，需保留 initiativeContent，否則會回到一般文章版型。

## 驗證

資料與匯入測試、正式預渲染與 SSR 檢查、Worker 建置。額外以本機檔案的 DOM 模擬確認首頁點入、13 則案例、上一則／下一則、暫停及無空連結。DOM 模擬不等於瀏覽器視覺驗收，實際手機與桌面畫面仍待確認。
