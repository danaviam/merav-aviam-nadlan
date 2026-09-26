import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { app } from './app.js';
import { UPLOAD_DIR } from './db.js';

/* הרצה מקומית / שרת רגיל. ב-Vercel נכנסים דרך api/index.ts */

const PORT = Number(process.env.PORT) || 3001;

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }));

/* ---------- קבצי האתר בפרודקשן (אחרי npm run build). העמודים עצמם מוגשים דרך server/seo.ts ---------- */

const DIST = path.resolve('dist');
if (fs.existsSync(DIST)) app.use(express.static(DIST, { index: false, maxAge: '1h' }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
