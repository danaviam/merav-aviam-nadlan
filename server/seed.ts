import crypto from 'node:crypto';
import type { Property } from '../shared/types.js';

type Seed = Omit<Property, 'id' | 'createdAt' | 'updatedAt'>;

const samples: Seed[] = [
  {
    title: 'דירת 5 חדרים עם מרפסת לים',
    description:
      'דירה מוארת בקומה גבוהה, מרפסת שמש של 14 מ״ר עם נוף פתוח לים.\nסלון רחב, מטבח משודרג, יחידת הורים וממ״ד.\nמרחק הליכה מהפארק, מבתי ספר ומהתחבורה הציבורית.',
    dealType: 'sale',
    propertyType: 'דירה',
    city: 'ראשון לציון',
    neighborhood: 'נחלת יהודה',
    address: 'רחוב הדוגמה 12',
    price: 3_450_000,
    rooms: 5,
    sizeSqm: 128,
    floor: 9,
    totalFloors: 14,
    features: ['חניה', 'מעלית', 'ממ״ד', 'מרפסת', 'מחסן'],
    images: [],
    featured: true,
    status: 'active',
  },
  {
    title: 'פנטהאוז עם גג פרטי',
    description:
      'פנטהאוז בבניין בוטיק, מרפסת גג של 60 מ״ר עם פרגולה.\nשתי חניות צמודות ומחסן. מתאים למשפחה שאוהבת לארח.',
    dealType: 'sale',
    propertyType: 'פנטהאוז',
    city: 'רחובות',
    neighborhood: 'מרכז העיר',
    address: 'שדרות הדוגמה 5',
    price: 4_190_000,
    rooms: 6,
    sizeSqm: 160,
    floor: 7,
    totalFloors: 7,
    features: ['חניה', 'מעלית', 'ממ״ד', 'מרפסת', 'מיזוג'],
    images: [],
    featured: true,
    status: 'active',
  },
  {
    title: 'דירת גן משופצת',
    description: 'דירת גן עם גינה פרטית של 80 מ״ר, שיפוץ מלא לפני שנה. כניסה גמישה.',
    dealType: 'rent',
    propertyType: 'דירת גן',
    city: 'נס ציונה',
    neighborhood: 'השבטים',
    address: 'רחוב הדוגמה 3',
    price: 8_200,
    rooms: 4,
    sizeSqm: 105,
    floor: 0,
    totalFloors: 4,
    features: ['חניה', 'ממ״ד', 'גינה', 'משופצת', 'מיזוג'],
    images: [],
    featured: true,
    status: 'active',
  },
  {
    title: 'בית פרטי על מגרש של חצי דונם',
    description: 'בית דו-קומתי ברחוב שקט, 6 חדרים, מרתף וחצר גדולה.',
    dealType: 'sale',
    propertyType: 'בית פרטי',
    city: 'גדרה',
    neighborhood: 'הוותיקה',
    address: '',
    price: 3_890_000,
    rooms: 6,
    sizeSqm: 210,
    floor: null,
    totalFloors: 2,
    features: ['חניה', 'ממ״ד', 'גינה', 'מחסן'],
    images: [],
    featured: false,
    status: 'sold',
  },
];

export function seedProperties(): Property[] {
  const now = Date.now();
  return samples.map((s, i) => {
    const stamp = new Date(now - i * 86_400_000).toISOString();
    return { ...s, id: crypto.randomUUID(), createdAt: stamp, updatedAt: stamp };
  });
}
