import { z } from 'zod';
import { publicPath } from './paths.ts';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const text = z.string().min(1);
const tone = z.enum(['cyan', 'magenta']);
const date = z.iso.date();
const image = z.object({ src: z.string().refine(value => value.startsWith('/images/') || /^https:\/\//.test(value), 'Use a local /images/ path or HTTPS image URL'), alt: text });
const shareImage = image.extend({
  src: z.string().regex(/^(?:\/images\/|https:\/\/).+\.(?:png|jpe?g|webp)(?:\?.*)?$/i),
  width: z.number().int().positive(), height: z.number().int().positive(),
  type: z.enum(['image/png', 'image/jpeg', 'image/webp']),
});
const pageSeo = z.object({ title: text, description: text, image: shareImage, noindex: z.boolean().default(false) });
const status = z.enum(['錯誤', '部分錯誤', '事實釐清', '正確']);
const category = z.enum(['地方選舉', '深偽倡議', '公投議題', '辯論會查核', '選舉工具箱']);
function validateArticleFields(value: { kind: string; category?: string; verdict?: string }, ctx: z.RefinementCtx) {
  if (value.kind === 'report' && !value.category) ctx.addIssue({ code: 'custom', path: ['category'], message: '查核報告須填主題；非查核文章可留白' });
  if (value.kind !== 'report' && value.verdict) ctx.addIssue({ code: 'custom', path: ['verdict'], message: '非查核文章不使用查核結果，請留白' });
}
const youtubeId = /^[A-Za-z0-9_-]{11}$/;

export function youtubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0] ?? '';
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      id = url.pathname === '/watch' ? url.searchParams.get('v') ?? '' : /^\/(?:shorts|embed)\/([^/]+)/.exec(url.pathname)?.[1] ?? '';
    }
    return youtubeId.test(id) ? id : null;
  } catch {
    return null;
  }
}

const youtubeUrl = z.url().refine(value => youtubeVideoId(value) !== null, '請填有效的 YouTube 影片或 Shorts 連結');
const socialLink = z.object({ label: text, url: z.url().refine(value => value.startsWith('https://'), '社群連結必須使用 HTTPS') });
const story = z.object({
  slug, kind: z.enum(['report', 'analysis', 'guide']), category: category.optional(), title: text,
  description: text, date: date.nullable(), image: image.nullable(), tag: text, tone, verdict: status.optional(),
}).superRefine(validateArticleFields);
const editorialLink = z.string().refine(value => /^https:\/\//.test(value) || /^\/reports\/[a-z0-9-]+$/.test(value), 'Use HTTPS or a local article URL');
const info = z.object({ id: slug, title: text, description: text, content: z.array(text).min(1), href: editorialLink.optional() });

const initiativeContentSchema = z.object({
    eyebrow: text, titlePrefix: text, titleAccent: text, principlesTitle: text, casesTitle: text,
    reasons: z.array(z.object({ title: text, description: text })).min(1),
    groups: z.array(z.object({ title: text, items: z.array(text).min(1) })).length(2),
    cases: z.array(z.object({ country: text, date: text, text })).min(1),
    fullTextUrl: editorialLink.optional(),
    principlesNote: text.optional(),
  });
export const listingsSchema = z.object({
  version: z.literal(1), isMock: z.boolean(),
  seo: z.object({
    siteUrl: z.url().nullable(), language: text, locale: text,
    home: pageSeo, reports: pageSeo,
  }),
  site: z.object({ name: text, englishName: text, title: text, notice: text, footer: text, donationUrl: z.url().startsWith('https://').default('https://tfc-taiwan.oen.tw/'), socialLinks: z.array(socialLink).min(1) }),
  navigation: z.array(z.object({ label: text, href: z.string().regex(/^\/(?:#[-a-z]+|reports)?$/), children: z.array(z.object({ label: text, href: z.string().regex(/^\/(?:#[-a-z]+|reports)?$/) })).optional() })),
  hero: z.object({ factsTitle: text.default('選舉基本資訊'), kicker: text, title: z.array(text).min(1), description: text, electionDate: date,
    facts: z.array(z.object({ title: text, description: text, tone })) }),
  stories: z.array(story).min(1),
  sections: z.object({
    initiative: z.object({ title: text, description: text, content: initiativeContentSchema.optional(), featuredSlug: slug.optional() }).optional(),
    reports: z.object({ title: text, categories: z.array(category).min(1), items: z.array(z.object({ slug, title: text.optional() })) }),
    analyses: z.object({ title: text, description: text, slugs: z.array(slug) }),
    shorts: z.object({ title: text, description: text, items: z.array(z.object({ title: text, url: youtubeUrl })).min(1) }).optional(),
    infographics: z.object({ pendingItems: z.array(z.object({ slug, title: text, count: z.number().int().positive() })).optional(), title: text, description: text, slugs: z.array(slug), items: z.array(z.object({ slug, title: text, description: text.optional(), cards: z.array(z.object({ image, caption: text })).min(1) })).optional() }).optional(),
    rumors: z.object({ title: text, items: z.array(z.object({ id: slug, badge: text, label: text, tone, scriptId: slug })) }),
    scripts: z.object({ title: text, items: z.array(z.object({ id: slug, question: text, answer: text, href: editorialLink.optional() })) }),
    process: z.object({ title: text, items: z.array(info.extend({ icon: z.enum(['document', 'calendar', 'check', 'globe']), tone })) }),
    learning: z.object({ title: text, items: z.array(z.object({ slug, badge: text })), resources: z.array(z.object({ title: text, description: text, href: editorialLink.optional() })).optional() }),
    activities: z.object({ title: text, items: z.array(info.extend({ dateLabel: text, tag: text, cta: text.optional(), tone })) }),
  }),
}).superRefine((value, ctx) => {
  const reportSlugs = value.sections.reports.items.map(item => item.slug);
  if (new Set(reportSlugs).size !== reportSlugs.length) {
    ctx.addIssue({ code: 'custom', path: ['sections', 'reports', 'items'], message: '首頁查核報告不可重複' });
  }
  const shortUrls = value.sections.shorts?.items.map(item => item.url) ?? [];
  if (new Set(shortUrls).size !== shortUrls.length) {
    ctx.addIssue({ code: 'custom', path: ['sections', 'shorts', 'items'], message: '首頁短影音連結不可重複' });
  }
  const socialLabels = value.site.socialLinks.map(item => item.label);
  const socialUrls = value.site.socialLinks.map(item => item.url);
  if (new Set(socialLabels).size !== socialLabels.length || new Set(socialUrls).size !== socialUrls.length) {
    ctx.addIssue({ code: 'custom', path: ['site', 'socialLinks'], message: '社群名稱與連結不可重複' });
  }
  const gallery = value.sections.infographics;
  if (!gallery?.items) return;
  const expected = gallery.slugs;
  const actual = gallery.items.map(item => item.slug);
  if (new Set(actual).size !== actual.length || actual.length !== expected.length || actual.some((item, index) => item !== expected[index])) {
    ctx.addIssue({ code: 'custom', path: ['sections', 'infographics', 'items'], message: '圖卡組別必須與 infographics.slugs 完全一致且順序相同' });
  }
});

const inline = z.object({ text, href: z.url().refine(value => /^https?:\/\//.test(value)).optional(), bold: z.boolean().optional(), italic: z.boolean().optional() });
export const contentBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), content: z.array(inline).min(1) }),
  z.object({ type: z.literal('heading'), level: z.union([z.literal(3), z.literal(4)]), content: z.array(inline).min(1) }),
  z.object({ type: z.literal('list'), ordered: z.boolean(), items: z.array(z.array(inline).min(1)).min(1) }),
  z.object({ type: z.literal('image'), image, caption: text.optional() }),
]);
export type ContentBlock = z.infer<typeof contentBlockSchema>;
const section = z.object({ id: slug, title: text, paragraphs: z.array(text).min(1), image: image.optional(), caption: text.optional(), blocks: z.array(contentBlockSchema).min(1).optional() });
export const reportSchema = z.object({
  initiativeContent: initiativeContentSchema.optional(),
  version: z.literal(1), isMock: z.boolean(), slug,
  seo: pageSeo.extend({ authorType: z.enum(['Person', 'Organization']) }),
  kind: z.enum(['report', 'analysis', 'guide']), category: category.optional(), title: text, finding: text,
  verdict: status.optional(), tags: z.array(text),
  published: date.nullable(), updated: date.nullable(), reportId: text, reporter: text, editor: text,
  image: image.nullable(), imageCaption: text, summaryPoints: z.array(text).min(1), summaryClose: z.string(), summaryBlocks: z.array(contentBlockSchema).min(1).optional(),
  presentation: z.object({ showReportMetadata: z.boolean().optional(), showSummary: z.boolean().optional() }).optional(),
  background: section, checkSections: z.array(section).min(1),
  supplementarySections: z.array(section).optional(),
  sources: z.array(z.object({ label: text, note: text, href: z.url().refine(value => value.startsWith('https://')).optional() })), relatedSlugs: z.array(slug),
}).superRefine(validateArticleFields);

export type Listings = z.infer<typeof listingsSchema>;
export type Story = z.infer<typeof story>;
export type Report = z.infer<typeof reportSchema>;
export type Info = z.infer<typeof info>;

export class DataError extends Error {
  status: number;
  constructor(message: string, status = 500) { super(message); this.status = status; }
}

async function fetchData<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, cache: 'no-cache' });
  if (!response.ok) throw new DataError(response.status === 404 ? '找不到這篇內容' : '暫時無法載入資料', response.status);
  let data: unknown;
  try { data = await response.json(); } catch { throw new DataError('資料檔不存在或格式不正確', 404); }
  const result = schema.safeParse(data);
  if (!result.success) throw new DataError('內容資料格式不正確，請稍後再試');
  return result.data;
}

export function getListings(signal?: AbortSignal) { return fetchData(publicPath('/data/listings.json'), listingsSchema, signal); }
export async function getReport(id: string, signal?: AbortSignal) {
  if (!slug.safeParse(id).success) throw new DataError('找不到這篇內容', 404);
  const report = await fetchData(publicPath(`/data/reports/${id}.json`), reportSchema, signal);
  if (report.slug !== id) throw new DataError('內容識別碼不一致');
  return report;
}

export function daysUntil(electionDate: string, now = new Date()): number {
  const taipeiDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return Math.max(0, Math.round((Date.parse(electionDate) - Date.parse(taipeiDate)) / 86_400_000));
}

export function searchStories(stories: Story[], query: string, categoryFilter = '全部'): Story[] {
  const terms = query.trim().normalize('NFKC').toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return stories.filter(story => (categoryFilter === '全部' || story.category === categoryFilter) &&
    terms.every(term => `${story.title} ${story.description} ${story.tag} ${story.category ?? ''}`.normalize('NFKC').toLocaleLowerCase().includes(term)));
}
