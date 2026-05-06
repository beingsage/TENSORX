import { randomBytes } from 'crypto';

export function generateId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`.toUpperCase();
}

export function generateSessionToken() {
  return randomBytes(32).toString('hex');
}

export function slugify(input: string) {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || generateId('SLUG').toLowerCase();
}
