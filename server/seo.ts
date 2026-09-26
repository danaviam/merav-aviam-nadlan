import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Request, Response, Router } from 'express';
import express from 'express';
import { dealLabel, formatPrice, location, shortFacts } from '../shared/format.js';
import type { Property } from '../shared/types.js';
import { SITE } from '../src/config.js';
import { readDb } from './db.js';

/**
 * SEO: כל עמוד באתר עובר כאן לפני שהוא נשלח לדפדפן, ומקבל כותרת, תיאור, תמונת שיתוף
 * ונתונים מובנים משלו – כדי שגוגל, וואטסאפ ופייסבוק יראו את פרטי העמוד גם בלי להריץ JavaScript.
 * כאן גם ה-sitemap.xml, ה-robots.txt, וסטטוס 404 אמיתי לעמודים שלא קיימים.
 */

export const seo: Router = express.Router();

/** הכתובת הציבורית של האתר. אפשר לקבוע ב-SITE_URL (למשל אחרי חיבור דומיין), אחרת לפי הבקשה */
function origin(req: Request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost';
  const proto = (req.headers['x-forwarded-proto'] as string) || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto.split(',')[0]}://${host.split(',')[0]}`;
}

/* ---------- תבנית ה-HTML של האתר ---------- */

// בבנייה index.html משנה את שמו ל-_app.html, כדי ש-Vercel לא יגיש אותו ישירות בכתובת "/"
const TEMPLATE_FILE = path.resolve('dist', '_app.html');
let template: string | null = null;

async function getTemplate(req: Request): Promise<string> {
  if (template) return template;
  try {
    template = await fs.readFile(TEMPLATE_FILE, 'utf8');
  } catch {
    // ב-Vercel הקובץ לא נמצא לצד הפונקציה, אבל הוא מוגש כקובץ סטטי מאותו אתר
    const res = await fetch(`${origin(req)}/_app.html`);
    if (!res.ok) throw new Error(`Could not load page template (${res.status})`);
    template = await res.text();
  }
  return template;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// בתוך <script> מספיק למנוע סגירה מוקדמת של התגית
const jsonLd = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

const clip = (s: string, max = 160) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

interface PageMeta {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
  type?: 'website' | 'article';
  structured?: unknown[];
}

function render(html: string, meta: PageMeta, base: string) {
  const url = base + meta.path;
  const image = meta.image && (meta.image.startsWith('http') ? meta.image : base + meta.image);
  const tags = [
    `<link rel="canonical" href="${esc(url)}" />`,
    meta.noindex && `<meta name="robots" content="noindex, nofollow" />`,
    `<meta property="og:type" content="${meta.type ?? 'website'}" />`,
    `<meta property="og:site_name" content="${esc(SITE.agentName)}" />`,
    `<meta property="og:locale" content="he_IL" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    image && `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    process.env.GOOGLE_SITE_VERIFICATION &&
      `<meta name="google-site-verification" content="${esc(process.env.GOOGLE_SITE_VERIFICATION)}" />`,
    ...(meta.structured ?? []).map(jsonLd),
  ].filter(Boolean);

  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(meta.description)}" />`)
    .replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
}

/* ---------- נתונים מובנים (Schema.org) ---------- */

// בקונפיג זה יכול להיות '' – ההמרה ל-string מונעת מ-TypeScript להסיק טיפוס ריק
const agentPhoto: string = SITE.agentPhoto;

function agentSchema(base: string) {
  const socials = Object.values(SITE.social).filter((u) => /^https:\/\/[^/]+\/.+/.test(u));
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${base}/#agent`,
    name: SITE.agentName,
    description: SITE.tagline,
    url: `${base}/`,
    telephone: SITE.phone,
    email: SITE.email,
    ...(agentPhoto && { image: agentPhoto.startsWith('http') ? agentPhoto : base + agentPhoto }),
    address: { '@type': 'PostalAddress', streetAddress: SITE.officeAddress, addressCountry: 'IL' },
    ...(socials.length && { sameAs: socials }),
  };
}

function propertySchema(p: Property, base: string) {
  const url = `${base}/property/${p.id}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: p.title,
    description: clip(p.description || p.title, 500),
    url,
    datePosted: p.createdAt,
    ...(p.images.length && { image: p.images.map((u) => (u.startsWith('http') ? u : base + u)) }),
    offers: {
      '@type': 'Offer',
      ...(p.price > 0 && { price: p.price, priceCurrency: 'ILS' }),
      businessFunction: p.dealType === 'rent' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell',
      availability: p.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      seller: { '@id': `${base}/#agent` },
    },
    about: {
      '@type': p.propertyType === 'בית פרטי' || p.propertyType === 'קוטג׳' ? 'SingleFamilyResidence' : 'Apartment',
      address: {
        '@type': 'PostalAddress',
        addressLocality: p.city,
        ...(p.address && { streetAddress: p.address }),
        addressCountry: 'IL',
      },
      ...(p.rooms !== null && { numberOfRooms: p.rooms }),
      ...(p.sizeSqm !== null && { floorSize: { '@type': 'QuantitativeValue', value: p.sizeSqm, unitCode: 'MTK' } }),
    },
  };
}

/* ---------- זיהוי העמוד ---------- */

const LEGAL: Record<string, { title: string; description: string }> = {
  '/privacy': { title: 'מדיניות פרטיות', description: `מדיניות הפרטיות של האתר של ${SITE.agentName}: איזה מידע נאסף, למה, ומה הזכויות שלכם.` },
  '/terms': { title: 'תנאי שימוש', description: `תנאי השימוש באתר של ${SITE.agentName}, ${SITE.tagline}.` },
  '/accessibility': { title: 'הצהרת נגישות', description: `הצהרת הנגישות של האתר של ${SITE.agentName} ופרטי רכז/ת הנגישות.` },
};

const homeDescription = `${SITE.agentName} – ${SITE.tagline}. דירות ובתים למכירה ולהשכרה, ליווי אישי עד החתימה. ${SITE.phone}`;

async function pageFor(pathname: string, base: string): Promise<{ status: number; meta: PageMeta }> {
  const p = pathname.replace(/\/+$/, '') || '/';

  if (p === '/') {
    const db = await readDb();
    const cover = db.properties.find((x) => x.status === 'active' && x.featured && x.images.length)?.images[0];
    return {
      status: 200,
      meta: {
        title: `${SITE.agentName} | ${SITE.tagline}`,
        description: clip(homeDescription),
        path: '/',
        image: agentPhoto || cover,
        structured: [agentSchema(base)],
      },
    };
  }

  const m = /^\/property\/([\w-]+)$/.exec(p);
  if (m) {
    const db = await readDb();
    const prop = db.properties.find((x) => x.id === m[1] && x.status !== 'hidden');
    if (prop) {
      const facts = [dealLabel(prop), location(prop), shortFacts(prop), formatPrice(prop)].filter(Boolean).join(' · ');
      return {
        status: 200,
        meta: {
          title: `${prop.title} | ${SITE.agentName}`,
          description: clip(`${facts}. ${prop.description}`),
          path: `/property/${prop.id}`,
          image: prop.images[0],
          type: 'article',
          structured: [propertySchema(prop, base)],
        },
      };
    }
  }

  if (LEGAL[p]) {
    return { status: 200, meta: { ...LEGAL[p], title: `${LEGAL[p].title} | ${SITE.agentName}`, path: p } };
  }

  if (p === '/admin' || p.startsWith('/admin/')) {
    return { status: 200, meta: { title: 'ניהול', description: '', path: p, noindex: true } };
  }

  return {
    status: 404,
    meta: { title: `העמוד לא נמצא | ${SITE.agentName}`, description: clip(homeDescription), path: p, noindex: true },
  };
}

/* ---------- נתיבים ---------- */

seo.get('/robots.txt', (req, res) => {
  res.type('text/plain').setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
  res.send(`User-agent: *\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${origin(req)}/sitemap.xml\n`);
});

seo.get('/sitemap.xml', async (req, res, next) => {
  try {
    const base = origin(req);
    const db = await readDb();
    const visible = db.properties.filter((p) => p.status !== 'hidden');
    const latest = visible.map((p) => p.updatedAt).sort().at(-1);
    const urls = [
      { loc: `${base}/`, lastmod: latest, priority: '1.0' },
      ...visible.map((p) => ({
        loc: `${base}/property/${p.id}`,
        lastmod: p.updatedAt,
        priority: p.status === 'sold' ? '0.4' : '0.8',
      })),
      ...Object.keys(LEGAL).map((p) => ({ loc: base + p, lastmod: undefined, priority: '0.2' })),
    ];
    const body = urls
      .map(
        (u) =>
          `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}<priority>${u.priority}</priority></url>`,
      )
      .join('\n');
    res.type('application/xml').setHeader('Cache-Control', 'public, max-age=0, s-maxage=600');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
  } catch (err) {
    next(err);
  }
});

/** כל עמוד באתר (לא קבצים, לא API) */
seo.get(/^\/(?!api\/|assets\/)[^.]*$/, async (req: Request, res: Response, next) => {
  try {
    const base = origin(req);
    const [html, { status, meta }] = await Promise.all([getTemplate(req), pageFor(req.path, base)]);
    if (meta.noindex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader(
      'Cache-Control',
      meta.path.startsWith('/admin') ? 'private, no-store' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=600',
    );
    res.status(status).type('html').send(render(html, meta, base));
  } catch (err) {
    next(err);
  }
});
