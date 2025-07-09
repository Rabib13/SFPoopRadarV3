import type { VercelRequest, VercelResponse } from '@vercel/node';
import incidents from '../mock-data/incidents.json';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json(incidents);
} 