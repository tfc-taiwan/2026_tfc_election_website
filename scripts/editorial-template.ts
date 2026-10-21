import { createHash } from 'node:crypto';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import sharp from 'sharp';
import type { Definition, Image, ImageReference, PhrasingContent, RootContent } from 'mdast';
import { z } from 'zod';
import { reportSchema, type ContentBlock, type Listings, type Report } from '../src/data.ts';

export type ImageAsset = { path: string; bytes: Buffer };
export const editorialMetadataSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  reportId: z.string().min(1), updated: z.iso.date().nullable(), imageCaption: z.string().min(1),
  seo: reportSchema.shape.seo,
  finding: z.string().min(1).optional(), summaryClose: z.string().optional(),
  tags: z.array(z.string().min(1)).optional(), relatedSlugs: z.array(z.string()).optional(),
  sources: reportSchema.shape.sources.optional(),
}).strict();
export type EditorialMetadata = z.infer<typeof editorialMetadataSchema>;
type Run = Extract<ContentBlock, { type: 'paragraph' }>['content'][number];

function tree(markdown: string) { return fromMarkdown(markdown.replace(/^\uFEFF/, ''), { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }); }
function visibleText(nodes: PhrasingContent[]): string {
  return nodes.map(node => 'value' in node ? node.value : 'children' in node ? visibleText(node.children) : node.type === 'break' ? '\n' : '').join('').trim();
}
function textOf(node: RootContent): string { return node.type === 'paragraph' || node.type === 'heading' ? visibleText(node.children) : ''; }
export function isEditorialTemplate(markdown: string) { return tree(markdown).children.some(node => ['###內容起###', '###內容迄###'].includes(textOf(node))); }

function runs(nodes: PhrasingContent[], definitions: Map<string, Definition>, style: Partial<Run> = {}): Run[] {
  return nodes.flatMap((node): Run[] => {
    if (node.type === 'inlineCode') return node.value ? [{ ...style, text: node.value }] : [];
    if (node.type === 'text') return node.value.split(/(\*\*[^*\n]+\*\*)/g).filter(Boolean).map(value => /^\*\*[^*\n]+\*\*$/.test(value) ? { ...style, text: value.slice(2, -2), bold: true } : { ...style, text: value });
    if (node.type === 'break') return [{ ...style, text: '\n' }];
    if (node.type === 'strong' || node.type === 'emphasis') return runs(node.children, definitions, { ...style, [node.type === 'strong' ? 'bold' : 'italic']: true });
    if (node.type === 'link' || node.type === 'linkReference') {
      const href = node.type === 'link' ? node.url : definitions.get(node.identifier.toLowerCase())?.url;
      if (!href || !/^https?:\/\//.test(href)) throw new Error('內文連結必須是 HTTP 或 HTTPS 網址，且參照必須有定義');
      return runs(node.children, definitions, { ...style, href });
    }
    throw new Error(`不支援文章內的 ${node.type}，請勿使用註腳、HTML 或刪除線；圖片請獨立成段`);
  });
}

async function imageBlock(node: Image | ImageReference, definitions: Map<string, Definition>, assets: Map<string, ImageAsset>): Promise<Extract<ContentBlock, { type: 'image' }>> {
  let src = node.type === 'image' ? node.url : definitions.get(node.identifier.toLowerCase())?.url;
  if (!src) throw new Error('找不到內嵌圖片的參照定義');
  if (src.startsWith('data:')) {
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(src);
    if (!match) throw new Error('內嵌圖片僅接受 PNG、JPEG 或 WebP');
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > 20 * 1024 * 1024) throw new Error('單張內嵌圖片大小必須在 20 MB 以內');
    const info = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
    if (info.format !== match[1]) throw new Error('內嵌圖片的實際格式與 MIME 不符');
    const name = `imported/${createHash('sha256').update(bytes).digest('hex')}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
    assets.set(name, { path: name, bytes });
    src = `/images/${name}`;
  } else if (!src.startsWith('https://') && !src.startsWith('/images/')) throw new Error('圖片必須是內嵌圖片、HTTPS 網址或 /images/ 路徑');
  return { type: 'image', image: { src, alt: node.alt?.trim() || '' } };
}

async function blocks(nodes: RootContent[], definitions: Map<string, Definition>, assets: Map<string, ImageAsset>): Promise<ContentBlock[]> {
  const result: ContentBlock[] = [];
  for (const node of nodes) {
    if (node.type === 'paragraph') {
      const parts = node.children.filter(part => part.type !== 'text' || part.value.trim());
      if (!parts.length) continue;
      if (parts.length === 1 && (parts[0].type === 'image' || parts[0].type === 'imageReference')) result.push(await imageBlock(parts[0], definitions, assets));
      else result.push({ type: 'paragraph', content: runs(node.children, definitions) });
    } else if (node.type === 'heading' && node.depth === 5) {
      const preceding = result.at(-1), caption = textOf(node);
      if (preceding?.type !== 'image' || preceding.caption) throw new Error('標題 5 圖說必須緊接在一張圖片之後');
      if (!caption || /圖片文字要用|若格式跑掉/.test(caption)) throw new Error('請將標題 5 的圖說提示文字換成實際圖說');
      preceding.caption = caption;
      if (!preceding.image.alt) preceding.image.alt = caption;
    } else if (node.type === 'heading' && [3, 4].includes(node.depth)) {
      result.push({ type: 'heading', level: node.depth as 3 | 4, content: runs(node.children, definitions) });
    } else if (node.type === 'list') {
      const items = node.children.map(item => {
        if (item.checked != null || item.children.length !== 1 || item.children[0].type !== 'paragraph') throw new Error('文章清單不支援巢狀、多段或待辦勾選框');
        return runs(item.children[0].children, definitions);
      });
      result.push({ type: 'list', ordered: !!node.ordered, items });
    } else throw new Error(`不支援內容區域的 ${node.type}；編輯流程表格僅能放在「內容起」之前`);
  }
  for (const block of result) if (block.type === 'image' && !block.image.alt) throw new Error('文章圖片缺少替代文字，請補上緊接圖片的標題 5 圖說');
  return result;
}

function paragraphTexts(content: ContentBlock[]) {
  return content.flatMap(block => block.type === 'paragraph' ? [block.content.map(run => run.text).join('').trim()] : block.type === 'list' ? block.items.map(item => item.map(run => run.text).join('').trim()) : []).filter(Boolean);
}
function assertFilled(text: string, label: string) {
  if (!text || /若格式跑掉|查核點：標題內容|^下個標題$|網傳影片「」/.test(text)) throw new Error(`${label} 尚未填寫，不能把空白範本當成文章匯出`);
}

/** Import a heading-led guide without inventing newsroom template fields. */
export async function convertGuideMarkdown(markdown: string, listings: Listings, inputMetadata: unknown) {
  const meta = editorialMetadataSchema.parse(inputMetadata);
  const story = listings.stories.find(story => story.slug === meta.slug);
  if (!story || story.kind !== 'guide') throw new Error('指南必須對應列表內的 guide 文章');
  const nodes = tree(markdown).children;
  const title = nodes[0];
  if (title?.type !== 'heading' || title.depth !== 1 || textOf(title) !== story.title) throw new Error('指南標題與列表不一致');
  const definitions = new Map<string, Definition>();
  for (const node of nodes) if (node.type === 'definition') definitions.set(node.identifier.toLowerCase(), node);
  const intro: RootContent[] = [];
  const pieces: { title: string; nodes: RootContent[] }[] = [];
  for (const node of nodes.slice(1)) {
    if (node.type === 'definition') continue;
    if (node.type === 'heading' && node.depth === 3) pieces.push({ title: textOf(node), nodes: [] });
    else (pieces.length ? pieces.at(-1)!.nodes : intro).push(node);
  }
  const assets = new Map<string, ImageAsset>();
  const introBlocks = await blocks(intro, definitions, assets);
  const introText = paragraphTexts(introBlocks);
  if (!introText.length || !pieces.length) throw new Error('指南需要導言與至少一個標題 3 段落');
  const checkSections = await Promise.all(pieces.map(async (piece, i) => {
    const content = await blocks(piece.nodes, definitions, assets);
    const paragraphs = paragraphTexts(content);
    if (!paragraphs.length) throw new Error(`指南段落 ${piece.title} 缺少內文`);
    return { id: `check-${i + 1}`, title: piece.title, paragraphs, blocks: content };
  }));
  const report = reportSchema.parse({
    version: 1, isMock: listings.isMock, slug: story.slug, kind: story.kind, category: story.category,
    title: story.title, finding: story.description, tags: meta.tags ?? [story.tag],
    published: story.date, updated: meta.updated, reportId: meta.reportId,
    reporter: '未提供', editor: '未提供', image: story.image, imageCaption: meta.imageCaption, seo: meta.seo,
    summaryPoints: [story.description], summaryClose: '',
    background: { id: 'background', title: '背景', paragraphs: introText, blocks: introBlocks },
    checkSections, sources: meta.sources ?? [], relatedSlugs: meta.relatedSlugs ?? [],
  });
  return { report, assets: [...assets.values()] };
}

export async function convertEditorialTemplate(markdown: string, listings: Listings, inputMetadata: unknown): Promise<{ report: Report; assets: ImageAsset[] }> {
  const nodes = tree(markdown).children;
  const starts = nodes.flatMap((n, i) => textOf(n) === '###內容起###' ? [i] : []);
  const ends = nodes.flatMap((n, i) => textOf(n) === '###內容迄###' ? [i] : []);
  if (starts.length !== 1 || ends.length !== 1 || ends[0] <= starts[0]) throw new Error('每篇文章需要一組順序正確的 ###內容起### 與 ###內容迄###');
  if (!inputMetadata) throw new Error('這是記者上稿範本，請用 --metadata 指定以 Markdown 檔名為鍵的設定檔，提供 slug、reportId、updated、imageCaption 與 seo');
  const parsed = editorialMetadataSchema.safeParse(inputMetadata);
  if (!parsed.success) throw new Error('記者範本設定缺漏或格式錯誤：' + parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('；'));
  const meta = parsed.data;
  const story = listings.stories.find(s => s.slug === meta.slug);
  if (!story) throw new Error(`列表缺少 ${meta.slug}，請先加入文章列表`);
  const before = nodes.slice(0, starts[0]), after = nodes.slice(ends[0] + 1);
  const headlineLabel = before.findIndex(node => textOf(node) === '首頁標題直述句：');
  const titleLabel = before.findIndex(node => textOf(node) === '內文標題');
  const headline = before.slice(headlineLabel + 1, titleLabel).find(node => node.type === 'heading' && node.depth === 1);
  const titleArea = before.slice(titleLabel + 1);
  const lineDraft = titleArea.findIndex(node => textOf(node) === '（舊版）LINE首圖標題');
  const titleNode = titleArea.slice(0, lineDraft < 0 ? undefined : lineDraft).find(node => (node.type === 'paragraph' || node.type === 'heading') && textOf(node));
  if (headlineLabel < 0 || titleLabel <= headlineLabel || !headline || !titleNode) throw new Error('範本缺少「首頁標題直述句：」、標題 1 或「內文標題」正文');
  const homeTitle = textOf(headline), title = titleArea.slice(0, lineDraft < 0 ? undefined : lineDraft).map(textOf).filter(Boolean).join('\n');
  assertFilled(homeTitle, '首頁標題'); assertFilled(title, '內文標題');
  if (homeTitle.replace(/\s+/g, ' ').trim() !== story.title.replace(/\s+/g, ' ').trim()) throw new Error(`${meta.slug} 的首頁標題與文章列表不一致`);
  const byline = after.map(textOf).flatMap(text => text.split('\n').map(line => line.trim())).find(text => /^（記者[：:]/.test(text));
  const credits = byline && /^（記者[：:]\s*(.*?)\s*[；;]\s*責任編輯[：:]\s*(.*?)\s*）$/.exec(byline);
  if (!credits?.[1] || !credits[2]) throw new Error('請在「內容迄」之後填寫（記者：姓名；責任編輯：姓名）');
  const definitions = new Map<string, Definition>();
  for (const node of nodes) if (node.type === 'definition') definitions.set(node.identifier.toLowerCase(), node);
  // Tables, LINE copy, signatures and tests outside the two markers are editorial-only.
  const groups = new Map<string, RootContent[]>();
  let current = '';
  for (const node of nodes.slice(starts[0] + 1, ends[0])) {
    if (node.type === 'heading' && node.depth === 2) {
      current = textOf(node);
      if (!['摘要', '背景', '查核', '補充資料'].includes(current) || groups.has(current)) throw new Error(`不認得或重複的標題 2：${current}`);
      groups.set(current, []);
    } else if (current) groups.get(current)!.push(node);
    else if (textOf(node) || node.type !== 'paragraph') throw new Error('內容起之後，正文必須先放在標題 2「摘要」等區塊下');
  }
  for (const required of ['摘要', '背景', '查核']) if (!groups.has(required)) throw new Error(`缺少標題 2「${required}」`);
  const assets = new Map<string, ImageAsset>();
  const summaryBlocks = await blocks(groups.get('摘要')!, definitions, assets);
  const summaryPoints = paragraphTexts(summaryBlocks);
  if (!summaryPoints.length) throw new Error('摘要尚未填寫，不能把空白範本當成文章匯出');
  const section = async (id: string, heading: string, content: RootContent[]) => {
    assertFilled(heading, '段落標題');
    const parsedBlocks = await blocks(content, definitions, assets), paragraphs = paragraphTexts(parsedBlocks);
    if (!paragraphs.length) throw new Error(`「${heading}」缺少內文段落`);
    return { id, title: heading, paragraphs, blocks: parsedBlocks };
  };
  const sections = async (content: RootContent[], prefix: string, defaultTitle: string) => {
    const pieces: { title: string; nodes: RootContent[] }[] = [];
    for (const node of content) {
      if (node.type === 'heading' && node.depth === 3) pieces.push({ title: textOf(node), nodes: [] });
      else if (node.type !== 'paragraph' || node.children.some(p => p.type !== 'text' || p.value.trim())) {
        if (!pieces.length) pieces.push({ title: defaultTitle, nodes: [] });
        pieces.at(-1)!.nodes.push(node);
      }
    }
    return Promise.all(pieces.map((piece, i) => section(`${prefix}-${i + 1}`, piece.title, piece.nodes)));
  };
  const report: Report = {
    version: 1, isMock: listings.isMock, slug: meta.slug, kind: story.kind, category: story.category,
    title, finding: meta.finding ?? summaryPoints.at(-1)!, verdict: story.verdict,
    tags: meta.tags ?? [...new Set([story.verdict, story.tag].filter((s): s is string => !!s))],
    published: story.date, updated: meta.updated, reportId: meta.reportId, reporter: credits[1], editor: credits[2],
    image: story.image, imageCaption: meta.imageCaption, seo: meta.seo,
    summaryPoints, summaryClose: meta.summaryClose ?? '', summaryBlocks,
    background: await section('background', '背景', groups.get('背景')!),
    checkSections: await sections(groups.get('查核')!, 'check', '查核'),
    supplementarySections: await sections(groups.get('補充資料') ?? [], 'supplement', '補充資料'),
    sources: meta.sources ?? [], relatedSlugs: meta.relatedSlugs ?? [],
  };
  if (report.updated && report.published && report.updated < report.published) throw new Error('更新日期不能早於刊登日期');
  if (new Set(report.relatedSlugs).size !== report.relatedSlugs.length || report.relatedSlugs.some(slug => slug === report.slug || !listings.stories.some(story => story.slug === slug))) throw new Error('相關文章 slug 重複或不存在');
  return { report: reportSchema.parse(report), assets: [...assets.values()] };
}
