import type { Listings, Report } from './data.ts';
import type { SeoContext } from './seo.ts';

export type RenderState = {
  data: Listings;
  report: Report | null;
  status: number;
  now: string;
  context: SeoContext;
};
