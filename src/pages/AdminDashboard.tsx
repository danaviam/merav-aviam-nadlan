import { useCallback, useEffect, useState } from 'react';
import { FaPen, FaPlus, FaRegStar, FaStar, FaTrash } from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';
import type { ContactMessage, Property, PropertyStatus } from '../../shared/types';
import { api, ApiError } from '../api';
import { PropertyImage } from '../components/PropertyImage';
import { dealLabel, formatDate, formatPrice, location, statusLabel } from '../format';
import { PropertyForm } from './PropertyForm';

type Notice = { kind: 'ok' | 'error'; text: string } | null;

export default function AdminDashboard() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'properties' | 'messages'>('properties');
  const [properties, setProperties] = useState<Property[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [editing, setEditing] = useState<Property | 'new' | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) return nav('/admin/login', { replace: true });
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'הפעולה נכשלה' });
    },
    [nav],
  );

  useEffect(() => {
    document.title = 'ניהול נכסים';
    (async () => {
      const { admin } = await api.me();
      if (!admin) return nav('/admin/login', { replace: true });
      const [p, m] = await Promise.all([api.adminListProperties(), api.listMessages()]);
      setProperties(p);
      setMessages(m);
      setReady(true);
    })().catch(fail);
  }, [nav, fail]);

  useEffect(() => {
    if (notice?.kind !== 'ok') return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const replace = (p: Property) => setProperties((list) => list.map((x) => (x.id === p.id ? p : x)));

  async function patch(p: Property, change: { status?: PropertyStatus; featured?: boolean }) {
    try {
      replace(await api.patchProperty(p.id, change));
    } catch (e) {
      fail(e);
    }
  }

  async function remove(p: Property) {
    if (!confirm(`למחוק את "${p.title}"? הנכס והתמונות שלו יימחקו לצמיתות.`)) return;
    try {
      await api.deleteProperty(p.id);
      setProperties((list) => list.filter((x) => x.id !== p.id));
      setNotice({ kind: 'ok', text: 'הנכס נמחק' });
    } catch (e) {
      fail(e);
    }
  }

  async function toggleRead(m: ContactMessage) {
    try {
      const updated = await api.markMessage(m.id, !m.read);
      setMessages((list) => list.map((x) => (x.id === m.id ? updated : x)));
    } catch (e) {
      fail(e);
    }
  }

  async function removeMessage(m: ContactMessage) {
    if (!confirm(`למחוק את הפנייה של ${m.name}?`)) return;
    try {
      await api.deleteMessage(m.id);
      setMessages((list) => list.filter((x) => x.id !== m.id));
    } catch (e) {
      fail(e);
    }
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    nav('/admin/login', { replace: true });
  }

  const unread = messages.filter((m) => !m.read).length;

  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="container admin-bar__inner">
          <span className="admin-bar__title">ניהול האתר</span>
          <div className="admin-bar__links">
            <Link to="/" target="_blank">צפייה באתר</Link>
            <button type="button" className="link-btn" onClick={logout}>יציאה</button>
          </div>
        </div>
      </header>

      <main className="container admin-main">
        {notice && (
          <p className={`notice notice--${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </p>
        )}

        {!ready ? (
          <p className="notice">טוען…</p>
        ) : editing ? (
          <PropertyForm
            initial={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onError={fail}
            onSaved={(p) => {
              setProperties((list) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [p, ...list]));
              setEditing(null);
              setNotice({ kind: 'ok', text: editing === 'new' ? 'הנכס נוסף לאתר' : 'השינויים נשמרו' });
              window.scrollTo(0, 0);
            }}
          />
        ) : (
          <>
            <div className="tabs" role="tablist">
              <button role="tab" type="button" aria-selected={tab === 'properties'} className={`tab${tab === 'properties' ? ' is-active' : ''}`} onClick={() => setTab('properties')}>
                נכסים ({properties.length})
              </button>
              <button role="tab" type="button" aria-selected={tab === 'messages'} className={`tab${tab === 'messages' ? ' is-active' : ''}`} onClick={() => setTab('messages')}>
                פניות {unread > 0 && <span className="badge">{unread} חדשות</span>}
              </button>
            </div>

            {tab === 'properties' && (
              <section>
                <div className="admin-toolbar">
                  <h1>הנכסים שלי</h1>
                  <button type="button" className="btn btn--bloom" onClick={() => setEditing('new')}>
                    <FaPlus aria-hidden /> הוספת נכס
                  </button>
                </div>
                {!properties.length && (
                  <div className="empty">
                    <p>עדיין אין נכסים. לחצו על "הוספת נכס" כדי להעלות את הראשון.</p>
                  </div>
                )}
                <ul className="admin-list">
                  {properties.map((p) => (
                    <li key={p.id} className={`admin-row${p.status === 'hidden' ? ' is-hidden' : ''}`}>
                      <div className="admin-row__thumb">
                        <PropertyImage property={p} />
                      </div>
                      <div className="admin-row__info">
                        <p className="admin-row__title">
                          {p.featured && <FaStar className="star" aria-label="מוצג בקרוסלה" />}
                          <Link to={`/property/${p.id}`} target="_blank">{p.title}</Link>
                        </p>
                        <p className="admin-row__meta">
                          {dealLabel(p)} ב{location(p)} | {formatPrice(p)} | {p.images.length} תמונות
                        </p>
                      </div>
                      <div className="admin-row__actions">
                        <label className="select select--small">
                          <span className="sr-only">סטטוס</span>
                          <select value={p.status} onChange={(e) => patch(p, { status: e.target.value as PropertyStatus })}>
                            {(Object.keys(statusLabel) as PropertyStatus[]).map((s) => (
                              <option key={s} value={s}>{statusLabel[s]}</option>
                            ))}
                          </select>
                        </label>
                        <button type="button" className="btn btn--ghost btn--small" aria-pressed={p.featured} onClick={() => patch(p, { featured: !p.featured })}>
                          {p.featured ? <FaStar aria-hidden /> : <FaRegStar aria-hidden />} {p.featured ? 'בקרוסלה' : 'לקרוסלה'}
                        </button>
                        <button type="button" className="btn btn--ghost btn--small" onClick={() => setEditing(p)}>
                          <FaPen aria-hidden /> עריכה
                        </button>
                        <button type="button" className="btn btn--danger btn--small" onClick={() => remove(p)}>
                          <FaTrash aria-hidden /> מחיקה
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {tab === 'messages' && (
              <section>
                <div className="admin-toolbar">
                  <h1>פניות מהאתר</h1>
                </div>
                {!messages.length && <div className="empty"><p>אין עדיין פניות. פניות מטופס יצירת הקשר יופיעו כאן.</p></div>}
                <ul className="messages">
                  {messages.map((m) => (
                    <li key={m.id} className={`message${m.read ? '' : ' is-unread'}`}>
                      <div className="message__head">
                        <strong>{m.name}</strong>
                        <time dateTime={m.createdAt}>{formatDate(m.createdAt)}</time>
                      </div>
                      <p className="message__contact">
                        {m.phone && <a href={`tel:${m.phone}`} dir="ltr">{m.phone}</a>}
                        {m.email && <a href={`mailto:${m.email}`}>{m.email}</a>}
                        {m.propertyId && (
                          <Link to={`/property/${m.propertyId}`} target="_blank">
                            לגבי: {m.propertyTitle}
                          </Link>
                        )}
                      </p>
                      {m.message && <p className="message__body">{m.message}</p>}
                      <div className="message__actions">
                        <button type="button" className="btn btn--ghost btn--small" onClick={() => toggleRead(m)}>
                          {m.read ? 'סימון כלא נקראה' : 'סימון כנקראה'}
                        </button>
                        <button type="button" className="btn btn--danger btn--small" onClick={() => removeMessage(m)}>
                          <FaTrash aria-hidden /> מחיקה
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
