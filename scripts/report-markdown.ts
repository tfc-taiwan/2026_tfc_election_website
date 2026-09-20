import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import type { PhrasingContent } from 'mdast';
import type { DocParagraph } from './sheets-core.ts';

function inlineText(nodes: PhrasingContent[]): string {
  return nodes.map(node => {
    switch (node.type) {
      case 'text': case 'inlineCode': return node.value;
      case 'break': return '\n';
      case 'emphasis': case 'strong': return inlineText(node.children);
      case 'link': {
        const label = inlineText(node.children);
        if (label !== node.url || node.title) throw new Error('不支援帶顯示文字的行內連結；請將來源網址填入 @url: 欄位');
        return label;
      }
      default: throw new Error(`不支援 Markdown ${node.type}；圖片請填 @image: 路徑，勿嵌入圖片或註腳`);
    }
  }).join('');
}

// Google Docs date chips export as localized text rather than ISO dates.
export function normalizeExportedDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const chinese = /^(\d{1,2})月\s*(\d{1,2}),\s*(\d{4})$/.exec(value);
  const ymd = /^(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日$/.exec(value);
  const english = /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2}),\s*(\d{4})$/i.exec(value);
  let parts: string[];
  if (chinese) parts = [chinese[3], chinese[1], chinese[2]];
  else if (ymd) parts = [ymd[1], ymd[2], ymd[3]];
  else if (english) parts = [english[3], String(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(english[1].slice(0, 3).toLowerCase()) + 1), english[2]];
  else throw new Error(`無法辨識日期「${value}」；請在 Google Docs 將日期改成 YYYY-MM-DD`);
  return parts.map((part, index) => part.padStart(index === 0 ? 4 : 2, '0')).join('-');
}

export function paragraphsFromMarkdown(markdown: string): DocParagraph[] {
  const tree = fromMarkdown(markdown.replace(/^\uFEFF/, ''), { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  const paragraphs: DocParagraph[] = [];
  let area = '';
  for (const node of tree.children) {
    if (node.type === 'heading') {
      const text = inlineText(node.children).trim();
      if (!paragraphs.length) {
        if (node.depth !== 1 || !text) throw new Error('文件第一個區塊必須是文章標題（# 標題）');
        paragraphs.push({ text, heading: 'TITLE' });
      } else {
        if (node.depth === 1) area = text;
        paragraphs.push({ text, heading: `HEADING_${node.depth}` });
      }
    } else if (node.type === 'paragraph') {
      let text = inlineText(node.children).trim();
      if (!text) continue;
      if (!paragraphs.length) throw new Error('文件第一個區塊必須是文章標題（# 標題）');
      if (area === '基本資料') text = text.replace(/^(published|updated):\s*(.+)$/, (_, key, value) => `${key}: ${normalizeExportedDate(value)}`);
      paragraphs.push({ text });
    } else if (node.type === 'list' && ['摘要重點', '相關文章'].includes(area)) {
      for (const item of node.children) {
        if (item.checked != null || item.children.length !== 1 || item.children[0].type !== 'paragraph') throw new Error('清單每一項只支援一個段落，不支援巢狀清單或待辦勾選框');
        const text = inlineText(item.children[0].children).trim();
        if (!text) throw new Error('清單項目不可空白');
        paragraphs.push({ text });
      }
    } else {
      throw new Error(`不支援 Markdown ${node.type}；請依範本使用標題、段落及摘要清單`);
    }
  }
  if (!paragraphs.length) throw new Error('Markdown 文件沒有文章內容');
  return paragraphs;
}

export function reportSlug(paragraphs: DocParagraph[]): string {
  let metadata = false;
  const slugs: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.heading) metadata = paragraph.heading === 'HEADING_1' && paragraph.text === '基本資料';
    else if (metadata && /^slug:/.test(paragraph.text)) slugs.push(paragraph.text.slice(5).trim());
  }
  if (slugs.length !== 1 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugs[0])) throw new Error('基本資料必須有唯一且有效的 slug: 欄位');
  return slugs[0];
}
