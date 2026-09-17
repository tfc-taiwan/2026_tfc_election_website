import { z } from 'zod';

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
const category = z.enum(['地方選舉', '公投議題']);
const story = z.object({
  slug, kind: z.enum(['report', 'analysis', 'guide']), category, title: text,
  description: text, date, image, tag: text, tone, verdict: status.optional(),
});
const info = z.object({ id: slug, title: text, description: text, content: z.array(text).min(1) });

export const listingsSchema = z.object({
  version: z.literal(1), isMock: z.boolean(),
  seo: z.object({
    siteUrl: z.url().nullable(), language: text, locale: text,
    home: pageSeo, reports: pageSeo,
  }),
  site: z.object({ name: text, englishName: text, title: text, notice: text, footer: text }),
  navigation: z.array(z.object({ label: text, href: z.string().regex(/^\/(?:#[-a-z]+|reports)?$/) })),
  hero: z.object({ kicker: text, title: z.array(text).min(1), description: text, electionDate: date,
    facts: z.array(z.object({ title: text, description: text, tone })) }),
  stories: z.array(story).min(1),
  sections: z.object({
    reports: z.object({ title: text, categories: z.array(category).min(1), slugs: z.array(slug) }),
    analyses: z.object({ title: text, description: text, slugs: z.array(slug) }),
    rumors: z.object({ title: text, items: z.array(z.object({ id: slug, badge: text, label: text, tone, scriptId: slug })) }),
    scripts: z.object({ title: text, items: z.array(z.object({ id: slug, question: text, answer: text })) }),
    process: z.object({ title: text, items: z.array(info.extend({ icon: z.enum(['document', 'calendar', 'check', 'globe']), tone })) }),
    learning: z.object({ title: text, items: z.array(z.object({ slug, badge: text })) }),
    activities: z.object({ title: text, items: z.array(info.extend({ dateLabel: text, tag: text, cta: text, tone })) }),
  }),
});

const section = z.object({ id: slug, title: text, paragraphs: z.array(text).min(1), image: image.optional(), caption: text.optional() });
export const reportSchema = z.object({
  version: z.literal(1), isMock: z.boolean(), slug,
  seo: pageSeo.extend({ authorType: z.enum(['Person', 'Organization']) }),
  kind: z.enum(['report', 'analysis', 'guide']), category, title: text, finding: text,
  verdict: status.optional(), tags: z.array(text),
  published: date, updated: date, reportId: text, reporter: text, editor: text,
  image, imageCaption: text, summaryPoints: z.array(text).min(1), summaryClose: text,
  background: section, checkSections: z.array(section).min(1),
  sources: z.array(z.object({ label: text, note: text, href: z.url().refine(value => value.startsWith('https://')).optional() })), relatedSlugs: z.array(slug),
});

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

export function getListings(signal?: AbortSignal) { return fetchData('/data/listings.json', listingsSchema, signal); }
export async function getReport(id: string, signal?: AbortSignal) {
  if (!slug.safeParse(id).success) throw new DataError('找不到這篇內容', 404);
  const report = await fetchData(`/data/reports/${id}.json`, reportSchema, signal);
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
    terms.every(term => `${story.title} ${story.description} ${story.tag} ${story.category}`.normalize('NFKC').toLocaleLowerCase().includes(term)));
}
