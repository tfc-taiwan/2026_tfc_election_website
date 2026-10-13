import { readFile } from 'node:fs/promises';
import type { Report } from '../../src/data.ts';

// Real Google Docs Markdown export, downloaded 2026-09-20; fill a local copy only.
export const editorialTemplate = await readFile(new URL('./editorial-template.md', import.meta.url), 'utf8');
export const sampleReport: Report = JSON.parse(await readFile(new URL('./demo-data.json', import.meta.url), 'utf8')).reports['ai-voice'];
export const sampleMetadata = {
  slug: sampleReport.slug, reportId: sampleReport.reportId, updated: sampleReport.updated,
  imageCaption: sampleReport.imageCaption, seo: sampleReport.seo, finding: sampleReport.finding,
  tags: sampleReport.tags, relatedSlugs: sampleReport.relatedSlugs, sources: sampleReport.sources,
};
export const sampleTitle = '【虛構範本測試】這段音檔能證明候選人說過什麼嗎？';
export const sampleMarkdown = editorialTemplate
  .replace('若格式跑掉，請選「標題1」', sampleReport.title)
  .replace('網傳影片「」？', sampleTitle)
  .replace('## **摘要**', `## **摘要**\n\n${sampleReport.summaryPoints.map(p => `* ${p}`).join('\n\n')}`)
  .replace('## **背景**', `## **背景**\n\n${sampleReport.background.paragraphs[0]}`)
  .replace('##### *圖片文字要用「標題5」，且文字跟圖片要緊貼著，系統才會自動抓到*', `##### *圖一：範本原有的占位圖片，僅供測試。*\n\n${sampleReport.background.paragraphs[1]}`)
  .replace('### **查核點：標題內容，若格式跑掉，請選「標題3」**', `### **${sampleReport.checkSections[0].title}**\n\n${sampleReport.checkSections[0].paragraphs[0]}\n\n這是 **虛構素材**；[來源格式示範](https://example.org/evidence) 僅供測試。`)
  .replace('### **下個標題**', `### **${sampleReport.checkSections[1].title}**\n\n${sampleReport.checkSections[1].paragraphs[0]}`)
  .replace('##### *圖片文字要用「標題5」，且文字跟圖片要緊貼著，系統才會自動抓到*', '##### *圖二：同一張占位圖片，不是真實鑑定結果。*')
  .replace('### **查核點：標題內容**', `### **${sampleReport.checkSections[2].title}**\n\n${sampleReport.checkSections[2].paragraphs[0]}`)
  .replace('### **查核點：標題內容，若格式跑掉，請選「標題3」**', '### **範本測試補充說明**\n\n本篇內容完全虛構，不涉及真實候選人。\n\n1. 保留 *圖片原始比例*。\n2. 依文件中的段落順序呈現。')
  .replace('（記者：；責任編輯：）', `（記者：${sampleReport.reporter}；責任編輯：${sampleReport.editor}）`);
