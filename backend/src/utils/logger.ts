import winston from 'winston';

const SENSITIVE = /(api[_-]?key|secret|token|password|authorization)/i;

function redact(obj: unknown): unknown {
  if (typeof obj === 'string') return obj.length > 200 ? obj.slice(0, 200) + '…' : obj;
  if (Array.isArray(obj)) return obj.map(redact);
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = SENSITIVE.test(k) ? '•••redacted•••' : redact(v);
    }
    return out;
  }
  return obj;
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...rest }) => {
      const extra = Object.keys(rest).length ? ` ${JSON.stringify(redact(rest))}` : '';
      return `${timestamp} [${level}] ${message}${extra}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});
