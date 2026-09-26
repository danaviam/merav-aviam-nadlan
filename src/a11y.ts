/** הגדרות תפריט הנגישות: נשמרות בדפדפן של הגולש ומוחלות כמחלקות על <html> */

export const TEXT_STEPS = [100, 115, 130, 150] as const;

export interface A11ySettings {
  textStep: number;
  contrast: 'none' | 'high' | 'dark' | 'gray';
  links: boolean;
  readableFont: boolean;
  spacing: boolean;
  noMotion: boolean;
  bigCursor: boolean;
}

export const DEFAULT_A11Y: A11ySettings = {
  textStep: 0,
  contrast: 'none',
  links: false,
  readableFont: false,
  spacing: false,
  noMotion: false,
  bigCursor: false,
};

const KEY = 'a11y-settings';
export const A11Y_EVENT = 'a11y-change';

export function loadA11y(): A11ySettings {
  try {
    return { ...DEFAULT_A11Y, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULT_A11Y;
  }
}

export function saveA11y(s: A11ySettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // גלישה פרטית / אחסון חסום – ההגדרות יחולו רק בביקור הנוכחי
  }
}

export function applyA11y(s: A11ySettings) {
  const html = document.documentElement;
  html.style.fontSize = s.textStep ? `${TEXT_STEPS[s.textStep]}%` : '';
  const flags: Record<string, boolean> = {
    'a11y-contrast-high': s.contrast === 'high',
    'a11y-contrast-dark': s.contrast === 'dark',
    'a11y-gray': s.contrast === 'gray',
    'a11y-links': s.links,
    'a11y-font': s.readableFont,
    'a11y-spacing': s.spacing,
    'a11y-no-motion': s.noMotion,
    'a11y-cursor': s.bigCursor,
  };
  for (const [cls, on] of Object.entries(flags)) html.classList.toggle(cls, on);
  window.dispatchEvent(new Event(A11Y_EVENT));
}

export const isDefaultA11y = (s: A11ySettings) =>
  (Object.keys(DEFAULT_A11Y) as (keyof A11ySettings)[]).every((k) => s[k] === DEFAULT_A11Y[k]);
