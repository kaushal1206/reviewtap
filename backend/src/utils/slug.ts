export function generateSlug(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word chars except spaces & dashes
    .replace(/[\s_-]+/g, '-') // collapse whitespace and underscores to single dash
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes

  // Add short random suffix (4 alphanumeric chars) to prevent slug collision
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${base || 'business'}-${randomSuffix}`;
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
