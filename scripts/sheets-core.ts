import { listingsSchema, reportSchema, type Listings, type Report } from '../src/data.ts';

export type Cell = string | number | boolean | Date | null;
export type WorkbookRows = Record<string, Cell[][]>;
type Field = { key: string; label: string; type?: string; options?: string[]; width?: number };
const f = (key: string, label: string, type = 'text', options?: string[], width?: number): Field => ({ key, label, type, options, width });
const order = f('order', '順序', 'number', undefined, 70);
const slug = f('slug', 'slug', 'text', undefined, 180);
const tone = f('tone', '色系', 'text', ['cyan', 'magenta'], 110);
const imageFields = [f('image.src', '圖片路徑'), f('image.alt', '圖片替代文字')];
const common = [slug, f('kind', '類型', 'text', ['report', 'analysis', 'guide'], 115), f('category', '主題', 'text', ['地方選舉', '公投議題'], 115), f('title', '標題', 'text', undefined, 350)];
export const SHEETS: Record<string, Field[]> = {
  '網站設定': [f('key', '設定鍵', 'text', undefined, 260), f('value', '設定值', 'raw', undefined, 630)],
  '導覽': [order, f('label', '顯示文字'), f('href', '站內連結')],
  '首頁小卡': [order, f('title', '標題'), f('description', '說明', 'text', undefined, 560), tone],
  '文章列表': [order, ...common, f('description', '列表摘要', 'text', undefined, 400), f('date', '刊登日期', 'date'), f('tag', '卡片標籤'), tone, f('verdict', '查核結果', 'optional', ['錯誤', '部分錯誤', '事實釐清', '正確']), ...imageFields, f('docUrl', 'Google Docs 連結', 'optional', undefined, 400)],
  '網頁SEO': [f('page', '頁面', 'text', ['home', 'reports'], 180), f('title', 'SEO 標題', 'text', undefined, 400), f('description', 'SEO 描述', 'text', undefined, 500), ...imageFields, f('image.width', '圖片寬度', 'number'), f('image.height', '圖片高度', 'number'), f('image.type', '圖片格式', 'text', ['image/png', 'image/jpeg', 'image/webp']), f('noindex', '不開放索引', 'boolean')],
  '首頁編排': [f('section', '區塊', 'text', ['reports', 'analyses', 'learning']), order, slug, f('badge', '英文標籤', 'optional')],
  '謠言分類': [order, f('id', '分類代碼'), f('badge', '英文標籤'), f('label', '分類名稱'), tone, f('scriptId', '對應劇本')],
  '常見劇本': [order, f('id', '劇本代碼'), f('question', '問題', 'text', undefined, 420), f('answer', '解答', 'text', undefined, 680)],
  '資訊卡': [f('section', '區塊', 'text', ['process', 'activities']), order, f('id', '卡片代碼'), f('title', '標題', 'text', undefined, 350), f('description', '說明', 'text', undefined, 400), tone, f('icon', '圖示', 'optional', ['document', 'calendar', 'check', 'globe']), f('dateLabel', '日期標籤', 'optional'), f('tag', '標籤', 'optional'), f('cta', '按鈕文字', 'optional'), f('content', '內文', 'paragraphs', undefined, 680)],
};

const settingFields: Field[] = [
  f('version', '', 'number'), f('isMock', '', 'boolean'),
  ...['name', 'englishName', 'title', 'notice', 'footer'].map(k => f(`site.${k}`, '')),
  f('seo.siteUrl', '', 'nullable'), f('seo.language', ''), f('seo.locale', ''),
  f('hero.kicker', ''), f('hero.title', '', 'lines'), f('hero.description', ''), f('hero.electionDate', '', 'date'),
  ...['reports', 'analyses', 'rumors', 'scripts', 'process', 'learning', 'activities'].map(k => f(`sections.${k}.title`, '')),
  f('sections.reports.categories', '', 'lines'), f('sections.analyses.description', ''),
];

const fail = (message: string): never => { throw new Error(message); };
const has = (value: unknown) => value !== null && value !== undefined && value !== '';
function get(object: any, path: string): any { return path.split('.').reduce((o, k) => o?.[k], object); }
function set(object: any, path: string, value: any) {
  const parts = path.split('.'); let target = object;
  for (const part of parts.slice(0, -1)) target = target[part] ??= {};
  target[parts.at(-1)!] = value;
}
function cellValue(value: any, field: Field): Cell {
  if (Array.isArray(value)) return value.join(field.type === 'paragraphs' ? '\n\n' : '\n');
  return value ?? '';
}
function parse(value: Cell | undefined, field: Field, at: string): any {
  if (field.type === 'raw') return value ?? '';
  if (field.type === 'optional' && !has(value)) return undefined;
  if (field.type === 'nullable' && !has(value)) return null;
  if (field.type === 'boolean') {
    if (value === true || value === 'TRUE' || value === 'true') return true;
    if (value === false || value === 'FALSE' || value === 'false') return false;
    return fail(`${at}：請填 TRUE 或 FALSE`);
  }
  if (field.type === 'number') {
    if (!has(value) || typeof value === 'boolean' || !/^\d+$/.test(String(value))) return fail(`${at}：請填非負整數`);
    const n = Number(value);
    if (!Number.isSafeInteger(n)) return fail(`${at}：數字超出範圍`);
    return n;
  }
  if (field.type === 'date') {
    if (value instanceof Date) value = value.toISOString().slice(0, 10);
    // Google Sheets values API can return an Excel-compatible date serial.
    if (typeof value === 'number') value = new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString().slice(0, 10);
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fail(`${at}：日期請填 YYYY-MM-DD`);
    return value;
  }
  if (typeof value !== 'string') return fail(`${at}：請填文字`);
  if (field.type === 'lines' || field.type === 'paragraphs') {
    return value.replace(/\r\n/g, '\n').split(field.type === 'paragraphs' ? /\n\s*\n/ : '\n').map(v => v.trim()).filter(Boolean);
  }
  if (!value.trim()) return fail(`${at}：不可空白`);
  if (field.options && !field.options.includes(value)) return fail(`${at}：僅接受 ${field.options.join('、')}`);
  return value;
}

function readRows(book: WorkbookRows, name: string): any[] {
  const rows = book[name] ?? fail(`缺少工作表「${name}」`), fields = SHEETS[name];
  const headers = rows[0]?.map(String) ?? [];
  const indexes = fields.map(field => {
    const positions = headers.flatMap((header, i) => header === field.label ? [i] : []);
    if (positions.length !== 1) fail(`「${name}」欄位「${field.label}」缺少或重複`);
    return positions[0];
  });
  if (headers.some(header => header && !fields.some(field => field.label === header))) fail(`「${name}」有不認得的欄名；請勿更改第一列欄名`);
  return rows.slice(1).flatMap((row, i) => {
    if (!row.some(has)) return [];
    if (row.some((value, column) => has(value) && !headers[column])) fail(`「${name}」第 ${i + 2} 列有無欄名的資料`);
    const result: any = { _row: i + 2 };
    fields.forEach((field, column) => { const value = parse(row[indexes[column]], field, `「${name}」第 ${i + 2} 列「${field.label}」`); if (value !== undefined) set(result, field.key, value); });
    return [result];
  });
}
function ordered(rows: any[], context: string) {
  unique(rows.map(row => row.order), `${context}的順序`);
  if (rows.some(row => row.order < 1)) fail(`${context}：順序必須從 1 開始的正整數`);
  return rows.slice().sort((a, b) => a.order - b.order);
}
function unique(values: any[], context: string) { if (new Set(values).size !== values.length) fail(`${context}不可重複`); }
function clean(row: any, keys: string[]) { return Object.fromEntries(keys.filter(k => row[k] !== undefined).map(k => [k, row[k]])); }
function validate<T>(schema: { safeParse: (v: unknown) => any }, value: unknown, context: string): T {
  const result = schema.safeParse(value);
  if (!result.success) fail(`${context}：\n${result.error.issues.map((i: any) => `${i.path.join('.')}：${i.message}`).join('\n')}`);
  return result.data;
}

export function convertWorkbook(book: WorkbookRows): Listings {
  const tables = Object.fromEntries(Object.keys(SHEETS).map(name => [name, readRows(book, name)]));
  const settings = tables['網站設定']; unique(settings.map(row => row.key), '網站設定鍵');
  if (settings.some(row => !settingFields.some(field => field.key === row.key))) fail('網站設定包含不認得的設定鍵');
  const listings: any = {};
  for (const field of settingFields) {
    const row = settings.find(row => row.key === field.key) ?? fail(`網站設定缺少 ${field.key}`);
    set(listings, field.key, parse(row.value, field, `網站設定第 ${row._row} 列 ${field.key}`));
  }
  if (listings.seo.siteUrl) {
    const origin = listings.seo.siteUrl;
    if (!/^https?:\/\/[^/?#@]+\/?$/.test(origin)) fail('seo.siteUrl 必須為網站 origin，不可含路徑、帳密、查詢參數');
  }
  listings.navigation = ordered(tables['導覽'], '導覽').map(row => clean(row, ['label', 'href']));
  listings.hero.facts = ordered(tables['首頁小卡'], '首頁小卡').map(row => clean(row, ['title', 'description', 'tone']));
  const articles = ordered(tables['文章列表'], '文章列表');
  unique(articles.map(row => row.slug), '文章 slug');
  const slugs = new Set(articles.map(row => row.slug));
  const reference = (id: string, context: string) => { if (!slugs.has(id)) fail(`${context}：找不到文章 ${id}`); };
  const seoRows = tables['網頁SEO']; unique(seoRows.map(row => row.page), 'SEO 頁面');
  const seo = (page: string) => {
    const row = seoRows.find(row => row.page === page) ?? fail(`網頁SEO缺少 ${page}`);
    return clean(row, ['title', 'description', 'image', 'noindex']);
  };
  listings.seo.home = seo('home'); listings.seo.reports = seo('reports');
  listings.stories = articles.map(row => clean(row, ['slug', 'kind', 'category', 'title', 'description', 'date', 'image', 'tag', 'tone', 'verdict']));
  for (const section of ['reports', 'analyses', 'learning']) {
    const items = ordered(tables['首頁編排'].filter(row => row.section === section), `首頁 ${section}`);
    unique(items.map(row => row.slug), `首頁 ${section} 文章`);
    for (const item of items) {
      reference(item.slug, `首頁編排第 ${item._row} 列`);
      const expected = { reports: 'report', analyses: 'analysis', learning: 'guide' }[section];
      if (articles.find(row => row.slug === item.slug)?.kind !== expected) fail(`首頁編排第 ${item._row} 列：${section} 僅接受 ${expected}`);
      if (section !== 'learning' && item.badge) fail(`首頁編排第 ${item._row} 列：英文標籤僅供 learning 使用`);
    }
    if (section === 'learning') listings.sections.learning.items = items.map(row => clean(row, ['slug', 'badge']));
    else listings.sections[section].slugs = items.map(row => row.slug);
  }
  listings.sections.rumors.items = ordered(tables['謠言分類'], '謠言分類').map(row => clean(row, ['id', 'badge', 'label', 'tone', 'scriptId']));
  listings.sections.scripts.items = ordered(tables['常見劇本'], '常見劇本').map(row => clean(row, ['id', 'question', 'answer']));
  for (const section of ['process', 'activities']) {
    const rows = ordered(tables['資訊卡'].filter(row => row.section === section), `資訊卡 ${section}`);
    for (const row of rows) {
      if (section === 'process' && ['dateLabel', 'tag', 'cta'].some(k => row[k])) fail(`資訊卡第 ${row._row} 列：process 不使用活動欄位`);
      if (section === 'activities' && row.icon) fail(`資訊卡第 ${row._row} 列：activities 不使用圖示`);
    }
    listings.sections[section].items = rows.map(row => clean(row, ['id', 'title', 'description', 'tone', 'content', ...(section === 'process' ? ['icon'] : ['dateLabel', 'tag', 'cta'])]));
  }
  for (const name of ['rumors', 'scripts', 'process', 'activities']) unique(listings.sections[name].items.map((row: any) => row.id), `${name} 代碼`);
  for (const item of listings.sections.rumors.items) if (!listings.sections.scripts.items.some((script: any) => script.id === item.scriptId)) fail(`謠言分類 ${item.id} 找不到劇本 ${item.scriptId}`);
  return validate<Listings>(listingsSchema, listings, '首頁資料');
}

export function toWorkbookRows(listings: Listings, docUrls: Record<string, string> = {}): WorkbookRows {
  const objects: Record<string, any[]> = Object.fromEntries(Object.keys(SHEETS).map(name => [name, []]));
  objects['網站設定'] = settingFields.map(field => ({ key: field.key, value: cellValue(get(listings, field.key), field) }));
  objects['導覽'] = listings.navigation.map((row, i) => ({ order: i + 1, ...row }));
  objects['首頁小卡'] = listings.hero.facts.map((row, i) => ({ order: i + 1, ...row }));
  objects['網頁SEO'] = [{ page: 'home', ...listings.seo.home }, { page: 'reports', ...listings.seo.reports }];
  objects['文章列表'] = listings.stories.map((story, i) => ({ order: i + 1, ...story, docUrl: docUrls[story.slug] }));
  for (const section of ['reports', 'analyses'] as const) objects['首頁編排'].push(...listings.sections[section].slugs.map((slug, i) => ({ section, order: i + 1, slug })));
  objects['首頁編排'].push(...listings.sections.learning.items.map((row, i) => ({ section: 'learning', order: i + 1, ...row })));
  objects['謠言分類'] = listings.sections.rumors.items.map((row, i) => ({ order: i + 1, ...row }));
  objects['常見劇本'] = listings.sections.scripts.items.map((row, i) => ({ order: i + 1, ...row }));
  for (const section of ['process', 'activities'] as const) objects['資訊卡'].push(...listings.sections[section].items.map((row, i) => ({ section, order: i + 1, ...row })));
  return Object.fromEntries(Object.entries(SHEETS).map(([name, fields]) => [name, [fields.map(field => field.label), ...objects[name].map(row => fields.map(field => cellValue(get(row, field.key), field)))]]));
}

export function listingsJson(listings: Listings) { return `${JSON.stringify(listings, null, 2)}\n`; }

export type DocParagraph = { text: string; heading?: string };
const metaFields = [f('version', '', 'number'), f('isMock', '', 'boolean'), slug, ...common.slice(1, 3), f('verdict', '', 'optional'), f('published', '', 'date'), f('updated', '', 'date'), ...['reportId', 'reporter', 'editor', 'image.src', 'image.alt', 'imageCaption'].map(key => f(key, '')), f('tags', '', 'lines')];
const seoFields = [f('title', ''), f('description', ''), f('image.src', ''), f('image.alt', ''), f('image.width', '', 'number'), f('image.height', '', 'number'), f('image.type', ''), f('noindex', '', 'boolean'), f('authorType', '')];

export function reportToParagraphs(report: Report): DocParagraph[] {
  const out: DocParagraph[] = [{ text: report.title, heading: 'TITLE' }];
  const heading = (text: string) => out.push({ text, heading: 'HEADING_1' });
  const body = (text: string) => out.push({ text });
  heading('基本資料');
  for (const field of metaFields) body(`${field.key}: ${Array.isArray(get(report, field.key)) ? get(report, field.key).join(' | ') : get(report, field.key) ?? ''}`);
  for (const [label, value] of [['查核結論', [report.finding]], ['摘要重點', report.summaryPoints], ['摘要結語', [report.summaryClose]]] as [string, string[]][]) { heading(label); value.forEach(body); }
  for (const [label, section] of [['背景', report.background], ...report.checkSections.map(section => ['查核', section])] as [string, Report['background']][]) {
    heading(`${label} [${section.id}] ${section.title}`);
    if (section.image) { body(`@image: ${section.image.src}`); body(`@alt: ${section.image.alt}`); }
    if (section.caption) body(`@caption: ${section.caption}`);
    section.paragraphs.forEach(body);
  }
  heading('參考來源');
  for (const source of report.sources) { out.push({ text: source.label, heading: 'HEADING_2' }); body(source.note); if (source.href) body(`@url: ${source.href}`); }
  heading('相關文章'); report.relatedSlugs.forEach(body);
  heading('SEO'); for (const field of seoFields) body(`${field.key}: ${get(report.seo, field.key)}`);
  return out;
}

export function convertReport(paragraphs: DocParagraph[], listings: Listings, expectedSlug: string): Report {
  const report: any = { summaryPoints: [], checkSections: [], sources: [], relatedSlugs: [] };
  let area = '', section: any, source: any;
  const seen = new Set<string>(), metadata: Record<string, string> = {}, seo: Record<string, string> = {};
  for (const p of paragraphs) {
    const text = p.text.trim(); if (!text) continue;
    if (p.heading === 'TITLE') { if (report.title) fail('文件只能有一個 TITLE 文章標題'); report.title = text; continue; }
    if (p.heading === 'HEADING_1') {
      const match = /^(背景|查核) \[([a-z0-9-]+)\] (.+)$/.exec(text);
      if (match) {
        area = match[1]; section = { id: match[2], title: match[3], paragraphs: [] };
        if (area === '背景') { if (report.background) fail('文件只能有一個背景段落'); report.background = section; }
        else report.checkSections.push(section);
      } else {
        if (!['基本資料', '查核結論', '摘要重點', '摘要結語', '參考來源', '相關文章', 'SEO'].includes(text)) fail(`不認得的標題 1：${text}`);
        if (seen.has(text)) fail(`文件區塊重複：${text}`); seen.add(text); area = text;
      }
      continue;
    }
    if (p.heading === 'HEADING_2' && area === '參考來源') { source = { label: text, note: '' }; report.sources.push(source); continue; }
    if (p.heading && /^HEADING_/.test(p.heading)) fail(`不支援的標題層級：${text}`);
    if (area === '基本資料' || area === 'SEO') {
      const at = text.indexOf(':'); if (at < 1) fail(`${area}欄位請使用 key: value`);
      const key = text.slice(0, at), value = text.slice(at + 1).trim(), target = area === 'SEO' ? seo : metadata;
      if (Object.hasOwn(target, key)) fail(`${area}欄位重複：${key}`);
      if (!(area === 'SEO' ? seoFields : metaFields).some(field => field.key === key)) fail(`${area}不認得的欄位：${key}`);
      target[key] = value;
    } else if (area === '摘要重點') report.summaryPoints.push(text);
    else if (area === '相關文章') report.relatedSlugs.push(text);
    else if (area === '查核結論' || area === '摘要結語') { const key = area === '查核結論' ? 'finding' : 'summaryClose'; report[key] = report[key] ? `${report[key]}\n${text}` : text; }
    else if (area === '背景' || area === '查核') {
      const match = /^@(image|alt|caption):\s*(.+)$/.exec(text);
      if (match) { const path = { image: 'image.src', alt: 'image.alt', caption: 'caption' }[match[1]]!; if (get(section, path)) fail(`段落 ${section.id} 重複 ${match[1]}`); set(section, path, match[2]); }
      else { if (text.startsWith('@')) fail(`不認得的段落圖片欄位：${text}`); section.paragraphs.push(text); }
    } else if (area === '參考來源') {
      if (!source) fail('每個參考來源請先加標題 2');
      if (text.startsWith('@url: ')) { if (source.href) fail(`來源 ${source.label} 重複網址`); source.href = text.slice(6); }
      else source.note += (source.note ? '\n' : '') + text;
    } else fail(`內容不屬於任何範本區塊：${text.slice(0, 50)}`);
  }
  for (const name of ['基本資料', '查核結論', '摘要重點', '摘要結語', '參考來源', '相關文章', 'SEO']) if (!seen.has(name)) fail(`文件缺少區塊：${name}`);
  for (const [fields, values, target] of [[metaFields, metadata, report], [seoFields, seo, report.seo = {}]] as [Field[], Record<string, string>, any][]) {
    for (const field of fields) { let value: any = values[field.key]; if (field.key === 'tags' && value !== undefined) value = value.split(' | ').join('\n'); const parsed = parse(value, field, `文件 ${field.key}`); if (parsed !== undefined) set(target, field.key, parsed); }
  }
  const parsed = validate<Report>(reportSchema, report, `文件 ${expectedSlug}`);
  if (parsed.slug !== expectedSlug) fail(`文件 slug ${parsed.slug} 與列表 ${expectedSlug} 不一致`);
  const story = listings.stories.find(story => story.slug === expectedSlug) ?? fail(`列表缺少 ${expectedSlug}`);
  for (const key of ['title', 'kind', 'category', 'verdict'] as const) if (parsed[key] !== story[key]) fail(`${expectedSlug} 的 ${key} 與試算表不一致`);
  if (parsed.published !== story.date) fail(`${expectedSlug} 刊登日期與試算表不一致`);
  if (parsed.updated < parsed.published) fail(`${expectedSlug} 更新日期早於刊登日期`);
  unique([parsed.background.id, ...parsed.checkSections.map(section => section.id)], `${expectedSlug} 段落代碼`);
  unique(parsed.relatedSlugs, `${expectedSlug} 相關文章`);
  for (const slug of parsed.relatedSlugs) if (slug === expectedSlug || !listings.stories.some(story => story.slug === slug)) fail(`${expectedSlug} 的相關文章 ${slug} 無效`);
  return parsed;
}
