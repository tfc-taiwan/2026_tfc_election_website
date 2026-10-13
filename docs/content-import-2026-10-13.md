# 2026-10-13 試算表匯入與部署

來源為 `spreadsheet/README.md` 所列的 Google Sheet。本次以 Chrome 登入工作階段下載原始 Excel，原始試算表未修改。本機原始快照、正規化列資料、匯入前 JSON 及新增指南 Markdown 保留於 `generated/source-2026-10-13/`，不提交私人編輯連結。

本次輸出 `data/listings.json` 共 5 篇列表，保留既有 4 篇文章正文，新增 `data/reports/election-prepare.json`。新文章由試算表指定的 Google Docs 匯入，保留導言、5 個問答、粗體、清單與內文連結；封面取自同一文件的 DOCX 圖片。原文件未提供署名、編輯或更新日，分別標示「未提供」及 `null`，報告識別碼使用 slug，沒有推定日期或作者。

## 本機資料調整

- 略過文章列表第 7–14 列僅有順序、沒有文章內容的占位列。
- 封面裸檔名補成 `/images/covers/<檔名>`；新指南缺少色系採 `cyan`，「無」判定轉成不提供判定。
- 保留 3 篇既有文章的空白刊登日期，新增指南採試算表的 `2026-10-13`。
- 支援「選舉工具箱」分類，指南加入首頁學堂。
- 首頁保留 3 篇仍有效的報告，移除 13 筆失效文章／圖卡引用，將 `26-chinese-spouses` 加入報告首位。短影音 3 筆保留。
- 圖卡內容的 3 組（共 17 張）没有對應列表文章或本機圖片，暫不發布；核能組另有重複順序、大小寫 slug 及 `6png` 檔名問題，原始資料仍在下載快照。
- 首頁無公投報告及圖卡，移除指向這兩個空區塊的導覽連結；保留短影音與其他區塊。
- 保留試算表的 `isMock: true`、示範文字與 `noindex`，未視為編輯審核完成。

## GitHub Actions

`.github/workflows/deploy-worker.yml` 只由 `workflow_dispatch` 手動觸發，安裝固定鎖檔依賴、執行測試、預渲染及正式建置驗證，然後以專案鎖定的 Wrangler 同版發布 Worker 與 Static Assets。

目標帳號 `a1bad46d553cafed5f25a324dbc854d7`（Tfc.taiwan.org@gmail.com's Account），Worker `tfc-election2026`。僅掛載 `tfc-taiwan.org.tw/election2026` 與 `tfc-taiwan.org.tw/election2026/*`，不啟用 workers.dev，不取得根目錄。

需要 GitHub Actions secret `CLOUDFLARE_API_TOKEN` 與 variable `CLOUDFLARE_ACCOUNT_ID`。API token 應限制於此帳號的 Workers 部署與 `tfc-taiwan.org.tw` 的 Worker route 管理。Chrome 登入 Cloudflare 不會自動授權 GitHub Actions。
