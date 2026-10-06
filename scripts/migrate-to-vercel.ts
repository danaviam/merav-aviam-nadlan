/**
 * העברה חד-פעמית של הנתונים המקומיים (data/db.json + data/uploads) לענן:
 * התמונות עולות ל-Supabase Storage והנכסים והפניות נשמרים בטבלת kv ב-Supabase.
 *
 * לפני ההרצה:  npx vercel env pull .env.local   (מוריד את מפתחות Supabase מהפרויקט ב-Vercel)
 * הרצה:        npm run migrate
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const { supabase, BUCKET, cloudUploadUrl, DATA_DIR, UPLOAD_DIR, updateDb } = await import('../server/db.js');

if (!supabase) {
  console.error('חסרים מפתחות של Supabase ב-.env.local. הריצו קודם: npx vercel env pull .env.local');
  process.exit(1);
}

await supabase.storage
  .createBucket(BUCKET, { public: true })
  .then(({ error }) => error && !/exist/i.test(error.message) && console.warn(error.message));

const local = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'db.json'), 'utf8'));
const mime = (n: string) => ({ '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif' })[path.extname(n)] ?? 'application/octet-stream';
const moved = new Map<string, string>();

for (const p of local.properties ?? []) {
  const images: string[] = [];
  for (const url of p.images as string[]) {
    if (!url.startsWith('/uploads/')) {
      images.push(url);
      continue;
    }
    if (!moved.has(url)) {
      const name = path.basename(url);
      const file = await fs.readFile(path.join(UPLOAD_DIR, name)).catch(() => null);
      if (!file) {
        console.warn(`התמונה ${url} לא נמצאה, מדלגים`);
        continue;
      }
      const key = `properties/${name}`;
      const { error } = await supabase.storage.from(BUCKET).upload(key, file, { contentType: mime(name), upsert: true });
      if (error) throw error;
      moved.set(url, cloudUploadUrl(key));
      console.log(`הועלתה ${name}`);
    }
    images.push(moved.get(url)!);
  }
  p.images = images;
}

await updateDb((db) => {
  db.properties = local.properties ?? [];
  db.messages = local.messages ?? [];
});
console.log(`הסתיים: ${local.properties?.length ?? 0} נכסים, ${local.messages?.length ?? 0} פניות, ${moved.size} תמונות.`);
