# 2026 選舉專區系統架構

本文件是本儲存庫後續工作的技術基準。公開網址固定為 `https://tfc-taiwan.org.tw/election2026/`；首頁、列表及每篇文章都使用此前綴。原網站的其他路徑仍由原服務處理。本專案不取得網站根目錄、根目錄 `robots.txt` 或根目錄搜尋頁的控制權。

## 請求與發佈路徑

```text
讀者 → tfc-taiwan.org.tw/election2026/*
     → Cloudflare zone 的 Worker route
     → 選舉專區 Worker 的 Static Assets（預渲染 HTML、JS/CSS、JSON、圖片）

編輯 → Google Sheets / Docs → 本機 converter → data/listings.json + data/reports/*.json
     → npm run build:worker → worker-assets/election2026/*
     → 經審核後 wrangler deploy → Cloudflare
```

Worker 在同網域子路徑提供檔案，不讓瀏覽器跳到 `workers.dev`。部署設定在 `wrangler.jsonc`；`src/worker.ts` 只處理 `/election2026` 到尾斜線的標準化、允許 GET/HEAD，並交給 `ASSETS`。URL 外的請求不可落到本專案。需由具備 Cloudflare zone 權限的人確認網域在 Cloudflare 代理下、route 不與既有 Worker 衝突，才執行正式部署。

## 資料與頁面

- `data/listings.json`：首頁各區塊、卡片、導覽、SEO；`sections.infographics.items` 是圖卡組與每張圖的圖片、替代文字、說明，首頁預覽、lightbox 與圖卡專頁皆讀同一處。每張圖卡的穩定網址為 `/election2026/infographics/<slug>/<從 1 開始的張數>`，分享只使用專頁網址，不分享圖片檔網址。Web Share API 僅傳 `url`，避免系統「複製」把說明文字接在網址後面；Worker 將此前誤產生的連結轉回正確圖卡。
- `data/reports/<slug>.json`：每篇查核、解析或教學的完整正文與 SEO。一篇一檔，`slug` 與列表對應。
- React 依 JSON 渲染；建置時同一組元件預先產生每條文章網址的 HTML，讓首次請求、分享預覽、無 JavaScript 閱讀都可取得正文。
- 圖片放 `public/images/`；JSON 仍使用 `/images/...` 作為來源格式，呈現層將它轉換為部署前綴下的網址。
- 搜尋送回原網站：`GET https://tfc-taiwan.org.tw/?s=<關鍵字>`。本專區的地方選舉／公投按鈕只篩選本地列表。

## URL、SEO、快取

`npm run build:worker` 以 `/election2026/` 為 Vite base，設定正式 host 供 canonical、Open Graph、JSON-LD、sitemap 使用。主要路徑為 `/election2026/`、`/election2026/reports`、`/election2026/reports/<slug>`、`/election2026/infographics/<slug>/<張數>`；JSON 與圖片位於此前綴下。每張圖卡預先產生 HTML 與對應的 PNG 分享預覽圖，直接開啟及無 JavaScript 時仍顯示標題、圖像、說明、前後張與原文章連結。sitemap 放 `/election2026/sitemap.xml`，公開前需由原站的根目錄 sitemap 或 Search Console 納入；根目錄 `robots.txt` 由原站管理。未知頁面回 404，不能回首頁 200。當 `isMock` 或頁面 `seo.noindex` 為 true 時維持 noindex，sitemap 不列入示範頁。

Cloudflare Static Assets 與 Worker 同版發佈。更新 `data/` 時先執行 converter，再執行 `npm run build:worker`（若僅編輯 JSON，仍須重產 HTML、JSON 與發佈資產），驗證輸出後才 `npm run deploy:worker`。部署成功、路由啟用、正式內容發布是不同狀態；建置完成不代表網站更新。帶雜湊的 JS/CSS 可長期快取，HTML/JSON 應重新驗證。回滾透過 Cloudflare Worker 版本與原始碼修訂，不直接在 Cloudflare 改內容。

### GitHub Actions 驗收部署

測試與正式發佈使用兩個獨立 Worker：

| 用途 | Worker | 網址 | 建置指令 |
| --- | --- | --- | --- |
| 測試 | `tfc-election2026-preview` | `https://tfc-election2026-preview.tfc-taiwan-org.workers.dev/election2026/` | `npm run build:worker:preview` |
| 正式 | `tfc-election2026` | `https://tfc-taiwan.org.tw/election2026/` | `npm run build:worker:production` |

`.github/workflows/deploy-worker.yml` 在 PR 執行資料測試、根路徑建置與 SSR 測試；推送 `main`、`review/v10-infographic-galleries` 或 `review/v11-local-preview` 時，檢查通過後以 preview profile 建置並部署至 `wrangler.preview.jsonc`。測試 Worker 沒有正式網域路由、保留測試提示，所有頁面的 robots meta 與 Worker HTTP header 都是 noindex；即使頁面已獲准正式發布，測試站也不會開放索引。

`.github/workflows/deploy-election2026-production.yml` 只在推送 `deploy/2026-election-v11` 時執行，以 production profile 建置，再使用 `wrangler.jsonc` 發佈既有正式 Worker 與 `/election2026` 路由。正式版不顯示測試提示；已核准文章為 `isMock: false`、可索引文章為 `seo.noindex: false`。舊版 `deepfake-pledge` 摘要頁保留 noindex 避免與完整公約文章重複；搜尋、錯誤、原始 JSON 等頁面仍不索引。

兩個流程保留目前已可用的 GitHub `preview` environment 作為部署憑證來源；這個 environment 名稱不決定部署到哪個 Worker。Worker 由各自的 Wrangler 設定決定。正式憑證仍須具有既有 TFC zone Worker route 的權限；測試部署不需要更改正式路由。

每次 Worker 建置會執行 `scripts/verify-release-build.mjs <profile>`，檢查 Worker 不共用、測試無正式 routes、各 profile 的提示與索引設定。每次部署後執行 `scripts/verify-deployment.mjs <origin> <profile>`，確認遠端列表與每篇完整文章 JSON 都與該修訂完全一致，並檢查首頁、列表、文章、封面與 404。準備正式發布設定不等於已正式部署；正式發佈仍需使用者明確授權。

## 本機與驗收

`npm run dev` 與 `npm run preview` 仍可在根路徑本機預覽；正式前綴用 `npm run build:worker` 產物與 `npm run preview:worker` 驗證。每次結構性改動至少檢查首頁、列表、直接開啟一篇文章、無 JS 正文、JSON／圖片網址、404、SEO，以及 320／390／834／1440 px。圖卡 lightbox 要檢查開關、上一張／下一張、鍵盤 Escape 與方向鍵、焦點回復、手機溢出。搜尋要確認瀏覽器送往原站 `s` 參數。

目前提供的文章與圖卡已依使用者的正式發布準備指示移除示範旗標。未來新增虛構／測試素材時仍須使用 `isMock: true` 並維持 noindex，不得以正式 profile 自動覆蓋其編輯狀態。
