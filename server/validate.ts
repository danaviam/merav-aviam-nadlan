import {
  CONTACT_LIMITS,
  DEAL_TYPES,
  PROPERTY_STATUSES,
  type ContactInput,
  type DealType,
  type PropertyInput,
  type PropertyStatus,
} from '../shared/types.js';
import { formatPhone, isValidPhone } from '../shared/phone.js';
import { HttpError } from './errors.js';

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const num = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(/[,\s₪]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

export function parsePropertyInput(raw: unknown): PropertyInput {
  let o: Record<string, unknown>;
  try {
    o = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>);
  } catch {
    throw new HttpError(400, 'נתוני הנכס אינם תקינים');
  }
  if (!o || typeof o !== 'object') throw new HttpError(400, 'נתוני הנכס אינם תקינים');

  const title = str(o.title, 120);
  if (!title) throw new HttpError(400, 'יש למלא כותרת לנכס');
  const city = str(o.city, 60);
  if (!city) throw new HttpError(400, 'יש למלא עיר');
  const price = num(o.price);
  if (price === null || price < 0) throw new HttpError(400, 'יש למלא מחיר תקין');

  const dealType: DealType = DEAL_TYPES.includes(o.dealType as DealType)
    ? (o.dealType as DealType)
    : 'sale';
  const status: PropertyStatus = PROPERTY_STATUSES.includes(o.status as PropertyStatus)
    ? (o.status as PropertyStatus)
    : 'active';

  return {
    title,
    description: str(o.description, 5000),
    dealType,
    propertyType: str(o.propertyType, 40) || 'דירה',
    city,
    neighborhood: str(o.neighborhood, 60),
    address: str(o.address, 120),
    price,
    rooms: num(o.rooms),
    sizeSqm: num(o.sizeSqm),
    floor: num(o.floor),
    totalFloors: num(o.totalFloors),
    features: Array.isArray(o.features)
      ? [...new Set(o.features.map((f) => str(f, 40)).filter(Boolean))].slice(0, 30)
      : [],
    images: Array.isArray(o.images)
      ? o.images.filter((s): s is string => typeof s === 'string').slice(0, 60)
      : [],
    featured: o.featured === true,
    status,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * ניקוי טקסט חופשי מהגולש: תווי בקרה בלתי נראים ותגיות HTML נמחקים, ושורות ריקות רצופות מצומצמות.
 * (התצוגה באתר ובמייל ממילא מציגה טקסט בלבד ולא מריצה HTML – זו שכבת הגנה נוספת)
 */
function cleanText(v: unknown, max: number, label: string, multiline = false): string {
  if (typeof v !== 'string') return '';
  let s = v
    .normalize('NFC')
    .replace(multiline ? /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g : /[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/[\u200B\u2028\u2029\uFEFF]/g, '')
    .replace(/<\/?[a-z!][^>]*>/gi, '')
    .trim();
  if (multiline) s = s.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  else s = s.replace(/\s+/g, ' ');
  if (s.length > max) throw new HttpError(400, `${label} ארוך מדי (עד ${max} תווים)`);
  return s;
}

export function parseContactInput(raw: unknown): ContactInput {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const L = CONTACT_LIMITS;
  const input: ContactInput = {
    name: cleanText(o.name, L.name, 'השם'),
    phone: cleanText(o.phone, L.phone, 'מספר הטלפון'),
    email: cleanText(o.email, L.email, 'האימייל'),
    message: cleanText(o.message, L.message, 'תוכן ההודעה', true),
    propertyId: str(o.propertyId, 60) || undefined,
    website: str(o.website, 200),
  };
  if (!input.name) throw new HttpError(400, 'יש למלא שם');
  if (/https?:\/\/|www\./i.test(input.name)) throw new HttpError(400, 'השם אינו תקין');
  if (!input.phone && !input.email) throw new HttpError(400, 'יש למלא טלפון או אימייל');
  if (input.phone && !isValidPhone(input.phone)) throw new HttpError(400, 'מספר הטלפון אינו תקין');
  if (input.phone) input.phone = formatPhone(input.phone);
  if (input.email && !EMAIL_RE.test(input.email)) throw new HttpError(400, 'כתובת האימייל אינה תקינה');
  return input;
}
