import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  FaArrowPointer,
  FaCircleHalfStroke,
  FaDroplet,
  FaFont,
  FaLink,
  FaMinus,
  FaMoon,
  FaPause,
  FaPlus,
  FaRotateLeft,
  FaTextWidth,
  FaUniversalAccess,
  FaXmark,
} from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import {
  applyA11y,
  DEFAULT_A11Y,
  isDefaultA11y,
  loadA11y,
  saveA11y,
  TEXT_STEPS,
  type A11ySettings,
} from '../a11y';

// מוגדר מחוץ לתפריט כדי שהכפתור לא ייבנה מחדש בכל לחיצה (ואז הפוקוס של המקלדת היה הולך לאיבוד)
function Option({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button type="button" className="a11y__opt" aria-pressed={on} onClick={onClick}>
      <span className="a11y__icon" aria-hidden>{icon}</span>
      {children}
    </button>
  );
}

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<A11ySettings>(loadA11y);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyA11y(s);
    saveA11y(s);
  }, [s]);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const set = <K extends keyof A11ySettings>(k: K, v: A11ySettings[K]) => setS((prev) => ({ ...prev, [k]: v }));
  const toggle = (k: 'links' | 'readableFont' | 'spacing' | 'noMotion' | 'bigCursor') => set(k, !s[k]);
  const contrast = (c: A11ySettings['contrast']) => set('contrast', s.contrast === c ? 'none' : c);

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`a11y-fab${isDefaultA11y(s) ? '' : ' is-active'}`}
        aria-label="תפריט נגישות"
        aria-expanded={open}
        aria-controls="a11y-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <FaUniversalAccess aria-hidden />
      </button>

      <div
        ref={panel}
        id="a11y-panel"
        className="a11y"
        role="dialog"
        aria-label="תפריט נגישות"
        hidden={!open}
      >
        <div className="a11y__head">
          <h2>תפריט נגישות</h2>
          <button
            type="button"
            className="a11y__close"
            aria-label="סגירת תפריט הנגישות"
            onClick={() => {
              setOpen(false);
              button.current?.focus();
            }}
          >
            <FaXmark aria-hidden />
          </button>
        </div>

        <div className="a11y__size" role="group" aria-label="גודל טקסט">
          <span>גודל טקסט</span>
          <button
            type="button"
            aria-label="הקטנת טקסט"
            disabled={s.textStep === 0}
            onClick={() => set('textStep', Math.max(0, s.textStep - 1))}
          >
            <FaMinus aria-hidden />
          </button>
          <output aria-live="polite">{TEXT_STEPS[s.textStep]}%</output>
          <button
            type="button"
            aria-label="הגדלת טקסט"
            disabled={s.textStep === TEXT_STEPS.length - 1}
            onClick={() => set('textStep', Math.min(TEXT_STEPS.length - 1, s.textStep + 1))}
          >
            <FaPlus aria-hidden />
          </button>
        </div>

        <div className="a11y__grid">
          <Option on={s.contrast === 'high'} onClick={() => contrast('high')} icon={<FaCircleHalfStroke />}>ניגודיות גבוהה</Option>
          <Option on={s.contrast === 'dark'} onClick={() => contrast('dark')} icon={<FaMoon />}>ניגודיות כהה</Option>
          <Option on={s.contrast === 'gray'} onClick={() => contrast('gray')} icon={<FaDroplet />}>גווני אפור</Option>
          <Option on={s.links} onClick={() => toggle('links')} icon={<FaLink />}>הדגשת קישורים</Option>
          <Option on={s.readableFont} onClick={() => toggle('readableFont')} icon={<FaFont />}>גופן קריא</Option>
          <Option on={s.spacing} onClick={() => toggle('spacing')} icon={<FaTextWidth />}>ריווח טקסט</Option>
          <Option on={s.noMotion} onClick={() => toggle('noMotion')} icon={<FaPause />}>עצירת אנימציות</Option>
          <Option on={s.bigCursor} onClick={() => toggle('bigCursor')} icon={<FaArrowPointer />}>סמן גדול</Option>
        </div>

        <div className="a11y__foot">
          <button type="button" className="a11y__reset" onClick={() => setS(DEFAULT_A11Y)} disabled={isDefaultA11y(s)}>
            <FaRotateLeft aria-hidden /> איפוס הגדרות
          </button>
          <Link to="/accessibility" onClick={() => setOpen(false)}>הצהרת נגישות</Link>
        </div>
      </div>
    </>
  );
}
