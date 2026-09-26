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
        <Link to="/admin">כניסת ניהול</Link>
      </div>
    </footer>
  );
}
