import type { ContactInput, ContactMessage, Property, PropertyInput } from '../shared/types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: 'same-origin', ...init });
  } catch {
    throw new ApiError(0, 'אין חיבור לשרת. בדקו את החיבור לאינטרנט ונסו שוב.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error ?? 'הפעולה נכשלה. נסו שוב.');
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

/** מכווץ תמונה לפני העלאה — מקצר גדלים ומפחית איכות */
async function compressImage(file: File): Promise<File> {
  const MAX_SIDE = 1920;   // פיקסלים
  const QUALITY  = 0.82;  // 82% איכות JPEG
  const MIN_SIZE = 300 * 1024; // קבצים קטנים מ-300KB עוברים ללא שינוי

  if (file.size < MIN_SIZE) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // שינוי גודל רק אם גדול מ-MAX_SIDE
      if (width > MAX_SIDE || height > MAX_SIDE) {
        if (width >= height) {
          height = Math.round((height / width) * MAX_SIDE);
          width  = MAX_SIDE;
        } else {
          width  = Math.round((width / height) * MAX_SIDE);
          height = MAX_SIDE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('כיווץ התמונה נכשל'));
          const name = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob], name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // אם נכשל — ממשיכים עם הקובץ המקורי
    };

    img.src = objectUrl;
  });
}

export const api = {
  listProperties: () => request<Property[]>('/api/properties'),
  getProperty: (id: string) => request<Property>(`/api/properties/${encodeURIComponent(id)}`),
  sendContact: (data: ContactInput) => request<{ ok: true }>('/api/contact', json('POST', data)),

  me: () => request<{ admin: boolean; blobUploads?: boolean }>('/api/admin/me'),
  login: (password: string) => request<{ admin: boolean }>('/api/admin/login', json('POST', { password })),
  logout: () => request<{ admin: boolean }>('/api/admin/logout', { method: 'POST' }),

  adminListProperties: () => request<Property[]>('/api/admin/properties'),
  /** מעלה תמונה אחת ומחזיר את הכתובת שלה (בענן: ישירות ל-Vercel Blob, מקומית: לשרת) */
  uploadImage: async (file: File): Promise<string> => {
    const compressed = await compressImage(file); // ← כיווץ לפני העלאה

    const { blobUploads } = await api.me();
    if (!blobUploads) {
      const fd = new FormData();
      fd.append('file', compressed);
      return (await request<{ url: string }>('/api/admin/upload', { method: 'POST', body: fd })).url;
    }
    const { upload } = await import('@vercel/blob/client');
    const ext = compressed.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    try {
      const blob = await upload(`properties/${crypto.randomUUID()}.${ext}`, compressed, {
        access: 'public',
        handleUploadUrl: '/api/admin/upload',
        contentType: compressed.type,
      });
      return blob.url;
    } catch (err) {
      console.error(err);
      throw new ApiError(0, `העלאת התמונה "${file.name}" נכשלה. נסו שוב.`);
    }
  },
  saveProperty: (input: PropertyInput, id?: string) =>
    request<Property>(id ? `/api/admin/properties/${id}` : '/api/admin/properties', json(id ? 'PUT' : 'POST', input)),
  patchProperty: (id: string, patch: Partial<Pick<Property, 'status' | 'featured'>>) =>
    request<Property>(`/api/admin/properties/${id}`, json('PATCH', patch)),
  deleteProperty: (id: string) => request<{ ok: true }>(`/api/admin/properties/${id}`, { method: 'DELETE' }),

  listMessages: () => request<ContactMessage[]>('/api/admin/messages'),
  markMessage: (id: string, read: boolean) =>
    request<ContactMessage>(`/api/admin/messages/${id}`, json('PATCH', { read })),
  deleteMessage: (id: string) => request<{ ok: true }>(`/api/admin/messages/${id}`, { method: 'DELETE' }),
};