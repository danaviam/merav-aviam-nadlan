import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { app } from './app.js';
import { UPLOAD_DIR } from './db.js';

/* הרצה מקומית / שרת רגיל. ב-Vercel נכנסים דרך api/index.ts */

const PORT = Number(process.env.PORT) || 3001;

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }));

/* ---------- הגשת האתר בפרודקשן (אחרי npm run build) ---------- */

const DIST = path.resolve('dist');
if (fs.existsSync(path.join(DIST, 'index.html'))) {
  app.use(express.static(DIST, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    if (req.path.startsWith('/admin')) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
