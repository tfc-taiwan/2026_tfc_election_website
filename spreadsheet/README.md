# 試算表與 Google Docs：本機 JSON converter

[列表與文章管理試算表](https://docs.google.com/spreadsheets/d/1rRRptUYoOoqz6OxLHnOuZE1ayu9Tk7kdHwjiyne7pkY/edit) · [Mockdata 資料夾](https://drive.google.com/drive/folders/12ekCd2_EkqUSA8QUF7qieq8dPpk2XIWt)

## 正式網站同步副本（2026-10-22）

[正式網站同步副本](https://docs.google.com/spreadsheets/d/1bso8-5wsl12oy0HjrpRz_NmxjSl6cuupo6kJiwzEEmU/edit) 依已部署的 `57323b4` 建立；原表未修改。請先閱讀副本中的「使用說明」「同步紀錄」。副本的 10 張匯入資料表已驗證可完整還原正式 `listings.json`；另保留未上線草稿與全部 12 篇文章的 JSON 快照。Docs 連結沿用原表，文件正文可能較舊，重新匯入全文前應對照快照，避免恢復已刪除的內容。

新版「首頁編排」新增選填「圖卡組說明」；`infographics` 只需對應圖卡組，不再強制對應文章列表，仍須每組至少有一張圖。「資訊卡」的「閱讀連結」、「常見劇本」的「延伸閱讀連結」及「導覽」的「下拉選單」已填入正式資料。目前「資訊怎麼查？」使用網站設定的 `sections.learning.resources`，首頁公約使用 `sections.initiative`；二者以 JSON 儲存，不要另新增不受 converter 支援的欄位。這些匯入器更新不會自行部署網站。

以下為原始流程與示範格式的說明；示範資料數量不代表本次正式副本的內容。

試算表管理 `data/listings.json`；每篇 Google Docs 管理 `data/reports/<slug>.json`。目前已有 13 筆列表與 13 篇虛構文章。保留原有 Google 編輯流程，下載檔案後在本機轉換，不需要 Apps Script、GCP 專案、API key 或 OAuth 憑證；converter 不連網，也不直接存取私人文件。

## 第一次使用

需要 Node.js 22.18 以上，在網站專案執行 `npm ci`。

1. 在試算表選擇「檔案 → 下載 → Microsoft Excel (.xlsx)」，儲存為例如 `listings.xlsx`。
2. 在各篇 Google Docs 選擇「檔案 → 下載 → Markdown (.md)」，放入同一個 `reports/` 資料夾。資料夾只放本次完整列表對應的文章，移除重複下載的版本。
3. 在專案根目錄執行以下指令，先檢查，再產生網站資料。

以下指令適用於原先 13 篇示範文件。使用「記者上稿範本」時，另外加入 `--metadata`，並處理圖片輸出，詳見下方「記者上稿範本」。兩種格式可放在同一資料夾匯入。

```sh
npm run data:import -- ~/Downloads/listings.xlsx --reports ~/Downloads/reports --check
npm run data:import -- ~/Downloads/listings.xlsx --reports ~/Downloads/reports
```

預設產生 `generated/data/listings.json` 與 `generated/data/reports/<slug>.json`，不會直接修改網站資料。所有文章與列表都通過驗證後才寫入。

重跑時，如果輸出目錄已存在，可以指定新目錄，或加 `--replace`。替換時會將舊目錄保留為旁邊的 `data-backup-隨機字串/`，指令會印出備份路徑。新目錄只包含這次的列表與文章，不會混入已刪除的舊文章。

```sh
npm run data:import -- ~/Downloads/listings.xlsx --reports ~/Downloads/reports --replace
```

確認結果後，要直接更新網站的 `data/`，需明確指定：

```sh
npm run data:import -- ~/Downloads/listings.xlsx --reports ~/Downloads/reports --out-dir data --replace
npm run build:worker
```

若輸出目錄含有 `listings.json`、`reports/` 以外的項目，程式會拒絕替換。下載、轉換與建置都不會自行 commit、push 或部署網站。

## 只更新列表或一篇文章

只更新列表，不需要下載 Docs，也不會改動文章 JSON：

```sh
npm run data:import -- ~/Downloads/listings.xlsx --check
npm run data:import -- ~/Downloads/listings.xlsx
npm run data:import -- ~/Downloads/listings.xlsx --out data/listings.json
```

單篇 Markdown 預設對照 `data/listings.json`，產生 `generated/reports/<slug>.json`：

```sh
npm run data:reports -- ~/Downloads/文章.md --check
npm run data:reports -- ~/Downloads/文章.md
```

如列表也剛修改，先匯出新的列表，再指定對照檔：

```sh
npm run data:reports -- ~/Downloads/文章.md --listings generated/listings.json
```

要更新網站檔案，明確指定 `--out data/reports`。單篇轉換只改該篇檔案，驗證失敗會保留原檔。

`--check` 完全不寫檔。試算表輸入也可使用「工作表名稱 → 二維列陣列」的 `.json`；`npm run sheets:rows` 可從網站 listings 產生此格式，供測試或其他編輯工具使用。

## 資料與權限

文章列表的 Google Docs 連結只供編輯者開啟文件，不會放進公開網站 JSON；本機 converter 不沿連結取得內容。原示範格式依文件內的 slug 配對；記者上稿範本依本機設定檔的「下載檔名 → slug」配對。原本的試算表及 13 篇 Docs 仍在原資料夾，分享權限不變。新增編輯者只需取得文件原有存取權，不必加入 OAuth 測試名單。

2026-09-18 已停用舊 Apps Script 匯出程式、移除進階服務與所需 scopes；重新載入試算表後，不再出現「網站 JSON」選單。專用 GCP 專案 `tfc-election-2026-export`（`560409466227`）已依使用者要求關閉，實際狀態為 `DELETE_REQUESTED`。Google 保留約 30 天復原期後執行後續刪除，並非立即永久清除。參考 [Google 專案刪除流程](https://docs.cloud.google.com/resource-manager/docs/delete-restore-projects)。

## 實際驗證

已下載同一份 Google Sheet 的 Excel 及全部 13 篇 Google Docs 的 Markdown，以本機指令產生 14 份 JSON，檔案清單與每份內容均與網站 mockdata 完全一致。單篇流程也完成比對；測試涵蓋日期晶片、SEO、特殊字元、缺篇、重複文章、無效內容、唯讀檢查及替換備份。所有 mock 標記仍保留。

## 工作表

| 工作表 | 用途 |
| --- | --- |
| 使用說明 | 編輯、日期、圖片、權限與匯出操作 |
| 網站設定 | 網站名稱、主視覺文字、區塊標題、mock 及網域設定 |
| 導覽 | 選單文字與站內連結 |
| 首頁小卡 | 選舉資訊小卡 |
| 文章列表 | 列表標題、摘要、封面、分類、日期與 Google Docs 連結 |
| 網頁SEO | 首頁 `home` 與列表 `reports` 的 SEO |
| 首頁編排 | 各區塊內容與順序；`reports` 可填首頁標題，`shorts` 填標題與 YouTube 連結，`infographics` 填圖卡組名 |
| 圖卡內容 | `infographics` 每組圖卡的逐張圖片路徑、替代文字與說明 |
| 謠言分類 | 謠言類型與對應劇本 |
| 常見劇本 | 問答內容 |
| 資訊卡 | 選舉流程與工作動態 |

第一列欄名及既有網站設定的鍵不可改名或刪除。欄位順序可調整，全空列會略過。「順序」為同區塊內不重複的正整數。`report`、`analysis`、`guide` 分別對應查核報告、解析及查核學堂。多段文字以空白行分隔，主視覺標題及分類清單每項一行。`site.socialLinks` 控制 footer 的社群連結，每行填一筆 `名稱 | https://網址`；名稱與網址都不可重複。

### 非查核文章的分類與評等

`analysis`（解析）與 `guide`（教學指南）的「主題」可以留白，也可以選既有分類；「查核結果」請留白，不必選「錯誤／部分錯誤」等評等，也不用填「無」。匯入器會拒絕非查核文章誤填的評等並提示清空。空白分類不會在文章頁產生空白麵包屑，也不會補造 SEO 分類。

`report`（查核報告）的「主題」仍須填寫。其他欄位維持原規則：順序、slug、類型、標題、列表摘要、卡片標籤及色系必填；日期與封面可以留白，有封面時須同時填圖片路徑及替代文字。Google Docs 連結供編輯定位正文，並不會讓本機 converter 自動下載文件；正文仍須另外匯入。

新版首頁的「地方選舉查核報告」與「公投議題查核報告」仍共用 `首頁編排` 的 `reports` 列，網站依 `文章列表` 的「主題」自動分區；`analyses` 仍只放 `analysis` 文章。`reports` 每列可填「首頁標題」；有值時首頁採用這個標題，留白時沿用文章列表標題，文章頁標題不受影響。`shorts` 不使用 `slug`，每列必填「首頁標題」與有效的 YouTube 影片或 Shorts 連結，首頁預設顯示 YouTube 預覽縮圖，點擊後才顯示並播放隱私增強播放器；播放器會監聽 YouTube 的播放狀態，第二支開始播放時，前一支會收到 `stopVideo()` 並停止。`infographics` 的組別在 `首頁編排` 設定，必填「圖卡組名」；逐張圖卡由「圖卡內容」工作表提供：一列一張，填 `slug`、組內「順序」、「圖片路徑」、「圖片替代文字」、「圖卡說明」。轉換器依 `slug` 分組、依「順序」排列，形成 `items[] → cards[]` 兩層陣列；每組至少一張。圖片放入網站 `public/images/`，點擊首頁預覽即開啟 lightbox。若首頁有 `infographics` 編排卻缺少「圖卡內容」工作表或沒有圖卡，轉換會停止並提示，不會輸出遺失圖卡的 JSON。

## 記者上稿範本

支援使用者提供的 [2026 選舉專區記者上稿範本](https://docs.google.com/document/d/1Z6QTacyN0JJNltMtGAqs7I_LmhgK-WyVdlSPSUfMgGY/edit?tab=t.0)。2026-09-20 已下載實際 Markdown，保留在 `tests/fixtures/editorial-template.md` 作為回歸測試。範本本身沒有完成的報導，不能直接發布；測試使用本機填入的虛構內容，沒有改動 Google 原件。

### 文件與網站欄位對照

| Docs 內容 | 網站 JSON / 顯示 |
| --- | --- |
| 「首頁標題直述句：」後的標題 1 | 驗證與試算表的列表標題一致 |
| 「內文標題」後的文字 | `title`，可以比列表標題完整；旁邊的判定圖示不當成正文圖片 |
| `###內容起###` 至 `###內容迄###` | 唯一正文範圍；兩個標記各保留一次 |
| 標題 2「摘要」 | `summaryPoints` 與 `summaryBlocks` |
| 標題 2「背景」 | `background` |
| 標題 2「查核」及其標題 3 | `checkSections`，每個標題 3 為一個查核點 |
| 標題 2「補充資料」及其標題 3 | `supplementarySections`；未使用時可刪除該區塊 |
| 獨立一段的圖片、緊接的標題 5 | 圖片與圖說，保留原始比例；圖說也作為沒有替代文字時的 alt |
| 「內容迄」之後的 `（記者：姓名；責任編輯：姓名）` | `reporter`、`editor` |

正文保留段落與圖片順序、粗體、斜體、HTTPS 文字連結、標題 3／4、簡單清單。`blocks` 是保留順序與樣式的欄位，網頁會優先使用它；既有 `paragraphs` 仍保留純文字，舊文章 JSON 也可繼續使用。

開頭的存證／簽核表格、Canva 欄位、LINE 文案、結尾的查核指標說明與測試內容不會進入公開 JSON。查核結果以試算表的「查核結果」欄為準，不辨識圖示顏色。內文中的來源連結會保留；頁末獨立的來源清單可在設定檔的 `sources` 填寫。

PNG、JPEG、WebP 內嵌圖片會輸出為實際檔案，JSON 使用 `/images/imported/<內容雜湊>.png` 等網址。同一圖片只輸出一份。僅處理正文使用的圖片，不匯出表格或標題旁的判定圖示；HTTPS 圖片網址會保留，不由 converter 下載。內嵌圖每張最多 20 MB、4,000 萬像素。

### 本機設定與指令

此範本沒有 slug、報告編號、更新日期與 SEO 等欄位，因此用獨立設定檔補上。複製 [設定範例](editorial-metadata.example.json)，將最外層的 `文章.md` 改成實際下載檔名（包含 `.md`），並修改該篇的值。一份設定檔可包含多篇文章。

- 必填：`slug`、`reportId`、`updated`、`imageCaption`、`seo`。
- `kind`、`category`、`verdict`、`published`、主圖與 `isMock` 取自列表。
- 選填：`finding`、`summaryClose`、`tags`、`relatedSlugs`、`sources`。`finding` 未填時採摘要最後一點；`summaryClose` 未填時不另外重複摘要結語。SEO 圖片的路徑與尺寸仍需提供，converter 不自動製作社群首圖。

單篇驗證與匯出：

```sh
npm run data:reports -- ~/Downloads/文章.md --metadata ~/Downloads/report-metadata.json --check
npm run data:reports -- ~/Downloads/文章.md --metadata ~/Downloads/report-metadata.json
```

預設 JSON 在 `generated/reports/`，圖片在 `generated/images/imported/`。確認結果後，以下指令才會更新網站資料與圖片：

```sh
npm run data:reports -- ~/Downloads/文章.md --metadata ~/Downloads/report-metadata.json --out data/reports --assets-dir public/images
npm run build:worker
```

整份試算表與全部文章一併匯入：

```sh
npm run data:import -- ~/Downloads/listings.xlsx --reports ~/Downloads/reports --metadata ~/Downloads/report-metadata.json --check
npm run data:import -- ~/Downloads/listings.xlsx --reports ~/Downloads/reports --metadata ~/Downloads/report-metadata.json --out-dir data --assets-dir public/images --replace
```

設定檔應放在文章資料夾外；文章資料夾只放 `.md`。新增或更名文章時同步調整檔名對應。`--check` 不會寫入 JSON 或圖片，驗證失敗不會覆蓋現有報告。圖片以內容命名，重跑不會建立重複檔案，也不會自動清除舊文章用過的圖片。

保留 Google Docs 原生標題樣式，不要只放大字級。填完首頁標題、內文標題、摘要、背景、查核點、圖說與署名；刪除未使用的提示標題。正文內表格、混在文字中的圖片、HTML、嵌入影片、註腳、刪除線、巢狀清單及待辦框會明確報錯，不會悄悄遺漏。每個 `.md` 只匯入一篇文章；多分頁 Docs 請確認下載內容只含目標文章，建議變更先接受或拒絕後再下載。

## 原有示範文件格式

可複製文章列表連結中的任一篇報告，保留 Google Docs 原生標題樣式，再改寫內容：

1. 文件第一段使用 **標題（TITLE）**，內容為文章標題。
2. **標題 1**「基本資料」：每行 `key: value`。包含 `version`、`isMock`、`slug`、`kind`、`category`、可空白的 `verdict`、`published`、`updated`、`reportId`、`reporter`、`editor`、`image.src`、`image.alt`、`imageCaption`、`tags`。標籤用 ` | ` 分隔；日期建議用 `YYYY-MM-DD`；converter 也支援目前範本日期晶片匯出的「9月 1, 2026」、中文年月日及英文月份格式。
3. **標題 1**「查核結論」、「摘要重點」、「摘要結語」：各自下方編輯文字。摘要每一段為一點，可使用原生項目符號。
4. **標題 1** `背景 [background] 背景` 與 `查核 [check-1] 段落標題`：方括號內為唯一段落代碼，後方為網頁顯示標題。下方普通段落依序輸出。新增查核段落時複製標題並修改代碼與標題。
5. 段落圖片使用 `@image: /images/example.png`、`@alt: 替代文字`、選填 `@caption: 圖說`。圖片路徑與替代文字必須一起填；圖片檔須另外加入網站。主圖則在基本資料編輯。
6. **標題 1**「參考來源」：每一來源的名稱使用 **標題 2**，下方普通段落填來源說明。選填一行 `@url: https://...`。
7. **標題 1**「相關文章」：每段一個其他文章 slug，可以沒有項目。
8. **標題 1**「SEO」：每行 `key: value`，包含 `title`、`description`、`image.src`、`image.alt`、`image.width`、`image.height`、`image.type`、`noindex`、`authorType`。

這套原有格式使用純文字段落及圖片網址；粗體、斜體與行內程式碼會保留文字，不保留格式。Markdown 中的表格、嵌入圖片、註腳、刪除線、HTML、程式區塊、巢狀清單、待辦框與帶顯示文字的行內連結會明確報錯；網址請放在 `@url:`。若要保留內文連結、格式與嵌入圖片，請使用上方的記者上稿範本。摘要重點與相關文章可使用清單，每項一個段落。每個 `.md` 檔只放一篇完整文章；多分頁文件需分開下載，並檢查下載內容。Google Docs 的建議變更請先接受或拒絕，再下載。

Docs 和列表的 `slug`、標題、類型、主題、查核結果、刊登日期必須一致。文章 SEO、正文、作者與來源以 Docs 為準。完整匯入必須提供列表內全部文章；缺篇、重複 slug、未知文章或格式不符都會在寫入前停止。檔案名稱可以是中文或 Google 原始下載名稱，輸出檔名依文件內的 slug 決定。


參考：[Google Docs Markdown 下載](https://support.google.com/docs/answer/12014036?hl=en)。

### 深偽倡議區塊

原先規劃的公投區塊改以「深偽倡議」呈現時，請將相關文章在「文章列表」的「主題」填為 `深偽倡議`，並在「首頁編排」的 `reports` 列加入對應 slug。網站設定中的 `sections.reports.categories` 也須包含 `深偽倡議`，首頁區塊標題會直接顯示「深偽倡議」，不加「查核報告」。舊的 `公投議題` 仍可讀取，避免既有資料匯入失敗；不會自動把公投文章或地方選舉文章改分類。沒有對應文章時，首頁不顯示空區塊。一般倡議文章可選 `analysis` 或 `guide` 並留白查核結果；目前首頁 `reports` 編排須放 `report`，一般文章沿用其對應編排。
