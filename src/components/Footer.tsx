import { Link } from 'react-router-dom';
import { SITE, telHref } from '../config';
import { SocialLinks } from './SocialLinks';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <p className="site-footer__name">{SITE.agentName}</p>
          <p className="site-footer__muted">{SITE.tagline}</p>
          <p className="site-footer__muted">{SITE.license}</p>
        </div>
        <address className="site-footer__contact">
          <a href={telHref} dir="ltr">{SITE.phone}</a>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          <span>{SITE.officeAddress}</span>
        </address>
        <div>
          <p className="site-footer__label">עקבו אחריי</p>
          <SocialLinks />
        </div>
      </div>
      <div className="container site-footer__bottom">
        <span>© {new Date().getFullYear()} {SITE.agentName}. כל הזכויות שמורות.</span>
        <nav className="site-footer__legal" aria-label="מידע משפטי">
          <Link to="/privacy">מדיניות פרטיות</Link>
          <Link to="/terms">תנאי שימוש</Link>
          <Link to="/accessibility">הצהרת נגישות</Link>
          <Link to="/admin">כניסת ניהול</Link>
        </nav>
      </div>
    </footer>
  );
}
