/**
 * כל הפרטים של הסוכנת במקום אחד – ערכו כאן.
 * רשת חברתית עם כתובת ריקה ('') לא תוצג באתר.
 */
export const SITE = {
  agentName: 'מירב אביעם',
  tagline: 'תיווך ושיווק נדל״ן בשפלה',
  phone: '050-123-4567',
  /** מספר בפורמט בינלאומי, בלי + ובלי 0 בהתחלה */
  whatsapp: '972501234567',
  email: 'noa@example.co.il',
  officeAddress: 'רחוב הרצל 1, ראשון לציון',
  license: 'רישיון תיווך מס׳ 0000000',
  /** כתובת תמונה של הסוכנת (אפשר גם קובץ בתיקיית public, למשל '/agent.jpg') */
  agentPhoto: '',
  about: [
    'אני מלווה משפחות בקנייה, מכירה והשכרה של דירות ובתים בראשון לציון, רחובות, נס ציונה והסביבה כבר יותר מעשור.',
    'אני מכירה כל שכונה, כל פרויקט חדש וכל רחוב שקט – ויודעת לתמחר נכס נכון כבר מהיום הראשון. אצלי מקבלים זמינות מלאה, שקיפות בכל שלב וליווי עד מסירת המפתח.',
  ],
  process: [
    { title: 'פגישת היכרות', text: 'מבינים מה אתם מחפשים, או מה חשוב לכם במכירה.' },
    { title: 'הערכת שווי', text: 'ניתוח עסקאות אמיתיות באזור וקביעת מחיר נכון.' },
    { title: 'שיווק וסינון', text: 'צילום מקצועי, פרסום ממוקד ורק קונים רציניים.' },
    { title: 'משא ומתן וחתימה', text: 'ליווי מול עורכי הדין והבנקים עד מסירת המפתח.' },
  ],
  social: {
    facebook: 'https://facebook.com/',
    instagram: 'https://instagram.com/',
    whatsapp: 'https://wa.me/972501234567',
    tiktok: '',
    youtube: '',
    linkedin: '',
  },
} as const;

export type SocialKey = keyof typeof SITE.social;

export const telHref = `tel:${SITE.phone.replace(/[^\d+]/g, '')}`;
export const whatsappHref = (text?: string) =>
  `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
