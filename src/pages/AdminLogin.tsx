import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { SITE } from '../config';

export default function AdminLogin() {
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'כניסה לניהול';
    api.me().then((r) => r.admin && nav('/admin', { replace: true })).catch(() => undefined);
  }, [nav]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.login(password);
      nav('/admin', { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="panel login__panel" onSubmit={submit}>
        <p className="login__brand">{SITE.agentName}</p>
        <h1>כניסה לניהול הנכסים</h1>
        <div className="field">
          <label htmlFor="admin-password">סיסמה</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn--sea btn--block" disabled={busy || !password}>
          {busy ? 'מתחבר…' : 'כניסה'}
        </button>
        <Link to="/" className="login__back">חזרה לאתר</Link>
      </form>
    </main>
  );
}
