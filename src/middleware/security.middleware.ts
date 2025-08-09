import { Request, Response, NextFunction } from 'express';

// Enforce HTTPS in production behind proxies like Nginx/Heroku
export const enforceHttps = (req: Request, res: Response, next: NextFunction): void => {
  const isProduction = process.env['NODE_ENV'] === 'production';
  if (!isProduction) return next();

  // If behind proxy, trust X-Forwarded-Proto
  const proto = (req.headers['x-forwarded-proto'] as string) || (req.protocol as string);
  if (proto && proto.toLowerCase() !== 'https') {
    const host = req.headers['host'];
    const url = `https://${host}${req.originalUrl}`;
    return res.redirect(301, url);
  }

  next();
};


