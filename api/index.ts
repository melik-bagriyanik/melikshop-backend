import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/index';
import { connectDB } from '../src/utils/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await connectDB();
  } catch (err) {
    // ignore to allow health routes to respond even if db down
  }
  // Provide a friendly root response
  if (req.url === '/' || req.url === '') {
    return res.status(200).json({ success: true, message: 'MelikShop API', docs: '/api/health' });
  }
  // Let Express handle the request
  // @ts-ignore - express types differ from vercel types but are compatible at runtime
  return app(req, res);
}


