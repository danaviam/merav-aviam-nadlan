import { useCallback, useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaPause, FaPlay } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import type { Property } from '../../shared/types';
import { SITE } from '../config';
import { dealLabel, formatPrice, location, shortFacts } from '../format';
import { usePrefersReducedMotion, useSwipe } from '../hooks';
import { PropertyImage } from './PropertyImage';

const INTERVAL_MS = 6500;

export function HeroCarousel({ properties, loading }: { properties: Property[]; loading: boolean }) {
  const slides = properties.slice(0, 6);
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [stopped, setStopped] = useState(false);
  const reduced = usePrefersReducedMotion();

  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);
  const swipe = useSwipe(() => go(1), () => go(-1));

  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [count, index]);

  const autoplay = count > 1 && !reduced && !stopped;
  useEffect(() => {
    if (!autoplay || hovering) return;
    const t = window.setInterval(() => go(1), INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [autoplay, hovering, go]);

  if (!count) {
    return (
      <section className="hero hero--intro" aria-busy={loading}>
        <div className="container">
          <div className="hero__sign hero__sign--static">
            <h1 className="hero__title">{SITE.agentName}</h1>
            <p>{SITE.tagline}</p>
            <Link className="btn btn--bloom" to="/#contact">לתיאום שיחה</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="hero"
      aria-roledescription="קרוסלה"
      aria-label="נכסים נבחרים"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(1);
        if (e.key === 'ArrowRight') go(-1);
      }}
    >
      <h1 className="sr-only">
        {SITE.agentName} – {SITE.tagline}
      </h1>
      <div className="hero__track" {...swipe}>
        {slides.map((p, i) => {
          const active = i === index;
          return (
            <article
              key={p.id}
              className={`hero__slide${active ? ' is-active' : ''}`}
              aria-roledescription="שקופית"
              aria-label={`${i + 1} מתוך ${count}`}
              aria-hidden={!active}
            >
              <div className="hero__media">
                <PropertyImage property={p} eager={i === 0} />
              </div>
              <div className="hero__shade" />
              <div className="hero__sign">
                <span className={`hero__tag${p.dealType === 'rent' ? ' hero__tag--rent' : ''}`}>
                  {dealLabel(p)}
                </span>
                <p className="hero__location">{location(p)}</p>
                <h2 className="hero__title">{p.title}</h2>
                <p className="hero__price">{formatPrice(p)}</p>
                {shortFacts(p) && <p className="hero__facts">{shortFacts(p)}</p>}
                <Link className="btn btn--sea" to={`/property/${p.id}`} tabIndex={active ? 0 : -1}>
                  לפרטי הנכס
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {count > 1 && (
        <div className="hero__controls">
          <button type="button" className="round-btn" onClick={() => go(-1)} aria-label="הנכס הקודם">
            <FaChevronRight aria-hidden />
          </button>
          <span className="hero__counter" aria-live={autoplay && !hovering ? 'off' : 'polite'}>
            {index + 1} / {count}
          </span>
          <button type="button" className="round-btn" onClick={() => go(1)} aria-label="הנכס הבא">
            <FaChevronLeft aria-hidden />
          </button>
          {!reduced && (
            <button
              type="button"
              className="round-btn round-btn--quiet"
              onClick={() => setStopped((s) => !s)}
              aria-label={stopped ? 'הפעלת מעבר אוטומטי' : 'עצירת מעבר אוטומטי'}
            >
              {stopped ? <FaPlay aria-hidden /> : <FaPause aria-hidden />}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
