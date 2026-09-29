/**
 * כל הפרטים של הסוכנת במקום אחד – ערכו כאן.
 * רשת חברתית עם כתובת ריקה ('') לא תוצג באתר.
 */
export const SITE = {
  agentName: 'מירב אביעם',
  tagline: 'תיווך ושיווק נדל״ן בבאר שבע',
  phone: '052-4294612',
  /** מספר בפורמט בינלאומי, בלי + ובלי 0 בהתחלה */
  whatsapp: '972524294612',
  email: 'merav@aviam.co.il',
  officeAddress: 'באר שבע',
  license: 'רישיון תיווך מס׳ 3242751',
  /** לעמודי מדיניות הפרטיות, תנאי השימוש והצהרת הנגישות */
  legal: {
    updated: '29 בספטמבר 2026',
    /** בתי המשפט שיהיו מוסמכים בתנאי השימוש */
    courts: 'מחוז דרום',
    /** רכז/ת הנגישות. ריק = פרטי הסוכנת */
    accessibilityContact: { name: '', phone: '', email: '' },
  },
  /** כתובת תמונה של הסוכנת (אפשר גם קובץ בתיקיית public, למשל '/agent.jpg') */
  agentPhoto: 'profile.jpg',
  about: [
    'אני מלווה משפחות בקנייה, מכירה והשכרה של נכסים פרטיים ומסחריים בבאר שבע, עומר, מיתר, אופקים ודימונה.',
    'אני מכירה כל שכונה, כל פרויקט חדש וכל רחוב שקט – ויודעת לתמחר נכס נכון כבר מהיום הראשון. אצלי מקבלים זמינות מלאה, שקיפות בכל שלב וליווי עד מסירת המפתח.',
  ],
  process: [
    { title: 'פגישת היכרות', text: 'מבינים מה אתם מחפשים, או מה חשוב לכם במכירה.' },
    { title: 'הערכת שווי', text: 'ניתוח עסקאות אמיתיות באזור וקביעת מחיר נכון.' },
    { title: 'שיווק וסינון', text: 'צילום מקצועי, פרסום ממוקד ורק קונים רציניים.' },
    { title: 'משא ומתן וחתימה', text: 'ליווי מול עורכי הדין והבנקים עד מסירת המפתח.' },
  ],
  social: {
    facebook: 'https://www.facebook.com/merav.aviam',
    instagram: 'https://instagram.com/merav_aviam',
    whatsapp: 'https://wa.me/972524294612',
    tiktok: '',
    youtube: '',
    linkedin: '',
  },
  /** רשתות שיופיעו ככפתורים צפים מעל כפתור הוואטסאפ (רק אם יש להן קישור למעלה) */
  floatingSocials: ['instagram', 'tiktok'],
} as const;

export type SocialKey = keyof typeof SITE.social;

export const telHref = `tel:${SITE.phone.replace(/[^\d+]/g, '')}`;
export const whatsappHref = (text?: string) =>
  `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
