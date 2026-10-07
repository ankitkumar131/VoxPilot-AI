import { v4 as uuidv4 } from 'uuid';

export function newId(prefix = ''): string {
  const id = uuidv4().replace(/-/g, '').slice(0, 24);
  return prefix ? `${prefix}_${id}` : id;
}

export function nowIso(): string {
  return new Date().toISOString();
}
