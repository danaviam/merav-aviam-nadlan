import type { Property } from '../../shared/types';
import { Placeholder } from './Placeholder';

export function PropertyImage({
  property,
  index = 0,
  eager = false,
  className = '',
}: {
  property: Property;
  index?: number;
  eager?: boolean;
  className?: string;
}) {
  const src = property.images[index];
  if (!src) return <Placeholder seed={property.id} className={className} />;
  return (
    <img
      className={className}
      src={src}
      alt={`${property.title} – תמונה ${index + 1}`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
