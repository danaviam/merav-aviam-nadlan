import { Link } from 'react-router-dom';
import type { Property } from '../../shared/types';
import { dealLabel, floorLabel, formatPrice, location, shortFacts } from '../format';
import { PropertyImage } from './PropertyImage';

export function PropertyCard({ property: p }: { property: Property }) {
  const sold = p.status === 'sold';
  return (
    <Link to={`/property/${p.id}`} className={`card${sold ? ' is-sold' : ''}`}>
      <div className="card__media">
        <PropertyImage property={p} />
        <span className={`tag${sold ? ' tag--sold' : p.dealType === 'rent' ? ' tag--rent' : ''}`}>
          {dealLabel(p)}
        </span>
        {p.images.length > 1 && <span className="card__count">{p.images.length} תמונות</span>}
      </div>
      <div className="card__body">
        <p className="card__price">{formatPrice(p)}</p>
        <h3 className="card__title">{p.title}</h3>
        <p className="card__location">{location(p)}</p>
        <p className="card__facts">
          {[p.propertyType, shortFacts(p), floorLabel(p)].filter(Boolean).join(' | ')}
        </p>
      </div>
    </Link>
  );
}
