import { useEffect, useState } from 'react';
import { FaBars, FaPhone, FaXmark } from 'react-icons/fa6';
import { Link, useLocation } from 'react-router-dom';
import { SITE, telHref } from '../config';

export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();
  useEffect(() => setOpen(false), [pathname, hash]);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="brand">
          <span className="brand__name">{SITE.agentName}</span>
          <span className="brand__tag">{SITE.tagline}</span>
        </Link>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <FaXmark aria-hidden /> : <FaBars aria-hidden />}
          <span className="sr-only">תפריט</span>
        </button>
        <nav id="site-nav" className={`site-nav${open ? ' is-open' : ''}`} aria-label="ניווט ראשי">
          <Link to="/#properties">נכסים</Link>
          <Link to="/#about">אודות</Link>
          <Link to="/#contact">צור קשר</Link>
          <a className="btn btn--bloom btn--small" href={telHref}>
            <FaPhone aria-hidden /> <span dir="ltr">{SITE.phone}</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
