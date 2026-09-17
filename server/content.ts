import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listingsSchema, reportSchema, type Listings, type Report } from '../src/data.ts';

export function readListings(dataDir: string): Listings {
  return listingsSchema.parse(JSON.parse(readFileSync(resolve(dataDir, 'listings.json'), 'utf8')));
}
export function readReport(dataDir: string, slug: string): Report | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  try {
    const report = reportSchema.parse(JSON.parse(readFileSync(resolve(dataDir, 'reports', `${slug}.json`), 'utf8')));
    if (report.slug !== slug) throw new Error('Report filename and slug do not match.');
    return report;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
export function readReports(dataDir: string, data: Listings): Report[] {
  return data.stories.map(story => {
    const report = readReport(dataDir, story.slug);
    if (!report) throw new Error(`Missing report: ${story.slug}`);
    return report;
  });
}
