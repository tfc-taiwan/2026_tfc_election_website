import type { Listings } from './data.ts';

export function infographicPath(slug: string, number: number): string {
  return `/infographics/${slug}/${number}`;
}

export function infographicPaths(data: Listings): string[] {
  return (data.sections.infographics?.items ?? []).flatMap(group =>
    group.cards.map((_, index) => infographicPath(group.slug, index + 1)));
}

export function resolveInfographic(data: Listings, path: string) {
  const match = /^\/infographics\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([1-9]\d*)$/.exec(path);
  if (!match) return null;
  const group = data.sections.infographics?.items?.find(item => item.slug === match[1]);
  const story = data.stories.find(item => item.slug === match[1]) ?? null;
  const number = Number(match[2]);
  if (!group || !Number.isSafeInteger(number) || number > group.cards.length) return null;
  return { group, story, card: group.cards[number - 1], number };
}
