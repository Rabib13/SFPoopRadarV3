import type { VercelRequest, VercelResponse } from '@vercel/node';
import neighborhoods from '../mock-data/neighborhoods.json';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json(neighborhoods);
} 