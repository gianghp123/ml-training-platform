import * as path from 'node:path';

export function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const name = path.basename(filename, ext);

  const sanitized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-zA-Z0-9]+/g, '-')  // spaces & symbols -> -
    .replace(/^-+|-+$/g, '')         // trim -
    .replace(/-+/g, '-')             // collapse --
    .toLowerCase();

  return `${sanitized}${ext}`;
}
