import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const dataPath = path.join(__dirname, 'mock-data', 'neighborhoods.json');
  let data = null;
  if (fs.existsSync(dataPath)) {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    res.status(200).json(data);
  } else {
    res.status(500).json({ error: 'Could not find neighborhoods.json', tried: dataPath });
  }
} 