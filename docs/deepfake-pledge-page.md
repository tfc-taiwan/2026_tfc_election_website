# 深偽倡議獨立頁

依使用者上傳的「1019深偽倡議區塊程式碼（code_artifact）.html」整合。首頁深偽專區新增倡議入口，使用既有文章路由 `/reports/deepfake-pledge`；部署後為 `/election2026/reports/deepfake-pledge`。

V11 後續調整：首頁倡議按鈕使用編輯提供的完整文章網址；案例每 2.5 秒自動切換，移除上一則、暫停、下一則控制。保留 noindex，不視為完成來源查證。

## 版型與資料

- src/InitiativePage.tsx：專頁元件，沿用網站導覽與頁尾，使用本機 CSS 及既有字型，不載入 Tailwind CDN，也不直接執行上傳 HTML 的 script。
- data/reports/deepfake-pledge.json：新增倡議文章；initiativeContent 保存三項呼籲、三不二要、13 則案例與選填 fullTextUrl。一般文章維持原版型。
- data/listings.json：新增 slug deepfake-pledge、類型 analysis、主題深偽倡議的一筆入口資料。專區按既有新版分類規則自動顯示。
- 案例每 2.5 秒自動切換，並提供展開全部案例供完整閱讀。首頁倡議按鈕讀取 `initiativeContent.fullTextUrl`，目前連到 `https://tfc-taiwan.org.tw/election2026/reject-deepfake-election-disinformation-self-regulation-charter`。
- 圖卡 lightbox 移除「開啟圖卡專頁」按鈕；手機可在圖卡上左右滑動切換。
- 「資訊怎麼查？」資源卡以應用程式內連結開啟「選舉訊息繁雜，三大正確資訊管道報你知」。
- 查核中心工作動態將「闢謠志工招募」改為「共同維護資訊生態」。

## 編輯方式

這篇是特殊版型，並非把 HTML 貼到 Google Docs 即會套用。它的入口標題、摘要及排列可由文章列表管理；本次特殊公約與案例內容目前由該篇 JSON 維護。其他深偽文章仍可使用原本的 Google Docs 上稿流程，並顯示一般文章版型。若用一般轉換器重新產生 deepfake-pledge.json，需保留 initiativeContent，否則會回到一般文章版型。

## 驗證

資料與匯入測試、正式預渲染與 SSR 檢查、Worker 建置。手機左右滑動與案例自動輪播由互動測試驗證。
