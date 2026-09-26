export const DEAL_TYPES = ['sale', 'rent'] as const;
export type DealType = (typeof DEAL_TYPES)[number];

/** active = מוצג באתר, sold = מוצג כ"נמכר/הושכר", hidden = טיוטה שלא מופיעה באתר */
export const PROPERTY_STATUSES = ['active', 'sold', 'hidden'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const PROPERTY_TYPES = [
  'דירה',
  'דירת גן',
  'פנטהאוז',
  'דופלקס',
  'בית פרטי',
  'קוטג׳',
  'מגרש',
  'מסחרי',
];

export const FEATURES = [
  'חניה',
  'מעלית',
  'ממ״ד',
  'מרפסת',
  'מחסן',
  'מיזוג',
  'גישה לנכים',
  'משופצת',
  'ריהוט',
  'גינה',
];

export interface Property {
  id: string;
  title: string;
  description: string;
  dealType: DealType;
  propertyType: string;
  city: string;
  neighborhood: string;
  address: string;
  price: number;
  rooms: number | null;
  sizeSqm: number | null;
  floor: number | null;
  totalFloors: number | null;
  features: string[];
  /** URL-ים של תמונות. הראשונה היא תמונת השער. */
  images: string[];
  featured: boolean;
  status: PropertyStatus;
  createdAt: string;
  updatedAt: string;
}

export type PropertyInput = Omit<Property, 'id' | 'createdAt' | 'updatedAt'>;

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  propertyId: string | null;
  propertyTitle: string | null;
  createdAt: string;
  read: boolean;
}

/** אורך מקסימלי לשדות טופס יצירת הקשר – נאכף גם בדפדפן וגם בשרת */
export const CONTACT_LIMITS = { name: 60, phone: 20, email: 64, message: 1000 } as const;

export interface ContactInput {
  name: string;
  phone: string;
  email: string;
  message: string;
  propertyId?: string;
  /** שדה מלכודת לבוטים – משתמשים אמיתיים לא רואים אותו */
  website?: string;
}
