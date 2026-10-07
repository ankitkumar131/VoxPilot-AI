// Deterministic answer validation per question type (no LLM needed).
import { ScriptQuestion } from '../../db/types';

export interface ValidationResult { valid: boolean; reason?: string; normalized?: string; }

const YES = /^(yes|yeah|yep|sure|correct|right|absolutely|definitely|of course|i do|it is|that's right|true)\b/i;
const NO = /^(no|nope|not really|never|not yet|i don'?t|i do not|incorrect|false)\b/i;

export function validateAnswer(q: ScriptQuestion, raw: string): ValidationResult {
  const answer = raw.trim();
  if (!answer) return { valid: false, reason: 'empty answer' };
  if (q.validation) {
    try { if (!new RegExp(q.validation, 'i').test(answer)) return { valid: false, reason: 'does not match expected format' }; }
    catch { /* ignore bad regex */ }
  }
  switch (q.type) {
    case 'yes_no':
    case 'confirmation':
      if (YES.test(answer)) return { valid: true, normalized: 'yes' };
      if (NO.test(answer)) return { valid: true, normalized: 'no' };
      return { valid: false, reason: 'expected a yes/no answer' };
    case 'number': {
      const m = answer.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
      if (!m) return { valid: false, reason: 'expected a number' };
      const n = parseFloat(m[0]);
      if (q.min !== undefined && n < q.min) return { valid: false, reason: `number below minimum ${q.min}` };
      if (q.max !== undefined && n > q.max) return { valid: false, reason: `number above maximum ${q.max}` };
      return { valid: true, normalized: String(n) };
    }
    case 'rating': {
      const m = answer.match(/\d+/);
      const max = q.max ?? 5;
      if (!m) return { valid: false, reason: `expected a rating 1-${max}` };
      const n = parseInt(m[0], 10);
      if (n < 1 || n > max) return { valid: false, reason: `rating must be between 1 and ${max}` };
      return { valid: true, normalized: String(n) };
    }
    case 'email':
      return /\S+@\S+\.\S+/.test(answer) ? { valid: true, normalized: answer.match(/\S+@\S+\.\S+/)![0] } : { valid: false, reason: 'expected an email address' };
    case 'phone': {
      const digits = answer.replace(/\D/g, '');
      return digits.length >= 7 ? { valid: true, normalized: digits } : { valid: false, reason: 'expected a phone number' };
    }
    case 'date': {
      const d = new Date(answer);
      return isNaN(d.getTime()) ? { valid: false, reason: 'expected a date' } : { valid: true, normalized: d.toISOString().slice(0, 10) };
    }
    case 'multiple_choice': {
      if (!q.options?.length) return { valid: true };
      const hit = q.options.find(o => answer.toLowerCase().includes(o.toLowerCase()));
      return hit ? { valid: true, normalized: hit } : { valid: false, reason: `expected one of: ${q.options.join(', ')}` };
    }
    default:
      return { valid: true };
  }
}
