import { useState, type FormEvent } from 'react';
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

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.phone.trim() && !form.email.trim()) {
      setStatus({ kind: 'error', message: 'השאירו טלפון או אימייל כדי שאוכל לחזור אליכם' });
      return;
    }
    setStatus({ kind: 'sending' });
    try {
      await api.sendContact({ ...form, propertyId });
      setStatus({ kind: 'sent' });
      setForm({ name: '', phone: '', email: '', message: '', website: '' });
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
        <label htmlFor={id('name')}>שם מלא</label>
        <input id={id('name')} autoComplete="name" required value={form.name} onChange={set('name')} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor={id('phone')}>טלפון</label>
          <input id={id('phone')} type="tel" dir="ltr" autoComplete="tel" inputMode="tel" value={form.phone} onChange={set('phone')} />
        </div>
        <div className="field">
          <label htmlFor={id('email')}>אימייל</label>
          <input id={id('email')} type="email" dir="ltr" autoComplete="email" value={form.email} onChange={set('email')} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={id('message')}>במה אפשר לעזור?</label>
        <textarea id={id('message')} rows={4} value={form.message} onChange={set('message')} />
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
      <button className="btn btn--bloom btn--block" disabled={status.kind === 'sending' || !form.name.trim()}>
        {status.kind === 'sending' ? 'שולח…' : 'שליחת הודעה'}
      </button>
      <p className="form-note">הפרטים משמשים רק כדי לחזור אליכם.</p>
    </form>
  );
}
