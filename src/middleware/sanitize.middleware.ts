import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

type Primitive = string | number | boolean | null | undefined;

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return xss(value, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
    });
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }

  return value as Primitive;
};

export const sanitizeInputs = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) req.body = sanitizeValue(req.body) as any;
  if (req.query) req.query = sanitizeValue(req.query) as any;
  if (req.params) req.params = sanitizeValue(req.params) as any;
  next();
};


