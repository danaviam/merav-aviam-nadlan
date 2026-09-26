import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { FaChevronLeft, FaChevronRight, FaExpand, FaXmark } from 'react-icons/fa6';
import type { Property } from '../../shared/types';
import { useSwipe } from '../hooks';
import { Placeholder } from './Placeholder';

export function PropertyGallery({ property }: { property: Property }) {
  const { images, title } = property;
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const count = images.length;

  const go = (d: number) => setIndex((i) => (i + d + count) % count);
  const swipe = useSwipe(() => go(1), () => go(-1));

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const thumb = thumbsRef.current?.children[index] as HTMLElement | undefined;
    thumb?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [index]);

  if (!count) {
    return (
      <div className="gallery">
        <div className="gallery__main">
          <Placeholder seed={property.id} />
        </div>
      </div>
    );
  }

  const keys = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') go(1);
    if (e.key === 'ArrowRight') go(-1);
  };

  return (
    <div className="gallery" aria-roledescription="גלריה" aria-label={`תמונות של ${title}`} onKeyDown={keys}>
      <div className="gallery__main" {...swipe}>
        <img src={images[index]} alt={`${title} – תמונה ${index + 1} מתוך ${count}`} />
        {count > 1 && (
          <>
            <button type="button" className="round-btn gallery__prev" onClick={() => go(-1)} aria-label="התמונה הקודמת">
              <FaChevronRight aria-hidden />
            </button>
            <button type="button" className="round-btn gallery__next" onClick={() => go(1)} aria-label="התמונה הבאה">
              <FaChevronLeft aria-hidden />
            </button>
          </>
        )}
        <span className="gallery__counter">
          {index + 1} / {count}
        </span>
        <button type="button" className="gallery__expand" onClick={() => setOpen(true)}>
          <FaExpand aria-hidden /> מסך מלא
        </button>
      </div>

      {count > 1 && (
        <div className="gallery__thumbs" ref={thumbsRef}>
          {images.map((src, i) => (
            <button
              type="button"
              key={`${i}-${src}`}
              className={`gallery__thumb${i === index ? ' is-active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`תמונה ${i + 1}`}
              aria-current={i === index}
            >
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <dialog ref={dialogRef} className="lightbox" onClose={() => setOpen(false)} onKeyDown={keys} aria-label={`תמונות של ${title}`}>
        {open && (
          <>
            <img src={images[index]} alt={`${title} – תמונה ${index + 1} מתוך ${count}`} {...swipe} />
            <button type="button" className="round-btn lightbox__close" onClick={() => setOpen(false)} aria-label="סגירה">
              <FaXmark aria-hidden />
            </button>
            {count > 1 && (
              <>
                <button type="button" className="round-btn lightbox__prev" onClick={() => go(-1)} aria-label="התמונה הקודמת">
                  <FaChevronRight aria-hidden />
                </button>
                <button type="button" className="round-btn lightbox__next" onClick={() => go(1)} aria-label="התמונה הבאה">
                  <FaChevronLeft aria-hidden />
                </button>
              </>
            )}
            <span className="lightbox__counter">
              {index + 1} / {count}
            </span>
          </>
        )}
      </dialog>
    </div>
  );
}
