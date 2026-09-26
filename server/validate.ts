import {
  DEAL_TYPES,
  PROPERTY_STATUSES,
  type ContactInput,
  type DealType,
  type PropertyInput,
  type PropertyStatus,
} from '../shared/types.js';
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

export function parseContactInput(raw: unknown): ContactInput {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const input: ContactInput = {
    name: str(o.name, 80),
    phone: str(o.phone, 30),
    email: str(o.email, 120),
    message: str(o.message, 3000),
    propertyId: str(o.propertyId, 60) || undefined,
    website: str(o.website, 200),
  };
  if (!input.name) throw new HttpError(400, 'יש למלא שם');
  if (!input.phone && !input.email) throw new HttpError(400, 'יש למלא טלפון או אימייל');
  if (input.phone && !/^[\d+\-\s()]{7,}$/.test(input.phone))
    throw new HttpError(400, 'מספר הטלפון אינו תקין');
  if (input.email && !EMAIL_RE.test(input.email)) throw new HttpError(400, 'כתובת האימייל אינה תקינה');
  return input;
}
