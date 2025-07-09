import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const possiblePaths = [
    path.join(process.cwd(), 'mock-data', 'incidents.json'),
    path.join(process.cwd(), '../mock-data', 'incidents.json'),
    path.join(__dirname, '../../mock-data/incidents.json'),
  ];
  let data = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      break;
    }
  }
  if (!data) {
    return res.status(500).json({ error: 'Could not find incidents.json' });
  }
  res.status(200).json(data);
} 