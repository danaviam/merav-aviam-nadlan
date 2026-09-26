import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { FaArrowLeft, FaArrowRight, FaImage, FaXmark } from 'react-icons/fa6';
import {
  FEATURES,
  PROPERTY_TYPES,
  type DealType,
  type Property,
  type PropertyInput,
  type PropertyStatus,
} from '../../shared/types';
import { api } from '../api';
import { statusLabel } from '../format';

type ImageItem = { key: string; kind: 'existing'; url: string } | { key: string; kind: 'new'; file: File; preview: string };

const MAX_MB = 10;
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const toStr = (n: number | null) => (n === null ? '' : String(n));
const toNum = (s: string) => (s.trim() === '' ? null : Number(s));
let keySeq = 0;

export function PropertyForm({
  initial,
  onSaved,
  onCancel,
  onError,
}: {
  initial?: Property;
  onSaved: (p: Property) => void;
  onCancel: () => void;
  onError: (e: unknown) => void;
}) {
  const [f, setF] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    dealType: (initial?.dealType ?? 'sale') as DealType,
    propertyType: initial?.propertyType ?? PROPERTY_TYPES[0],
    city: initial?.city ?? '',
    neighborhood: initial?.neighborhood ?? '',
    address: initial?.address ?? '',
    price: initial ? String(initial.price) : '',
    rooms: toStr(initial?.rooms ?? null),
    sizeSqm: toStr(initial?.sizeSqm ?? null),
    floor: toStr(initial?.floor ?? null),
    totalFloors: toStr(initial?.totalFloors ?? null),
    features: initial?.features ?? [],
    featured: initial?.featured ?? false,
    status: (initial?.status ?? 'active') as PropertyStatus,
  });
  const [images, setImages] = useState<ImageItem[]>(
    () => initial?.images.map((url) => ({ key: `e${keySeq++}`, kind: 'existing' as const, url })) ?? [],
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');
  // תמונות שכבר הועלו, כדי שלא יעלו שוב אם השמירה נכשלה וניסו שוב
  const uploaded = useRef(new Map<File, string>());
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // שחרור תצוגות מקדימות מהזיכרון
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(
    () => () => imagesRef.current.forEach((i) => i.kind === 'new' && URL.revokeObjectURL(i.preview)),
    [],
  );

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const text = (k: 'title' | 'description' | 'city' | 'neighborhood' | 'address' | 'price' | 'rooms' | 'sizeSqm' | 'floor' | 'totalFloors' | 'propertyType') =>
    (e: { target: { value: string } }) => set(k, e.target.value);

  function addFiles(list: FileList | File[]) {
    const files = [...list];
    const bad = files.filter((file) => !ACCEPT.includes(file.type) || file.size > MAX_MB * 1024 * 1024);
    const good = files.filter((file) => !bad.includes(file));
    if (bad.length) setError(`${bad.length} קבצים לא נוספו: אפשר רק תמונות JPG/PNG/WEBP/AVIF עד ${MAX_MB}MB`);
    else setError('');
    setImages((prev) => [
      ...prev,
      ...good.map((file) => ({ key: `n${keySeq++}`, kind: 'new' as const, file, preview: URL.createObjectURL(file) })),
    ]);
  }

  function move(index: number, delta: number) {
    setImages((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function makeCover(index: number) {
    setImages((prev) => [prev[index], ...prev.filter((_, i) => i !== index)]);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const item = prev[index];
      if (item.kind === 'new') URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim() || !f.city.trim() || f.price.trim() === '') {
      setError('יש למלא כותרת, עיר ומחיר');
      return;
    }
    const input: PropertyInput = {
      title: f.title,
      description: f.description,
      dealType: f.dealType,
      propertyType: f.propertyType,
      city: f.city,
      neighborhood: f.neighborhood,
      address: f.address,
      price: Number(f.price.replace(/[,\s₪]/g, '')),
      rooms: toNum(f.rooms),
      sizeSqm: toNum(f.sizeSqm),
      floor: toNum(f.floor),
      totalFloors: toNum(f.totalFloors),
      features: f.features,
      images: [],
      featured: f.featured,
      status: f.status,
    };
    setSaving(true);
    setError('');
    try {
      // קודם מעלים את התמונות החדשות, ואז שומרים את הנכס עם הכתובות שלהן לפי הסדר שנבחר
      const pending = images.filter((img) => img.kind === 'new');
      let done = 0;
      if (pending.length) setProgress(`מעלה תמונות 0/${pending.length}…`);
      const urls = new Map<string, string>();
      for (let i = 0; i < pending.length; i += 3) {
        await Promise.all(
          pending.slice(i, i + 3).map(async (img) => {
            if (img.kind !== 'new') return;
            urls.set(img.key, uploaded.current.get(img.file) ?? (await api.uploadImage(img.file)));
            uploaded.current.set(img.file, urls.get(img.key)!);
            setProgress(`מעלה תמונות ${++done}/${pending.length}…`);
          }),
        );
      }
      setProgress('');
      input.images = images.map((img) => (img.kind === 'existing' ? img.url : urls.get(img.key)!));
      onSaved(await api.saveProperty(input, initial?.id));
    } catch (err) {
      setSaving(false);
      setProgress('');
      if ((err as { status?: number }).status === 401) return onError(err);
      setError((err as Error).message);
    }
  }

  return (
    <form className="editor" onSubmit={submit} noValidate>
      <div className="admin-toolbar">
        <h1>{initial ? 'עריכת נכס' : 'נכס חדש'}</h1>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>ביטול</button>
      </div>

      <fieldset className="panel editor__section">
        <legend>פרטי הנכס</legend>
        <div className="field">
          <label htmlFor="pf-title">כותרת *</label>
          <input id="pf-title" value={f.title} onChange={text('title')} placeholder="לדוגמה: דירת 4 חדרים עם מרפסת שמש" maxLength={120} />
        </div>
        <div className="field-row field-row--3">
          <div className="field">
            <span className="label">סוג עסקה</span>
            <div className="chips" role="radiogroup" aria-label="סוג עסקה">
              {(['sale', 'rent'] as const).map((d) => (
                <button key={d} type="button" role="radio" aria-checked={f.dealType === d} className={`chip${f.dealType === d ? ' is-active' : ''}`} onClick={() => set('dealType', d)}>
                  {d === 'sale' ? 'למכירה' : 'להשכרה'}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="pf-type">סוג נכס</label>
            <select id="pf-type" value={f.propertyType} onChange={text('propertyType')}>
              {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pf-price">{f.dealType === 'rent' ? 'שכירות חודשית (₪) *' : 'מחיר (₪) *'}</label>
            <input id="pf-price" inputMode="numeric" dir="ltr" value={f.price} onChange={text('price')} placeholder="0" />
          </div>
        </div>
        <div className="field-row field-row--3">
          <div className="field">
            <label htmlFor="pf-city">עיר *</label>
            <input id="pf-city" value={f.city} onChange={text('city')} />
          </div>
          <div className="field">
            <label htmlFor="pf-hood">שכונה</label>
            <input id="pf-hood" value={f.neighborhood} onChange={text('neighborhood')} />
          </div>
          <div className="field">
            <label htmlFor="pf-address">כתובת (לא חובה)</label>
            <input id="pf-address" value={f.address} onChange={text('address')} />
          </div>
        </div>
        <div className="field-row field-row--4">
          <div className="field">
            <label htmlFor="pf-rooms">חדרים</label>
            <input id="pf-rooms" type="number" step="0.5" min="0" value={f.rooms} onChange={text('rooms')} />
          </div>
          <div className="field">
            <label htmlFor="pf-size">שטח (מ״ר)</label>
            <input id="pf-size" type="number" min="0" value={f.sizeSqm} onChange={text('sizeSqm')} />
          </div>
          <div className="field">
            <label htmlFor="pf-floor">קומה (0 = קרקע)</label>
            <input id="pf-floor" type="number" value={f.floor} onChange={text('floor')} />
          </div>
          <div className="field">
            <label htmlFor="pf-floors">קומות בבניין</label>
            <input id="pf-floors" type="number" min="0" value={f.totalFloors} onChange={text('totalFloors')} />
          </div>
        </div>
        <div className="field">
          <span className="label">מאפיינים</span>
          <div className="chips chips--wrap">
            {FEATURES.map((feat) => {
              const on = f.features.includes(feat);
              return (
                <button key={feat} type="button" aria-pressed={on} className={`chip${on ? ' is-active' : ''}`} onClick={() => set('features', on ? f.features.filter((x) => x !== feat) : [...f.features, feat])}>
                  {feat}
                </button>
              );
            })}
          </div>
        </div>
        <div className="field">
          <label htmlFor="pf-desc">תיאור</label>
          <textarea id="pf-desc" rows={6} value={f.description} onChange={text('description')} placeholder="מה מיוחד בנכס? שורה חדשה = פסקה חדשה." />
        </div>
      </fieldset>

      <fieldset className="panel editor__section">
        <legend>תמונות</legend>
        <p className="hint">התמונה הראשונה היא תמונת השער. אפשר לגרור תמונות לכאן או לבחור מהמחשב / מהטלפון.</p>
        <div
          className={`dropzone${dragging ? ' is-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <FaImage aria-hidden />
          <button type="button" className="btn btn--sea btn--small" onClick={() => fileInput.current?.click()}>
            בחירת תמונות
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT.join(',')}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        {images.length > 0 && (
          <ol className="img-grid">
            {images.map((img, i) => (
              <li key={img.key} className="img-tile">
                <img src={img.kind === 'existing' ? img.url : img.preview} alt={`תמונה ${i + 1}`} />
                {i === 0 ? <span className="img-tile__cover">שער</span> : (
                  <button type="button" className="img-tile__make-cover" onClick={() => makeCover(i)}>קביעה כשער</button>
                )}
                {img.kind === 'new' && <span className="img-tile__new">חדשה</span>}
                <div className="img-tile__bar">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="הזזה קדימה">
                    <FaArrowRight aria-hidden />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="הזזה אחורה">
                    <FaArrowLeft aria-hidden />
                  </button>
                  <button type="button" onClick={() => removeImage(i)} aria-label="הסרת התמונה" className="img-tile__remove">
                    <FaXmark aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </fieldset>

      <fieldset className="panel editor__section">
        <legend>תצוגה באתר</legend>
        <div className="field-row">
          <div className="field">
            <label htmlFor="pf-status">סטטוס</label>
            <select id="pf-status" value={f.status} onChange={(e) => set('status', e.target.value as PropertyStatus)}>
              {(Object.keys(statusLabel) as PropertyStatus[]).map((s) => (
                <option key={s} value={s}>{statusLabel[s]}</option>
              ))}
            </select>
          </div>
          <label className="check">
            <input type="checkbox" checked={f.featured} onChange={(e) => set('featured', e.target.checked)} />
            להציג בקרוסלה בראש דף הבית
          </label>
        </div>
      </fieldset>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="editor__actions">
        <button className="btn btn--bloom" disabled={saving}>
          {saving ? progress || 'שומר…' : initial ? 'שמירת שינויים' : 'הוספת הנכס'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={saving}>ביטול</button>
      </div>
    </form>
  );
}
