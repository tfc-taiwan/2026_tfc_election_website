# 2026 選舉工具箱

依據「Broadsheet 設計系統 mockup-handoff」實作的 React + TypeScript + Vite 網站。包含首頁、完整查核列表、搜尋及報告內頁，支援桌面、平板與手機。

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
npm test                 # JSON、日期、搜尋、SEO、索引及跳脫處理
npm run test:e2e         # Chrome：RWD、互動、SEO 換頁及停用 JavaScript 測試
npm run test:e2e:production # 對正式建置重跑相同瀏覽器測試，先執行 build
npm run test:production  # 先 build，再驗證正式伺服器、即時 JSON、404／503 與靜態頁面
```

瀏覽器測試涵蓋 320、390、834、1440 px，並將首頁及文章截圖存入 `test-results/`。若環境未安裝 Google Chrome，可安裝 Chrome，或在 `playwright.config.ts` 移除 `channel: 'chrome'` 並安裝 Playwright Chromium。

## 頁面

- `/`：首頁全部內容區塊。
- `/reports`：完整查核報告列表，可篩選地方選舉／公投。
- `/reports?q=音檔`：跨查核報告、解析與教學搜尋；支援 `category` 參數。
- `/reports/ai-voice`：獨立報告網址，可直接開啟、重新整理、分享與列印。
- 未知路徑、遺失 JSON、網路錯誤均有對應畫面；網路錯誤可重試。

## 資料維護

所有首頁列表集中在 **`data/listings.json`**；文章內容存於 **`data/reports/<slug>.json`**，一篇一檔。伺服器直接從 JSON 產生正文與 metadata，瀏覽器接手互動後也透過 `fetch('/data/...')` 重新確認資料；編輯內容不寫在 React 元件裡。

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
| `sections.reports.slugs` | 即時查核報告順序，依卡片的 `category` 切換 |
| `sections.analyses.slugs` | 資訊操弄解析順序 |
| `sections.rumors.items` | 謠言主題，`scriptId` 連到下方問答 |
| `sections.scripts.items` | 可展開的常見劇本與解答 |
| `sections.process.items` | 選舉流程卡片與說明視窗內容 |
| `sections.learning.items` | 教學文章連結及英文標籤 |
| `sections.activities.items` | 活動列表及詳情視窗內容 |

`kind` 可為 `report`、`analysis`、`guide`；`category` 可為 `地方選舉` 或 `公投議題`；`tone` 可為 `cyan` 或 `magenta`。

### 新增或修改文章

1. 複製 `data/reports/ai-voice.json` 為新檔案，例如 `new-report.json`。
2. 將 `slug` 改為 `new-report`，修改標題、日期、作者、結論、摘要、背景與查核段落。Slug 僅使用小寫英文字母、數字及連字號。
3. 在 `listings.json` 的 `stories` 新增對應摘要，`slug`、標題、分類、日期與文章檔一致。
4. 將 slug 加到適合的區塊（如 `sections.reports.slugs`），即可在首頁顯示。
5. `relatedSlugs` 控制相關報告；`sources` 可填入 `label`、`note` 及選填的 HTTPS `href`。
6. 圖片使用 `{ "src": "/images/example.jpg", "alt": "圖片描述" }` 或 HTTPS 圖片網址。
7. 填寫文章的 `seo`：獨立標題、摘要、分享圖、作者種類及索引設定，詳見下節。
8. 執行 `npm test` 與 `npm run build` 確認內容有效。新增預設分享圖可先執行 `npm run generate:og`。

`background` 與 `checkSections` 包含 `id`、`title`、`paragraphs`，可選填 `image` 與 `caption`。段落以純文字輸出，JSON 內的 HTML 不會被執行。

## Mock data 與設計

- 8 篇查核報告、3 篇資訊操弄解析、2 篇教學；每篇都有獨立 JSON。
- 報告、人物、證據、活動及日期設定均為示範，不能引用為真實查核結果。首頁及文章提供明確標示；示範模式在初始 HTML 與 HTTP 回應標頭即加入 `noindex, nofollow`，sitemap 不列入示範頁面。
- 捐款按鈕僅顯示說明及正式網站連結；活動只顯示詳情，未串接金流或報名。
- 字型為本機打包的 Source Serif 4 與 Noto Serif TC，不依賴執行時外部字型服務。
- 插圖是本專案產生的 SVG 示意圖，並非真實新聞影像；色彩與間距採交付檔的 Broadsheet 設計 tokens。
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

網站網址依序採用 `SITE_URL` 環境設定、`listings.json` 的 `seo.siteUrl`、本機預覽網址。正式網域尚未指定，`seo.siteUrl` 目前為 `null`；本機 fallback 網址只供測試，頁面保持 noindex，sitemap 為空。

```bash
# 替換成真正的 HTTPS 網域；以下只是設定格式範例。
SITE_URL=https://election.your-domain.example npm run build
SITE_URL=https://election.your-domain.example npm start
```

也可依 `.env.example` 建立 `.env.local`，開發與建置時會讀取。正式伺服器採用建置保存的設定，或啟動時的 `SITE_URL` 覆寫。部署於網域根目錄，不支援在 `SITE_URL` 填入子路徑。

只有在正式 HTTPS 網域已設定、列表與該文章的 `isMock` 都為 `false`、該頁 `seo.noindex` 為 `false`，且不是搜尋／錯誤頁時，才會輸出 `index, follow`。`robots.txt` 允許爬取，讓爬蟲能讀取頁面上的 noindex；不使用封鎖爬取來代替 noindex。

`npm run generate:og` 會從現有本機插圖產生 1200×630 PNG，預設位置為 `/images/og/<slug>.png`。自行指定其他 `seo.image.src` 時不會覆寫該圖片；新增或換圖後需把 PNG 一起部署。預設分享圖保留示範素材標示，正式上線前應換成正式素材。

實作依據：[Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)、[Article 結構化資料](https://developers.google.com/search/docs/appearance/structured-data/article)、[Open Graph](https://ogp.me/)。Google 已停止 ClaimReview 在搜尋結果中的特殊呈現，因此本專案使用文章結構化資料，不把虛構案例發布為真實 ClaimReview；詳見[官方公告](https://developers.google.com/search/blog/2025/06/simplifying-search-results)。

## 正式伺服器部署

`npm run build` 產生 `dist/`（前端資源、JSON、預渲染頁面）與 `.server/`（React 伺服器模組、HTML 範本、網址設定）。部署時保留兩個目錄、`server.mjs`、`package.json`、lockfile，並安裝正式依賴：

```bash
npm ci --omit=dev
HOST=0.0.0.0 PORT=8080 npm start
```

伺服器預設只監聽本機；部署環境需自行設定 `HOST`、`PORT` 及正式 HTTPS 反向代理。每次頁面請求直接讀取 JSON，正文、metadata、sitemap 與瀏覽器取得的 JSON 都來自同一份資料，不必重建 JavaScript。

資料目錄依序為 `DATA_DIR` 指定目錄、專案根目錄的 `data/`（若存在）、`dist/data/`。`DATA_DIR` 可指定獨立掛載的編輯資料目錄。HTML／JSON 採重新驗證快取，帶雜湊的前端資源可長期快取。缺少文章回傳 404，資料格式損壞回傳 503，均不索引。

## 純靜態部署

也可以只部署 `dist/`。每篇文章位於 `dist/reports/<slug>/index.html`，主機需先服務該路徑的實際 HTML，未知路徑用 `404.html` 並回傳 404；**不要把所有文章改寫成首頁 HTML**，否則分享爬蟲會拿到首頁資訊。

純靜態主機不會在請求時讀取 JSON；修改資料後，執行下列命令同步更新 HTML、JSON、分享圖及 sitemap，再重新部署 `dist/`，不需重新打包前端 JavaScript：

```bash
npm run generate:pages
```

搜尋／篩選 query 的個別 HTTP metadata 與精確 HTTP 錯誤處理由正式伺服器提供；純靜態主機會先回傳 `/reports` 的共用 HTML，再由瀏覽器套用搜尋結果及 noindex。若需要初始回應即有完整 query 對應的 SEO，使用上方正式伺服器。

本專案目前提供本機預覽與可部署產物，未部署到正式站台，也未送交搜尋引擎索引。
