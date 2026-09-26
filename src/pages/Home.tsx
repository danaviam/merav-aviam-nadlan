import { useEffect, useMemo, useState } from 'react';
import { FaEnvelope, FaLocationDot, FaPhone, FaWhatsapp } from 'react-icons/fa6';
import type { DealType, Property } from '../../shared/types';
import { api } from '../api';
import { ContactForm } from '../components/ContactForm';
import { HeroCarousel } from '../components/HeroCarousel';
import { PropertyCard } from '../components/PropertyCard';
import { SocialLinks } from '../components/SocialLinks';
import { SITE, telHref, whatsappHref } from '../config';

type DealFilter = 'all' | DealType;

export default function Home() {
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [error, setError] = useState('');
  const [deal, setDeal] = useState<DealFilter>('all');
  const [city, setCity] = useState('');

  useEffect(() => {
    document.title = `${SITE.agentName} | ${SITE.tagline}`;
    api.listProperties().then(setProperties).catch((e: Error) => setError(e.message));
  }, []);

  const list = properties ?? [];
  const active = list.filter((p) => p.status === 'active');
  const featured = active.filter((p) => p.featured);
  const heroSlides = featured.length ? featured : active;

  const cities = useMemo(
    () => [...new Set(list.map((p) => p.city))].sort((a, b) => a.localeCompare(b, 'he')),
    [list],
  );
  const shown = list.filter((p) => (deal === 'all' || p.dealType === deal) && (!city || p.city === city));

  return (
    <>
      <HeroCarousel properties={heroSlides} loading={!properties && !error} />

      <section id="properties" className="section">
        <div className="container">
          <div className="section-head">
            <h2>נכסים בבלעדיות</h2>
            <p>דירות ובתים שאני משווקת עכשיו. לחצו על נכס לגלריה המלאה ולכל הפרטים.</p>
          </div>

          <div className="filters" role="group" aria-label="סינון נכסים">
            <div className="chips">
              {(
                [
                  ['all', 'הכל'],
                  ['sale', 'למכירה'],
                  ['rent', 'להשכרה'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`chip${deal === value ? ' is-active' : ''}`}
                  aria-pressed={deal === value}
                  onClick={() => setDeal(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {cities.length > 1 && (
              <label className="select">
                <span className="sr-only">עיר</span>
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="">כל הערים</option>
                  {cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {error && <p className="notice notice--error">{error}</p>}
          {!properties && !error && <p className="notice">טוען נכסים…</p>}
          {properties && !shown.length && (
            <div className="empty">
              <p>אין כרגע נכסים שמתאימים לסינון הזה.</p>
              <p>
                ספרו לי מה אתם מחפשים ואעדכן אתכם כשנכס מתאים נכנס – לפני שהוא מתפרסם.{' '}
                <a href="#contact">השאירו פרטים</a>
              </p>
            </div>
          )}
          <div className="grid">
            {shown.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="section section--stone">
        <div className="container about">
          <div className="about__photo">
            {SITE.agentPhoto ? (
              <img src={SITE.agentPhoto} alt={SITE.agentName} />
            ) : (
              <span className="about__monogram" aria-hidden>
                {SITE.agentName.split(' ').map((w) => w[0]).join('')}
              </span>
            )}
          </div>
          <div className="about__text">
            <h2>נעים להכיר, {SITE.agentName.split(' ')[0]}</h2>
            {SITE.about.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            <h3 className="about__process-title">איך עובדים איתי</h3>
            <ol className="process">
              {SITE.process.map((step) => (
                <li key={step.title}>
                  <strong>{step.title}</strong>
                  <span>{step.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="contact" className="section section--sea">
        <div className="container contact">
          <div className="contact__info">
            <h2>בואו נדבר</h2>
            <p>מוכרים, קונים או מחפשים דירה לשכור? השאירו פרטים ואחזור אליכם, או פשוט התקשרו.</p>
            <ul className="contact__list">
              <li>
                <FaPhone aria-hidden />
                <a href={telHref} dir="ltr">{SITE.phone}</a>
              </li>
              <li>
                <FaWhatsapp aria-hidden />
                <a href={whatsappHref()} target="_blank" rel="noopener noreferrer">הודעה בוואטסאפ</a>
              </li>
              <li>
                <FaEnvelope aria-hidden />
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              </li>
              <li>
                <FaLocationDot aria-hidden />
                <span>{SITE.officeAddress}</span>
              </li>
            </ul>
            <SocialLinks className="socials--light" />
          </div>
          <div className="panel">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
