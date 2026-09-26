import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { formatPhone, isValidPhone } from '../../shared/phone';
import { CONTACT_LIMITS as L } from '../../shared/types';
import { api } from '../api';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

export function ContactForm({
  propertyId,
  defaultMessage = '',
  idPrefix = 'contact',
}: {
  propertyId?: string;
  defaultMessage?: string;
  idPrefix?: string;
}) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: defaultMessage, website: '' });
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  // השגיאה מוצגת רק אחרי שיצאו מהשדה, לא באמצע ההקלדה
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneError = phoneTouched && form.phone.trim() !== '' && !isValidPhone(form.phone);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const fail = (message: string, field: string) => {
      setStatus({ kind: 'error', message });
      document.getElementById(id(field))?.focus();
    };
    if (!form.name.trim()) return fail('יש למלא שם', 'name');
    if (!form.phone.trim() && !form.email.trim()) return fail('השאירו טלפון או אימייל כדי שאוכל לחזור אליכם', 'phone');
    if (!form.message.trim()) return fail('ספרו לי בקצרה במה אפשר לעזור', 'message');
    if (form.phone.trim() && !isValidPhone(form.phone)) {
      setPhoneTouched(true);
      document.getElementById(id('phone'))?.focus();
      return;
    }
    setStatus({ kind: 'sending' });
    try {
      await api.sendContact({ ...form, propertyId });
      setStatus({ kind: 'sent' });
      setForm({ name: '', phone: '', email: '', message: '', website: '' });
      setPhoneTouched(false);
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message });
    }
  }

  if (status.kind === 'sent') {
    return (
      <div className="form-done" role="status">
        <p className="form-done__title">ההודעה נשלחה</p>
        <p>אחזור אליכם בהקדם, בדרך כלל עוד באותו היום.</p>
        <button type="button" className="btn btn--ghost" onClick={() => setStatus({ kind: 'idle' })}>
          שליחת הודעה נוספת
        </button>
      </div>
    );
  }

  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor={id('name')}>שם מלא <span className="req" aria-hidden>*</span></label>
        <input id={id('name')} autoComplete="name" required maxLength={L.name} value={form.name} onChange={set('name')} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor={id('phone')}>טלפון <span className="req" aria-hidden>*</span></label>
          <input
            id={id('phone')}
            type="tel"
            dir="ltr"
            autoComplete="tel"
            inputMode="tel"
            maxLength={L.phone}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
            onBlur={() => setPhoneTouched(true)}
            aria-invalid={phoneError}
            aria-describedby={phoneError ? `${id('phone-error')} ${id('contact-hint')}` : id('contact-hint')}
          />
          {phoneError && (
            <small id={id('phone-error')} className="field-error">
              מספר לא תקין. לדוגמה: 050-1234567 או 03-1234567
            </small>
          )}
        </div>
        <div className="field">
          <label htmlFor={id('email')}>אימייל <span className="req" aria-hidden>*</span></label>
          <input id={id('email')} type="email" dir="ltr" autoComplete="email" maxLength={L.email} aria-describedby={id('contact-hint')} value={form.email} onChange={set('email')} />
        </div>
      </div>
      <p className="field-hint" id={id('contact-hint')}>* שדות חובה. מספיק טלפון <strong>או</strong> אימייל.</p>
      <div className="field">
        <label htmlFor={id('message')}>במה אפשר לעזור? <span className="req" aria-hidden>*</span></label>
        <textarea
          id={id('message')}
          required
          rows={4}
          maxLength={L.message}
          aria-describedby={id('message-count')}
          value={form.message}
          onChange={set('message')}
        />
        <small id={id('message-count')} className={`char-count${form.message.length >= L.message * 0.9 ? ' is-near' : ''}`}>
          {form.message.length}/{L.message}
        </small>
      </div>
      {/* מלכודת לבוטים – מוסתר ממשתמשים אמיתיים */}
      <div className="hp" aria-hidden="true">
        <label htmlFor={id('website')}>אתר</label>
        <input id={id('website')} tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
      </div>
      {status.kind === 'error' && (
        <p className="form-error" role="alert">
          {status.message}
        </p>
      )}
      <button className="btn btn--bloom btn--block" disabled={status.kind === 'sending'}>
        {status.kind === 'sending' ? 'שולח…' : 'שליחת הודעה'}
      </button>
      <p className="form-note">
        הפרטים משמשים רק כדי לחזור אליכם ולתת לכם שירות. מסירתם אינה חובה, אבל בלעדיהם לא נוכל לחזור אליכם.
        פרטים נוספים ב<Link to="/privacy">מדיניות הפרטיות</Link>.
      </p>
    </form>
  );
}
