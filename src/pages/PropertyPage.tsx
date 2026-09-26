import { useEffect, useState } from 'react';
import { FaArrowRight, FaPhone, FaWhatsapp } from 'react-icons/fa6';
import { Link, useParams } from 'react-router-dom';
import type { Property } from '../../shared/types';
import { api, ApiError } from '../api';
import { ContactForm } from '../components/ContactForm';
import { PropertyGallery } from '../components/PropertyGallery';
import { SITE, telHref, whatsappHref } from '../config';
import { dealLabel, floorLabel, formatPrice, location } from '../format';

export default function PropertyPage() {
  const { id = '' } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  useEffect(() => {
    setProperty(null);
    setError(null);
    api
      .getProperty(id)
      .then((p) => {
        setProperty(p);
        document.title = `${p.title} | ${SITE.agentName}`;
      })
      .catch((e: ApiError) => setError({ status: e.status, message: e.message }));
  }, [id]);

  if (error) {
    return (
      <div className="container page-message">
        <h1>{error.status === 404 ? 'הנכס לא נמצא' : 'לא הצלחנו לטעון את הנכס'}</h1>
        <p>{error.status === 404 ? 'ייתכן שהנכס כבר הוסר מהאתר.' : error.message}</p>
        <Link className="btn btn--sea" to="/#properties">לכל הנכסים</Link>
      </div>
    );
  }
  if (!property) return <p className="container notice page-pad">טוען…</p>;

  const p = property;
  const facts: [string, string | null][] = [
    ['סוג נכס', p.propertyType],
    ['חדרים', p.rooms !== null ? String(p.rooms) : null],
    ['שטח', p.sizeSqm !== null ? `${p.sizeSqm} מ״ר` : null],
    ['קומה', floorLabel(p)?.replace('קומה ', '') ?? null],
    ['כתובת', p.address || null],
  ];
  const waText = `היי, אשמח לפרטים על הנכס: ${p.title} (${location(p)})`;

  return (
    <div className="container page-pad">
      <Link to="/#properties" className="back-link">
        <FaArrowRight aria-hidden /> לכל הנכסים
      </Link>

      <div className="prop">
        <div className="prop__main">
          <PropertyGallery property={p} />

          <header className="prop__head">
            <p className="prop__location">{location(p)}</p>
            <h1>{p.title}</h1>
          </header>

          <dl className="facts">
            {facts
              .filter((f): f is [string, string] => Boolean(f[1]))
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>

          {p.features.length > 0 && (
            <ul className="features" aria-label="מאפיינים">
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}

          {p.description && <p className="prop__desc">{p.description}</p>}
        </div>

        <aside className="prop__aside">
          <div className="panel price-panel">
            <span className={`tag tag--inline${p.status === 'sold' ? ' tag--sold' : p.dealType === 'rent' ? ' tag--rent' : ''}`}>
              {dealLabel(p)}
            </span>
            <p className="price-panel__price">{formatPrice(p)}</p>
            <div className="price-panel__actions">
              <a className="btn btn--sea" href={telHref}>
                <FaPhone aria-hidden /> התקשרו
              </a>
              <a className="btn btn--ghost" href={whatsappHref(waText)} target="_blank" rel="noopener noreferrer">
                <FaWhatsapp aria-hidden /> וואטסאפ
              </a>
            </div>
          </div>
          <div className="panel">
            <h2 className="panel__title">לתיאום ביקור בנכס</h2>
            <ContactForm
              key={p.id}
              idPrefix="prop"
              propertyId={p.id}
              defaultMessage={`אשמח לתאם ביקור בנכס: ${p.title}`}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
