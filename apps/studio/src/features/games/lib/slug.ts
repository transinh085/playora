/**
 * Join-link slug from a campaign name, so quick create never asks for one (docs/16 §4). A short
 * random suffix keeps two campaigns with the same name from colliding; it matches the `Slug` contract.
 */
export function slugFromName(name: string, suffix = randomSuffix()): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '');
  return `${base || 'chuong-trinh'}-${suffix}`;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6).padEnd(4, '0');
}
