# 2026 選舉工具箱

依據設計稿實作的 React + TypeScript + Vite 選舉專區。公開網址規劃為 `https://tfc-taiwan.org.tw/election2026/`，由 Cloudflare Worker 與 Static Assets 在原網站子路徑提供。架構與後續工作規則見 [系統架構](docs/architecture.md) 與 [AGENTS.md](AGENTS.md)。目前仍是虛構示範資料，尚未正式部署。

## 啟動

需要 Node.js 22.18 以上與 npm。

```bash
npm ci
npm run dev
```

開啟終端機顯示的本機網址（預設 `http://127.0.0.1:5173`）。

```bash
npm run build            # 分享圖、型別檢查、前後端建置、靜態 HTML、sitemap 與 robots
npm run preview          # 正式版 SSR 預覽，預設 http://127.0.0.1:4173
npm run build:worker     # 建置 /election2026/ 前綴並封裝 Cloudflare Worker 靜態資產
npm run preview:worker   # 本機預覽 Worker，開啟 http://127.0.0.1:8787/election2026/
npm test                 # JSON、日期、搜尋、SEO、索引及跳脫處理
npm run test:e2e         # Chrome：RWD、互動、SEO 換頁及停用 JavaScript 測試
npm run test:e2e:production # 對正式建置重跑相同瀏覽器測試，先執行 build
npm run test:production  # 先 build，再驗證正式伺服器、即時 JSON、404／503 與靜態頁面
```

瀏覽器測試涵蓋 320、390、834、1440 px，並將首頁及文章截圖存入 `test-results/`。若環境未安裝 Google Chrome，可安裝 Chrome，或在 `playwright.config.ts` 移除 `channel: 'chrome'` 並安裝 Playwright Chromium。

## 頁面

- `/election2026/`：首頁全部內容區塊。
- `/election2026/reports`：完整查核報告列表，可篩選地方選舉／公投。
- `/election2026/reports/ai-voice`：獨立報告網址，可直接開啟、重新整理、分享與列印。
- 頂部及列表搜尋表單送到原網站 `https://tfc-taiwan.org.tw/?s=關鍵字`。舊版 `/reports?q=` 仍能顯示本地篩選結果，供既有連結相容。
- 未知路徑、遺失 JSON、網路錯誤均有對應畫面；網路錯誤可重試。

## 資料維護

可透過 Google Sheets 管理首頁與列表，透過 Google Docs 編輯每篇文章，下載 Excel 與 Markdown 後，使用本機 converter 產生 JSON，不需要 Apps Script 或 GCP OAuth。已有 13 篇連結文件及完整 mockdata；詳見 [試算表與 Docs 操作說明](spreadsheet/README.md)。

所有首頁列表集中在 **`data/listings.json`**；文章內容存於 **`data/reports/<slug>.json`**，一篇一檔。建置時直接從 JSON 產生正文與 metadata，瀏覽器接手互動後也從部署前綴下的 `data/` 取得資料；編輯內容不寫在 React 元件裡。

```text
data/
  listings.json             # 網站設定、導讀、全部卡片摘要及各區塊列表
  reports/
    ai-voice.json           # 每篇完整文章
    ballot-paper.json
    ...
public/
  images/                   # 本機示意插圖，也可放 JPG / PNG / WebP
src/
  data.ts                   # JSON 格式檢查與型別
  main.tsx                  # 應用程式進入點
  App.tsx                   # 路由、共用元件與頁面
  styles.css                # Broadsheet tokens、RWD、列印樣式
  guideline.css             # 9/21 設計規範的色彩、字體與響應式版面
  seo.ts                    # 首次回應與前端換頁共用的 SEO 邏輯
  entry-server.tsx          # 由同一套 React 元件產生初始 HTML
server.mjs                  # 正式伺服器，讀取 JSON、提供靜態資源與正確 HTTP 狀態
```

### 首頁列表

`listings.json` 的主要欄位：

| 欄位 | 用途 |
| --- | --- |
| `seo` | 正式網域、語系、首頁及列表的 SEO 資料 |
| `site` / `navigation` | 品牌、網站提示、頁尾與導覽 |
| `hero` | 標題、簡介、投票日期與基本事實；倒數依台北日期每日計算 |
| `stories` | 全部文章摘要：`slug`、`kind`、`category`、標題、日期、圖片等 |
| `sections.reports.items` | 地方選舉與公投議題報告共用順序；每筆可設首頁專用 `title`，留白時沿用文章標題 |
| `sections.analyses.slugs` | 資訊操弄解析順序 |
| `sections.shorts.items` / `sections.infographics.slugs` | 可直接播放的 YouTube 短影音與圖卡區塊文章；短影音含顯示標題及 YouTube 連結 |
| `sections.infographics.items` | 每組圖卡的 `slug` 與 `cards`；每張含圖片 `src`／`alt` 及 `caption`，用於首頁預覽、lightbox 與獨立圖卡頁 |
| `sections.rumors.items` | 謠言主題，`scriptId` 連到下方問答 |
| `sections.scripts.items` | 可展開的常見劇本與解答 |
| `sections.process.items` | 選舉流程卡片與說明視窗內容 |
| `sections.learning.items` | 教學文章連結及英文標籤 |
| `sections.activities.items` | 活動列表及詳情視窗內容 |

`kind` 可為 `report`、`analysis`、`guide`；`category` 可為 `地方選舉` 或 `公投議題`；`tone` 可為 `cyan` 或 `magenta`。

### 新增或修改文章

1. 複製 `data/reports/ai-voice.json` 為新檔案，例如 `new-report.json`。
2. 將 `slug` 改為 `new-report`，修改標題、日期、作者、結論、摘要、背景與查核段落。Slug 僅使用小寫英文字母、數字及連字號。
3. 在 `listings.json` 的 `stories` 新增對應摘要，`slug`、分類與日期須與文章檔一致。列表標題可使用精簡版；記者上稿範本會核對「首頁標題直述句」與列表一致，並將「內文標題」作為文章標題。
4. 將 slug 加到適合的區塊；查核報告使用 `sections.reports.items`，並可選填首頁專用標題。
5. `relatedSlugs` 控制相關報告；`sources` 可填入 `label`、`note` 及選填的 HTTPS `href`。
6. 圖片使用 `{ "src": "/images/example.jpg", "alt": "圖片描述" }` 或 HTTPS 圖片網址。
7. 填寫文章的 `seo`：獨立標題、摘要、分享圖、作者種類及索引設定，詳見下節。
8. 執行 `npm test` 與 `npm run build` 確認內容有效。新增預設分享圖可先執行 `npm run generate:og`。

`background` 與 `checkSections` 包含 `id`、`title`、`paragraphs`，可選填 `image` 與 `caption`。段落以純文字輸出，JSON 內的 HTML 不會被執行。

## Mock data 與設計

- 8 篇查核報告、3 篇資訊操弄解析、2 篇教學；每篇都有獨立 JSON。
- 報告、人物、證據、活動及日期設定均為示範，不能引用為真實查核結果。首頁及文章提供明確標示；示範模式在初始 HTML 與 HTTP 回應標頭即加入 `noindex, nofollow`，sitemap 不列入示範頁面。
- 捐款按鈕僅顯示說明及正式網站連結；活動只顯示詳情，未串接金流或報名。
- 字型為本機打包的 Noto Serif TC（標題）與 Noto Sans TC（內文），不依賴執行時外部字型服務。
- 插圖是本專案產生的 SVG 示意圖，並非真實新聞影像；網站色彩、格線、卡片與 RWD 依 [9/21 設計規範資料夾](https://drive.google.com/drive/folders/1qhfXNol-mh-wxDIOTz9ZFQoPsKisZe0x) 更新。
- `scripts/create-mock-data.py` 與 `scripts/create-illustrations.py` 可重新產生初始示範資料／插圖。**重新執行會覆寫同名檔案**；日常編輯請直接改 JSON。
- 換成正式內容時，請同步修改列表與文章的 `isMock`、網站提示、頁尾與 SEO 文案。設定正式網址及真實內容後，才能開放索引。

## SEO 設定

首頁與列表的 SEO 分別存於 `data/listings.json` 的 `seo.home`、`seo.reports`；每篇報告有自己的 `seo`：

```json
{
  "title": "這篇文章的搜尋與分享標題｜台灣事實查核中心",
  "description": "這篇文章獨立的摘要。",
  "image": {
    "src": "/images/og/ai-voice.png",
    "alt": "分享圖片描述",
    "width": 1200,
    "height": 630,
    "type": "image/png"
  },
  "noindex": false,
  "authorType": "Organization"
}
```

`authorType` 只用於文章，可選 `Person` 或 `Organization`，名稱取自文章的 `reporter`。分享圖可使用本機 PNG／JPEG／WebP 或 HTTPS 圖片，不以 SVG 作為社群分享圖。

目前已提供：

- 每頁獨立 title、description、canonical；canonical 不含追蹤參數與文章錨點。
- Open Graph 與 Twitter Card，包括圖片網址、替代文字、尺寸、類型及文章日期。
- `Organization`、`WebSite`、`WebPage`／`CollectionPage`、`BreadcrumbList`、`ItemList`、`NewsArticle`／`Article` JSON-LD。
- 依發佈狀態產生的 sitemap、robots，以及 HTTP `X-Robots-Tag`。
- 首次 HTTP 回應就包含完整正文及 SEO；客戶端換頁也更新同一套 metadata，並移除前一篇資料。
- 搜尋／篩選頁為 `noindex`，canonical 指向未篩選的 `/reports`；404／503 不帶錯誤的文章 canonical 或 JSON-LD。

網站 host 依序採用 `SITE_URL` 環境設定、`listings.json` 的 `seo.siteUrl`、本機預覽網址；正式網址的 `/election2026/` 前綴由 `PUBLIC_BASE_PATH` 指定。`npm run build:worker` 固定設定兩者。`seo.siteUrl` 目前為 `null`；本機 fallback 網址只供測試，頁面保持 noindex，sitemap 為空。

```bash
SITE_URL=https://tfc-taiwan.org.tw PUBLIC_BASE_PATH=/election2026/ npm run build
```

也可依 `.env.example` 建立 `.env.local`，開發與建置時會讀取。`SITE_URL` 只填 origin，不能把子路徑填進去；正式部署的前綴由 `PUBLIC_BASE_PATH` 決定。

只有在正式 HTTPS 網域已設定、列表與該文章的 `isMock` 都為 `false`、該頁 `seo.noindex` 為 `false`，且不是搜尋／錯誤頁時，才會輸出 `index, follow`。`robots.txt` 允許爬取，讓爬蟲能讀取頁面上的 noindex；不使用封鎖爬取來代替 noindex。

`npm run generate:og` 會從現有本機插圖產生 1200×630 PNG，文章預設位置為 `/images/og/<slug>.png`，每張圖卡的預覽圖為 `/images/og/cards/<slug>-<張數>.png`。自行指定其他文章 `seo.image.src` 時不會覆寫該圖片；新增或換圖後需把 PNG 一起部署。預設分享圖保留示範素材標示，正式上線前應換成正式素材。

實作依據：[Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)、[Article 結構化資料](https://developers.google.com/search/docs/appearance/structured-data/article)、[Open Graph](https://ogp.me/)。Google 已停止 ClaimReview 在搜尋結果中的特殊呈現，因此本專案使用文章結構化資料，不把虛構案例發布為真實 ClaimReview；詳見[官方公告](https://developers.google.com/search/blog/2025/06/simplifying-search-results)。

## Cloudflare Workers 發布

`npm run build:worker` 會使用正式網址與 `/election2026/` 前綴，生成各頁預渲染 HTML、JSON、圖片、前端資源及 sitemap，並封裝於 `worker-assets/election2026/`。圖卡分享網址為 `/election2026/infographics/<slug>/<張數>`，例如 `/election2026/infographics/ai-tools/2`；訪客會看到圖卡專頁而非圖片檔，可導覽前後張與原文章。`wrangler.jsonc` 將同一個 Worker 指派到原網域的 `/election2026` 與 `/election2026/*`；不設定整站路由，也不跳轉到 `workers.dev`。首頁帶尾斜線，文章、圖卡與列表網址不帶尾斜線，Worker 會統一轉址。

`npm run preview:worker` 可在本機測試。`npm run deploy:worker` 會重新建置並正式發布；只有在 Cloudflare zone、既有 routes、編輯內容與發布權限都確認後才執行。此儲存庫目前沒有執行正式部署。

在 Worker Static Assets 模式，調整 `data/` 後要執行 `npm run build:worker` 並部署新版資產；網站不會直接讀取開發電腦的 JSON。`generate:pages` 僅供本機根路徑預覽的既有流程使用。

原站管理根目錄搜尋與 `robots.txt`。本專區的 sitemap 為 `/election2026/sitemap.xml`；示範資料維持 noindex 且 sitemap 不含示範文章。正式上線前須更換並審核內容，更新原站 sitemap 或於 Search Console 提交子路徑 sitemap。

`server.mjs` 與 `npm run preview` 保留作本機 Node SSR 與既有測試用途，並非這次規劃的 Cloudflare 正式架構。
