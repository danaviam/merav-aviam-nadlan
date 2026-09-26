/**
 * טלפונים: מספר ישראלי (נייד 05X / 07X – 10 ספרות, קווי 02/03/04/08/09 – 9 ספרות, 1-800/1-700)
 * או מספר בינלאומי שמתחיל ב-+ (8–15 ספרות). משמש גם בדפדפן וגם בשרת.
 */

const digitsOf = (s: string) => s.replace(/\D/g, '');

export function isValidPhone(input: string): boolean {
  const s = input.trim();
  if (!/^\+?[\d\s\-()]+$/.test(s)) return false;
  const d = digitsOf(s);
  if (s.startsWith('+')) {
    // +972 – אותם כללים כמו מספר ישראלי בלי ה-0
    if (d.startsWith('972')) return isValidPhone('0' + d.slice(3));
    return d.length >= 8 && d.length <= 15;
  }
  return /^0(5\d|7\d)\d{7}$/.test(d) || /^0[2-489]\d{7}$/.test(d) || /^1[5-9]00\d{6}$/.test(d);
}

/** מעצב תוך כדי הקלדה: 0501234567 → 050-1234567, 031234567 → 03-1234567. מספר עם + נשאר כמו שהוא */
export function formatPhone(input: string): string {
  if (input.trim().startsWith('+')) return '+' + input.replace(/[^\d\s\-()]/g, '');
  const d = digitsOf(input).slice(0, 10);
  if (/^1[5-9]00/.test(d)) return d.length > 4 ? `${d.slice(0, 1)}-${d.slice(1, 4)}-${d.slice(4)}` : d;
  const prefixLen = /^0[57]/.test(d) ? 3 : /^0[2-489]/.test(d) ? 2 : 0;
  return prefixLen && d.length > prefixLen ? `${d.slice(0, prefixLen)}-${d.slice(prefixLen)}` : d;
}
