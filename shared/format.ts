import type { Property } from './types.js';

const ils = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });

export const formatPrice = (p: Pick<Property, 'price' | 'dealType'>) =>
  p.price > 0 ? `${ils.format(p.price)}${p.dealType === 'rent' ? ' לחודש' : ''}` : 'המחיר בשיחה';

export const dealLabel = (p: Pick<Property, 'dealType' | 'status'>) => {
  if (p.status === 'sold') return p.dealType === 'rent' ? 'הושכר' : 'נמכר';
  return p.dealType === 'rent' ? 'להשכרה' : 'למכירה';
};

export const statusLabel: Record<Property['status'], string> = {
  active: 'מוצג באתר',
  sold: 'נמכר / הושכר',
  hidden: 'טיוטה (מוסתר)',
};

export const floorLabel = (p: Pick<Property, 'floor' | 'totalFloors'>) => {
  if (p.floor === null) return null;
  const f = p.floor === 0 ? 'קרקע' : `${p.floor}`;
  return p.totalFloors ? `קומה ${f} מתוך ${p.totalFloors}` : `קומה ${f}`;
};

/** "4 חדרים, 110 מ״ר" */
export const shortFacts = (p: Property) =>
  [p.rooms !== null && `${p.rooms} חדרים`, p.sizeSqm !== null && `${p.sizeSqm} מ״ר`]
    .filter(Boolean)
    .join(', ');

export const location = (p: Pick<Property, 'city' | 'neighborhood'>) =>
  p.neighborhood ? `${p.neighborhood}, ${p.city}` : p.city;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
